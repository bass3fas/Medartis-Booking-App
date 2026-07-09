// app/actions/addBookingAction.ts
'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { z } from 'zod';
import crypto from 'crypto';

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
  RequestedSets: z.string().optional().default(''),
});

// Helper function to generate a short, random alphanumeric string for Booking ID (e.g., B-a1B2)
function generateShortUniqueId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
    console.error('❌ Schema Validation Failed:', validation.error.errors);
    return { 
      success: false, 
      error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
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
      data.RequestedSets,       // 9: Requested Sets
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

    console.log(`🚀 Attempting to append row to tab [Bookings] for ID: ${newBookingID}...`);

    // 3. CRUCIAL: The actual write instruction to push the array directly to Google Sheets API
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bookings!A1:S', // Targets the explicit 'Bookings' tab range matrix
      valueInputOption: 'USER_ENTERED',
      requestBody: { 
        values: [newRow] 
      },
    });

    console.log('✅ Google Sheets Write Successful:', response.statusText);

    return { 
      success: true, 
      message: `Booking ${newBookingID} created successfully.` 
    };

  } catch (error: any) {
    // Catch any network, credential permission, or API block errors here cleanly
    console.error('🔴 GOOGLE SHEETS API ERROR:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected database error occurred while creating the booking.' 
    };
  }
}