'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { copyPhotoInDrive, deletePhotoFromDrive } from '../lib/googleDrive';
import { runDriveRequestsInChunks } from '../lib/driveQueue';

const USAGE_FIELDS = ['PatientMRN', 'SetID', 'TrayID', 'PartNumber', 'QtyUsed', 'Qty Refilled', 'Date', 'Notes', 'Photo'] as const;

const text = (value: unknown) => String(value ?? '').trim();
const isPrivileged = (role: string) => ['admin', 'warehouse'].includes(role.trim().toLowerCase());
const canManageUsage = async (role: string, userName: string, bookingId: string) => {
  const normalizedRole = role.trim().toLowerCase();
  if (isPrivileged(normalizedRole)) return true;
  if (normalizedRole !== 'sales') return false;
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:Z' });
  const [headers = [], ...rows] = response.data.values || [];
  const bookingColumn = headers.indexOf('BookingID');
  const salesColumn = headers.indexOf('Salesperson');
  if (bookingColumn === -1 || salesColumn === -1) return false;
  const booking = rows.find((row) => text(row[bookingColumn] || '').toUpperCase() === bookingId.trim().toUpperCase());
  return text(booking?.[salesColumn] || '').toLowerCase() === userName.trim().toLowerCase();
};

async function removeUsagePhotoRow(photoPath: string) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:Z" });
  const [headers = [], ...rows] = response.data.values || [];
  const photoColumn = headers.indexOf('Photo');
  if (photoColumn === -1) return;
  const rowOffset = rows.findIndex((row) => text(row[photoColumn]) === photoPath);
  if (rowOffset !== -1) await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: `'Usage Photos'!A${rowOffset + 2}:Z${rowOffset + 2}` });
}

async function removeBookingUsagePhotoReference(bookingId: string, photoPath: string) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:Z' });
  const [headers = [], ...rows] = response.data.values || [];
  const bookingColumn = headers.indexOf('BookingID');
  const usagePhotoColumns = ['UsagePhoto', 'UsagePhoto2'].map((name) => headers.indexOf(name)).filter((index) => index !== -1);
  if (bookingColumn === -1 || usagePhotoColumns.length === 0) return;

  const rowOffset = rows.findIndex((row) => text(row[bookingColumn]).toUpperCase() === bookingId.toUpperCase());
  if (rowOffset === -1) return;

  for (const usagePhotoColumn of usagePhotoColumns) {
    const currentValue = text(rows[rowOffset][usagePhotoColumn] || '');
    const nextPhotos = currentValue
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value && value !== photoPath);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID!,
      range: `Bookings!${String.fromCharCode(65 + usagePhotoColumn)}${rowOffset + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[nextPhotos.join(', ')]] },
    });
  }
}

async function findUsageRow(usageId: string) {
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usage!A1:S' });
  const [headers = [], ...rows] = response.data.values || [];
  const usageIdColumn = headers.indexOf('UsageID');
  if (usageIdColumn === -1) throw new Error('Usage sheet is missing its UsageID column.');
  const rowOffset = rows.findIndex((row) => String(row[usageIdColumn] ?? '').trim() === usageId);
  if (rowOffset === -1) throw new Error(`Usage ${usageId} was not found.`);
  return { headers, row: rows[rowOffset], rowNumber: rowOffset + 2 };
}

async function updateStockForUsageRefill(usageId: string, partNumber: string, newRefilledQty: number) {
  const stockSheetName = 'Stock';
  const stockSheet = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${stockSheetName}!A:Z` });
  const [stockHeaders = [], ...stockRows] = stockSheet.data.values || [];
  const stockGtinColumn = stockHeaders.indexOf('GTIN');
  const stockItemCodeColumn = stockHeaders.indexOf('Item Code');
  const stockQtyColumn = stockHeaders.indexOf('Qty');
  const stockExpiryDateColumn = stockHeaders.indexOf('Expiry Date');

  if (stockGtinColumn === -1) {
    console.error('Stock sheet is missing GTIN column.');
    return;
  }

  // Find and delete any previous refill record for this usageId
  const rowIndexToDelete = stockRows.findIndex(row => text(row[stockGtinColumn]) === usageId);
  if (rowIndexToDelete !== -1) {
    const rowNum = rowIndexToDelete + 2; // +1 for header, +1 for 0-based index
    // Using batchUpdate with deleteDimension is more reliable for deleting rows than clear.
    const sheetId = (await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })).data.sheets?.find(s => s.properties?.title === stockSheetName)?.properties?.sheetId;
    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum } } }]
        }
      });
    }
  }

  // If the new refill quantity is positive, add a new stock deduction record
  if (newRefilledQty > 0) {
    const stockRow = new Array(stockHeaders.length).fill('');
    stockRow[stockGtinColumn] = usageId;
    if (stockItemCodeColumn !== -1) stockRow[stockItemCodeColumn] = partNumber;
    if (stockQtyColumn !== -1) stockRow[stockQtyColumn] = -newRefilledQty;
    if (stockExpiryDateColumn !== -1) stockRow[stockExpiryDateColumn] = new Date().toLocaleDateString('en-GB');

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${stockSheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [stockRow] },
    });
  }
}

export async function fetchBookingUsageContextAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    const bookingId = text(formData.get('BookingID'));
    const patientMRN = text(formData.get('PatientMRN'));
    if (!bookingId || !patientMRN) return { success: false, error: 'Booking ID and MRN are required.' };

    const usageResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usage!A1:Z' });
    const [usageHeaders = [], ...usageRows] = usageResponse.data.values || [];
    const usageBookings = usageHeaders.indexOf('BookingID');
    const usageMrn = usageHeaders.indexOf('PatientMRN');
    const usageId = usageHeaders.indexOf('UsageID');
    const setId = usageHeaders.indexOf('SetID');
    const trayId = usageHeaders.indexOf('TrayID');
    const partNumber = usageHeaders.indexOf('PartNumber');
    const itemId = usageHeaders.indexOf('ItemID');
    const qtyUsed = usageHeaders.indexOf('QtyUsed');
    const qtyRefilled = usageHeaders.indexOf('Qty Refilled');
    const description = usageHeaders.indexOf('Description');
    const photo = usageHeaders.indexOf('Photo');

    const selectedRows = usageRows.map((row, rowIndex) => {
      const bookingValue = text(row[usageBookings] || '');
      const mrnValue = text(row[usageMrn] || '');
      if (!bookingValue || !mrnValue) return null;
      if (bookingValue.toUpperCase() !== bookingId.toUpperCase()) return null;
      if (mrnValue.toUpperCase() !== patientMRN.toUpperCase()) return null;
      return {
        rowNumber: rowIndex + 2,
        UsageID: text(row[usageId] || ''),
        BookingID: bookingValue,
        SetID: text(row[setId] || ''),
        TrayID: text(row[trayId] || ''),
        PartNumber: text(row[partNumber] || ''),
        ItemID: text(row[itemId] || ''),
        QtyUsed: Number(row[qtyUsed] || 0),
        qtyRefilled: Number(row[qtyRefilled] || 0),
        Description: text(row[description] || ''),
        Photo: text(row[photo] || ''),
      };
    }).filter(Boolean);

    const normalisedRows = selectedRows.map((row) => ({
      usageId: row.UsageID,
      trayId: row.TrayID,
      partNumber: row.PartNumber,
      itemId: row.ItemID,
      description: row.Description,
      qtyUsed: Number(row.QtyUsed || 1),
      qtyRefilled: Number(row.qtyRefilled || 0),
      setId: row.SetID,
      photoPath: row.Photo,
    }));

    const photoResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:Z" });
    const [photoHeaders = [], ...photoRows] = photoResponse.data.values || [];
    const mrnColumn = photoHeaders.indexOf('MRN');
    const bookingColumn = photoHeaders.indexOf('BookingID');
    const photoColumn = photoHeaders.indexOf('Photo');
    let matchedPhoto = '';
    if (mrnColumn !== -1 && bookingColumn !== -1 && photoColumn !== -1) {
      for (const row of photoRows) {
        if (text(row[mrnColumn] || '').toUpperCase() === patientMRN.toUpperCase() && text(row[bookingColumn] || '').toUpperCase() === bookingId.toUpperCase()) {
          matchedPhoto = text(row[photoColumn] || '');
          break;
        }
      }
    }

    return {
      success: true,
      data: {
        setId: normalisedRows[0]?.setId || '',
        items: normalisedRows,
        usageIds: normalisedRows.map((item) => item.usageId).filter(Boolean),
        photoPath: matchedPhoto || '',
        photoUrl: matchedPhoto ? `https://www.appsheet.com/image/getimageurl?appName=MedartisPhase1-5435197&tableName=Usage%20Photos&fileName=${encodeURIComponent(matchedPhoto)}&width=1000` : '',
      }
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not read usage context.' };
  }
}

export async function deleteBookingUsagePhotoAction(formData: FormData) {
  try {
    const bookingId = text(formData.get('BookingID'));
    const patientMrn = text(formData.get('PatientMRN'));
    const photoPath = text(formData.get('PhotoPath'));
    if (!bookingId || !patientMrn || !photoPath) return { success: false, error: 'Booking ID, MRN, and photo path are required.' };

    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID!, range: "'Usage Photos'!A1:Z" });
    const [headers = [], ...rows] = response.data.values || [];
    const mrnColumn = headers.indexOf('MRN');
    const bookingColumn = headers.indexOf('BookingID');
    const photoColumn = headers.indexOf('Photo');

    if (mrnColumn === -1 || bookingColumn === -1 || photoColumn === -1) return { success: false, error: 'Usage Photos sheet is missing required columns.' };

    const matchingRow = rows.findIndex((row) => {
      return text(row[mrnColumn] || '').toUpperCase() === patientMrn.toUpperCase() && text(row[bookingColumn] || '').toUpperCase() === bookingId.toUpperCase() && text(row[photoColumn] || '') === photoPath;
    });

    if (matchingRow !== -1) {
      await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: `Usage Photos!A${matchingRow + 2}:Z${matchingRow + 2}` });
    }

    await deletePhotoFromDrive(photoPath).catch((error) => console.warn('Usage photo drive delete failed:', error));

    return { success: true, message: 'Usage photo reference removed.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not delete the usage photo.' };
  }
}

export async function updateUsageAction(formData: FormData) {
  try {
    const usageId = text(formData.get('UsageID'));
    if (!usageId) return { success: false, error: 'Usage ID is required.' };
    const { headers, row, rowNumber } = await findUsageRow(usageId);
    const bookingIdColumn = headers.indexOf('BookingID');
    const photoColumn = headers.indexOf('Photo');

    if (!(await canManageUsage(text(formData.get('currentUserRole')), text(formData.get('currentUserName')), text(row[bookingIdColumn] || '')))) return { success: false, error: 'You do not have permission to edit this usage.' };

    const oldPhoto = photoColumn === -1 ? '' : text(row[photoColumn] || '');
    const incomingPhoto = text(formData.get('Photo') || '');

    const nextRow = headers.map((header, index) => USAGE_FIELDS.includes(header as typeof USAGE_FIELDS[number]) && formData.has(header) ? text(formData.get(header)) : row[index] ?? '');
    const used = Number(nextRow[headers.indexOf('QtyUsed')]) || 0;
    const refilled = Number(nextRow[headers.indexOf('Qty Refilled')]) || 0;
    const statusColumn = headers.indexOf('Usage Status');
    const lastUpdateColumn = headers.indexOf('Last Update');
    if (statusColumn !== -1) nextRow[statusColumn] = used === refilled ? 'Refilled' : 'Pending to Refill';
    if (lastUpdateColumn !== -1) nextRow[lastUpdateColumn] = new Date().toISOString();

    // Update stock deduction: delete old record and create new one with the new refilled quantity.
    const partNumber = nextRow[headers.indexOf('PartNumber')];
    await updateStockForUsageRefill(usageId, partNumber, refilled);

    if (photoColumn !== -1 && oldPhoto && oldPhoto !== incomingPhoto) {
      await deletePhotoFromDrive(oldPhoto.split('/').pop() || oldPhoto).catch((error) => console.warn('Previous usage photo drive delete failed during edit:', error));
      await removeUsagePhotoRow(oldPhoto);
      await removeBookingUsagePhotoReference(text(row[bookingIdColumn] || ''), oldPhoto);
    }

    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID!, range: `Usage!A${rowNumber}:S${rowNumber}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [nextRow.slice(0, 19)] } });
    return { success: true, message: 'Usage updated.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not update usage.' };
  }
}

export async function deleteBookingUsageByMrnAction(formData: FormData) {
  try {
    const bookingId = text(formData.get('BookingID'));
    const patientMrn = text(formData.get('PatientMRN'));
    const currentUserRole = text(formData.get('currentUserRole'));

    if (!bookingId || !patientMrn) {
      return { success: false, error: 'Booking ID and Patient MRN are required.' };
    }

    const normalizedRole = currentUserRole.trim().toLowerCase();
    if (normalizedRole !== 'admin' && normalizedRole !== 'warehouse') {
      return { success: false, error: 'Only Admin and Warehouse users can delete a full MRN usage bundle.' };
    }

    // 1. Fetch items from 'Usage' sheet
    const usageResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usage!A1:Z' });
    const [usageHeaders = [], ...usageRows] = usageResponse.data.values || [];
    const bookingColumn = usageHeaders.indexOf('BookingID');
    const mrnColumn = usageHeaders.indexOf('PatientMRN');
    const photoColumn = usageHeaders.indexOf('Photo');

    if (bookingColumn === -1 || mrnColumn === -1) {
      return { success: false, error: 'Usage sheet is missing BookingID or PatientMRN columns.' };
    }

    const matchingUsageRows = usageRows.map((row, rowIndex) => {
      const rowBooking = text(row[bookingColumn] || '');
      const rowMrn = text(row[mrnColumn] || '');
      if (rowBooking.toUpperCase() !== bookingId.toUpperCase()) return null;
      if (rowMrn.toUpperCase() !== patientMrn.toUpperCase()) return null;
      return { rowNumber: rowIndex + 2, photoPath: photoColumn === -1 ? '' : text(row[photoColumn] || '') };
    }).filter(Boolean) as Array<{ rowNumber: number; photoPath: string }>;

    // Collect usage photo paths from the Usage sheet
    const usagePhotoPaths = matchingUsageRows.map((match) => match.photoPath).filter(Boolean);

    // 2. Clear rows in 'Usage' sheet
    for (const match of matchingUsageRows) {
      await sheets.spreadsheets.values.clear({ 
        spreadsheetId: SPREADSHEET_ID!, 
        range: `Usage!A${match.rowNumber}:S${match.rowNumber}` 
      });
    }

    // 3. Fetch photos from 'Usage Photos' sheet
    const photoResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:Z" });
    const [photoHeaders = [], ...photoRows] = photoResponse.data.values || [];
    const photoMrnColumn = photoHeaders.indexOf('MRN');
    const photoBookingColumn = photoHeaders.indexOf('BookingID');
    const photoPathColumn = photoHeaders.indexOf('Photo');

    const photosFromPhotoSheet: string[] = [];

    if (photoMrnColumn !== -1 && photoBookingColumn !== -1) {
      const photoRowsToDelete = photoRows.map((row, index) => {
        const rowMrn = text(row[photoMrnColumn] || '');
        const rowBooking = text(row[photoBookingColumn] || '');
        const rowPhoto = photoPathColumn !== -1 ? text(row[photoPathColumn] || '') : '';

        if (rowMrn.toUpperCase() === patientMrn.toUpperCase() && rowBooking.toUpperCase() === bookingId.toUpperCase()) {
          if (rowPhoto) photosFromPhotoSheet.push(rowPhoto);
          return index + 2;
        }
        return null;
      }).filter((value): value is number => Boolean(value));

      // Clear matching rows in 'Usage Photos' sheet (with single quotes around sheet name)
      for (const rowNumber of photoRowsToDelete) {
        await sheets.spreadsheets.values.clear({ 
          spreadsheetId: SPREADSHEET_ID!, 
          range: `'Usage Photos'!A${rowNumber}:Z${rowNumber}` 
        });
      }
    }

    // 4. Combine all photo paths (Usage sheet + Usage Photos sheet) and delete from Google Drive
    const allPhotoPaths = Array.from(new Set([...usagePhotoPaths, ...photosFromPhotoSheet]));

    const driveDeleteResults = await runDriveRequestsInChunks(
      allPhotoPaths.map((photoPath) => () => deletePhotoFromDrive(photoPath.split('/').pop() || photoPath)),
      3,
    );
    driveDeleteResults.forEach((result) => {
      if (result.status === 'rejected') console.warn('Usage photo drive delete failed:', result.reason);
    });

    // 5. Cleanup references inside 'Bookings' sheet
    const bookingResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Bookings!A1:Z' });
    const [bookingHeaders = [], ...bookingRows] = bookingResponse.data.values || [];
    const bookingIdColumn = bookingHeaders.indexOf('BookingID');
    const patientMrnCellColumn = bookingHeaders.indexOf('Patient MRN');
    const usagePhotoColumn = bookingHeaders.indexOf('UsagePhoto');
    const usagePhoto2Column = bookingHeaders.indexOf('UsagePhoto2');

    if (bookingIdColumn !== -1 && bookingRows.length > 0) {
      const rowIndex = bookingRows.findIndex((row) => text(row[bookingIdColumn] || '').toUpperCase() === bookingId.toUpperCase());
      if (rowIndex !== -1) {
        const bookingRowNumber = rowIndex + 2;

        // Clean Patient MRN cell
        if (patientMrnCellColumn !== -1) {
          const current = text(bookingRows[rowIndex][patientMrnCellColumn] || '');
          const next = current
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value && value.toUpperCase() !== patientMrn.toUpperCase());
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID!,
            range: `Bookings!${String.fromCharCode(65 + patientMrnCellColumn)}${bookingRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[next.join(', ')]] },
          });
        }

        // Clean UsagePhoto and UsagePhoto2 references
        for (const refCol of [usagePhotoColumn, usagePhoto2Column].filter((column) => column !== -1)) {
          const current = text(bookingRows[rowIndex][refCol] || '');
          const next = current
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value && allPhotoPaths.every((path) => value !== path));
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID!,
            range: `Bookings!${String.fromCharCode(65 + refCol)}${bookingRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[next.join(', ')]] },
          });
        }
      }
    }

    return { success: true, message: `Deleted MRN ${patientMrn} usage bundle.` };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not delete MRN usage bundle.' };
  }
}
export async function deleteUsageAction(formData: FormData) {
  try {
    const usageId = text(formData.get('UsageID'));
    if (!usageId) return { success: false, error: 'Usage ID is required.' };
    const { headers, row, rowNumber } = await findUsageRow(usageId);
    const bookingIdColumn = headers.indexOf('BookingID');
    const photoColumn = headers.indexOf('Photo');
    if (!(await canManageUsage(text(formData.get('currentUserRole')), text(formData.get('currentUserName')), text(row[bookingIdColumn] || '')))) return { success: false, error: 'You do not have permission to delete this usage.' };
    const photoPath = photoColumn === -1 ? '' : text(row[photoColumn]);
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range: `Usage!A${rowNumber}:S${rowNumber}` });
    if (photoPath) {
      await deletePhotoFromDrive(photoPath.split('/').pop() || photoPath).catch((error) => console.warn('Usage photo drive delete failed:', error));
      await removeUsagePhotoRow(photoPath);
      await removeBookingUsagePhotoReference(text(row[bookingIdColumn] || ''), photoPath);
    }
    return { success: true, message: 'Usage deleted.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not delete usage.' };
  }
}

export async function refillUsageAction(formData: FormData) {
  try {
    if (!isPrivileged(text(formData.get('currentUserRole')))) return { success: false, error: 'Only Admin and Warehouse users can refill usage.' };
    const usageIds = JSON.parse(text(formData.get('UsageIDs')) || '[]') as string[];
    if (!Array.isArray(usageIds) || usageIds.length === 0) return { success: false, error: 'No usage entries were selected.' };
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Usage!A1:S' });
    const [headers = [], ...rows] = response.data.values || [];
    const usageIdColumn = headers.indexOf('UsageID');
    const usedColumn = headers.indexOf('QtyUsed');
    const refilledColumn = headers.indexOf('Qty Refilled');
    const statusColumn = headers.indexOf('Usage Status');
    const partNumberColumn = headers.indexOf('PartNumber');
    const updatedColumn = headers.indexOf('Last Update');
    if (usageIdColumn === -1 || usedColumn === -1 || refilledColumn === -1 || partNumberColumn === -1) throw new Error('Usage sheet is missing refill columns.');

    const values = rows.map((row, index) => ({ row, rowNumber: index + 2 })).filter(({ row }) => usageIds.includes(String(row[usageIdColumn] ?? '').trim())).map(({ row, rowNumber }) => {
      const nextRow = headers.map((_, index) => row[index] ?? '');
      const qtyToRefill = Number(nextRow[usedColumn] ?? '0');
      nextRow[refilledColumn] = String(qtyToRefill);
      if (statusColumn !== -1) nextRow[statusColumn] = 'Refilled';
      if (updatedColumn !== -1) nextRow[updatedColumn] = new Date().toISOString();
      
      const usageId = nextRow[usageIdColumn];
      const partNumber = nextRow[partNumberColumn];
      updateStockForUsageRefill(usageId, partNumber, qtyToRefill);
      
      return { range: `Usage!A${rowNumber}:S${rowNumber}`, values: [nextRow.slice(0, 19)] };
    });

    await Promise.all(values.map(({ range, values }) => sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values } })));
    return { success: true, message: `${values.length} usage entr${values.length === 1 ? 'y' : 'ies'} refilled.` };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not refill usage.' };
  }
}

export async function assignBookingUsagePhotoAction(formData: FormData) {
  try {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    const bookingId = text(formData.get('BookingID'));
    const patientMRN = text(formData.get('PatientMRN'));
    const photoPath = text(formData.get('Photo'));
    const date = text(formData.get('Date')) || new Date().toISOString().slice(0, 10);
    if (!bookingId || !patientMRN || !photoPath) return { success: false, error: 'Booking ID, MRN, and photo are required.' };
    if (!(await canManageUsage(text(formData.get('currentUserRole')), text(formData.get('currentUserName')), bookingId))) return { success: false, error: 'You do not have permission to assign this booking photo.' };

    const safeMrn = patientMRN.replace(/[^a-zA-Z0-9_-]/g, '-');
    const originalExtension = (photoPath.split('.').pop() || 'jpeg').split('?')[0];
    const newFileName = `${safeMrn}.Photo.${new Date().toTimeString().split(' ')[0].replace(/:/g, '')}.${originalExtension}`;
    const usagePhotoPath = `Usage Photos_Images/${newFileName}`;

    // Apps Script should support action=copy. If a deployment has not added copy yet,
    // we still keep Sheets consistent by recording the original path for visibility.
    await copyPhotoInDrive(photoPath, newFileName, '1dAIcVsXX1llgMrqlT12YOtdizskGV5rg').catch((error) => console.warn('Drive copy failed; recording sheet row anyway:', error));

    const existingPhotoRows = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Usage Photos'!A1:D" });
    const photoRows = existingPhotoRows.data.values || [];
    const photoTargetRow = Math.max(2, photoRows.length + 1);
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `'Usage Photos'!A${photoTargetRow}:D${photoTargetRow}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[patientMRN, usagePhotoPath, bookingId, date]] } });
    await removeBookingUsagePhotoReference(bookingId, photoPath);
    await deletePhotoFromDrive(photoPath.split('/').pop() || photoPath).catch((error) => console.warn('Original booking photo delete failed:', error));
    return { success: true, message: 'Usage photo assigned to MRN.' };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not assign booking photo.' };
  }
}
