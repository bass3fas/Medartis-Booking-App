// app/actions/addBookingAction.ts
'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { z } from 'zod';
import crypto from 'crypto';
import { writeHistoryLog } from '../lib/history-log';
import { sendNotificationEmail } from '../lib/email';

// 1. Precise Validation Schema matching your field structures
const AddBookingSchema = z.object({
  Salesperson: z.string().min(1, 'Salesperson is required'),
  Hospital: z.string().min(1, 'Hospital is required'),
  Doctor: z.string().min(1, 'Doctor is required'),
  CaseDate: z.string().min(1, 'Case Date is required'),
  CaseTime: z.string().optional().default('08:00'),
  DeliverBeforeDate: z.string().optional().default(''),
  DeliverBeforeTime: z.string().optional().default(''),
  Type: z.string().optional().default('Standard'),
  SpecialRequest: z.string().optional().default(''),
  'Requested Sets': z.string().optional().default(''),
  currentUserName: z.string().optional().default(''),
  currentUserEmail: z.string().optional().default(''),
  currentUserRole: z.string().optional().default(''),
});

// Helper function to generate a short, random alphanumeric string for Booking ID (e.g., B-a1B2)
function generateShortUniqueId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(4); 
  for (let i = 0; i < 4; i++) {
    result += chars[randomBytes[i] % chars.length]; 
  }
  return result;
}

export async function addBookingAction(formData: FormData) {
  // Convert standard FormData entries safely into an object for Zod validation
  const rawData = Object.fromEntries(formData.entries());
  const validation = AddBookingSchema.safeParse(rawData);

  if (!validation.success) {
    console.error('❌ Schema Validation Failed:', validation.error.issues);
    return { 
      success: false, 
      error: validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') 
    };
  }

  const data = validation.data;

  try {
    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID environment variable is missing or undefined.');
    }

    // Generate our unique booking format identity
    const newBookingID = `B-${generateShortUniqueId()}`;

    // Combine date and time structures for the "Deliver Before" column matrix safely
    const deliverBefore = data.DeliverBeforeDate && data.DeliverBeforeTime 
      ? `${data.DeliverBeforeDate} ${data.DeliverBeforeTime}` 
      : data.DeliverBeforeDate || '';

    // 2. Build row alignment following your target Google Sheet header structure exactly:
    // BookingID | Salesperson | Hospital | Doctor | CaseDate | CaseTime | Deliver Before | Special Request | Status | Requested Sets | ...
    const newRow = [
      newBookingID,             // 0: BookingID
      data.Salesperson,         // 1: Salesperson
      data.Hospital,            // 2: Hospital
      data.Doctor,              // 3: Doctor
      data.CaseDate,            // 4: CaseDate
      data.CaseTime,            // 5: CaseTime
      deliverBefore,            // 6: Deliver Before
      data.SpecialRequest,      // 7: Special Request
      'Pending',                // 8: Status (Defaults on entry creation)
      data['Requested Sets'],   // 9: Requested Sets
      '',                       // 10: Selected Sets (Blank initially)
      new Date().toISOString(), // 11: Last Updated (Timestamp snapshot)
      '',                       // 12: Driver
      '',                       // 13: UsagePhoto
      '',                       // 14: UsagePhoto2
      '',                       // 15: Patient MRN
      '',                       // 16: Delivery Note
      '',                       // 17: Delivery Note Link
      data.Type                 // 18: Type
    ];

    // Do not use values.append here. Google chooses the beginning of the detected
    // data table for append operations, which can be column P when that column
    // contains stray/legacy data. Booking IDs are the source of truth in column A,
    // so explicitly write the row immediately after the last BookingID instead.
    const bookingIdColumn = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bookings!A2:A',
    });
    const existingBookingIds = bookingIdColumn.data.values || [];
    const lastBookingRowOffset = existingBookingIds.reduce(
      (lastOffset, row, offset) => (String(row[0] || '').trim() ? offset : lastOffset),
      -1
    );
    const targetRow = lastBookingRowOffset + 3; // header row + zero-based offset + next row

    console.log(`🚀 Writing booking ${newBookingID} to Bookings!A${targetRow}:S${targetRow}...`);

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Bookings!A${targetRow}:S${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { 
        values: [newRow] 
      },
    });

    console.log('✅ Google Sheets Write Successful:', response.statusText);

    const bookingSnapshot = Object.fromEntries([
      'BookingID', 'Salesperson', 'Hospital', 'Doctor', 'CaseDate', 'CaseTime', 'Deliver Before',
      'Special Request', 'Status', 'Requested Sets', 'Selected Sets', 'Last Updated', 'Driver',
      'UsagePhoto', 'UsagePhoto2', 'Patient MRN', 'Delivery Note', 'Delivery Note Link', 'Type'
    ].map((header, index) => [header, newRow[index] ?? '']));
    await writeHistoryLog({ targetTable: 'Bookings', targetRowId: newBookingID, actionType: 'CREATE', previousData: null, newData: bookingSnapshot, actor: { name: data.currentUserName, email: data.currentUserEmail, role: data.currentUserRole } });

    const warehouseEmail = process.env.WAREHOUSE_EMAIL;
    if (warehouseEmail) {
      await sendNotificationEmail({
        to: warehouseEmail,
        subject: `New booking ${newBookingID} created`,
        html: `<h2>New Booking ${newBookingID}</h2><p><strong>Salesperson:</strong> ${data.Salesperson}</p><p><strong>Hospital:</strong> ${data.Hospital}</p><p><strong>Doctor:</strong> ${data.Doctor}</p><p><strong>Case:</strong> ${data.CaseDate} ${data.CaseTime}</p><p><strong>Deliver Before:</strong> ${deliverBefore || 'N/A'}</p><p><strong>Requested Sets:</strong> ${data['Requested Sets'] || 'N/A'}</p><p><strong>Special Request:</strong> ${data.SpecialRequest || 'N/A'}</p>`,
      });
    }

    return { 
      success: true, 
      message: `Booking ${newBookingID} created successfully.`,
      notification: `New booking ${newBookingID} was created.`
    };

  } catch (error: unknown) {
    // Catch any network, credential permission, or API block errors here cleanly
    console.error('🔴 GOOGLE SHEETS API ERROR:', error);
    const message = error instanceof Error ? error.message : 'An unexpected database error occurred while creating the booking.';
    return { 
      success: false, 
      error: message 
    };
  }
}
