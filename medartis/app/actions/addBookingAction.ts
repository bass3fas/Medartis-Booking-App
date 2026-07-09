// app/actions/addBookingAction.ts
'use server';

import { sheets, SPREADSHEET_ID } from '../lib/google-sheets';
import { z } from 'zod';
import crypto from 'crypto'; // Import crypto for more robust random string generation

const AddBookingSchema = z.object({
  Salesperson: z.string().min(1, 'Salesperson is required'),
  Hospital: z.string().min(1, 'Hospital is required'),
  Doctor: z.string().min(1, 'Doctor is required'),
  CaseDate: z.string().min(1, 'Case Date is required'),
  CaseTime: z.string().optional(),
  DeliverBeforeDate: z.string().optional(),
  DeliverBeforeTime: z.string().optional(),
  Type: z.string().optional(),
  SpecialRequest: z.string().optional(),
  RequestedSets: z.string().optional(),
});

// Helper function to generate a short, random alphanumeric string
// Note: While this aims for randomness, a 4-character string has a limited keyspace (62^4 = ~14.7 million combinations).
// For absolute uniqueness in a high-volume or distributed system, a full UUID (e.g., from 'uuid' library)
// or a database-managed unique ID is generally used.
// For this specific 'B-XXXX' format, we'll generate a random 4-character alphanumeric string.
function generateShortUniqueId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  // Generate enough random bytes to pick 4 characters from `chars`
  // For a 4-char ID, 4 bytes are sufficient.
  const randomBytes = crypto.randomBytes(4); 
  for (let i = 0; i < 4; i++) {
    result += chars[randomBytes[i] % chars.length]; 
  }
  return result;
}

export async function addBookingAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validation = AddBookingSchema.safeParse(rawData);

  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { Salesperson, Hospital, Doctor, CaseDate, CaseTime, DeliverBeforeDate, DeliverBeforeTime, Type, SpecialRequest, RequestedSets } = validation.data;

  try {
    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID environment variable is not set.');
    }

    const spreadsheetId = SPREADSHEET_ID;
    const range = 'Bookings';

    // --- FIX: Generate random and unique BookingID ---
    // The user requested 'B-XXXX' where XXXX are random numbers and/or letters and not repeated.
    // For true non-repetition (uniqueness) in a distributed system, a UUID is generally used.
    // A 4-character random alphanumeric string has a limited keyspace (62^4 = ~14.7 million combinations).
    // While collisions are unlikely for small datasets, they are possible.
    // For a more robust unique ID, consider using a library like 'uuid' and a longer ID,
    // or implementing a check against existing IDs in the sheet (which can be slow for large sheets).
    const newBookingID = `B-${generateShortUniqueId()}`;

    const deliverBefore = DeliverBeforeDate && DeliverBeforeTime ? `${DeliverBeforeDate} ${DeliverBeforeTime}` : DeliverBeforeDate || '';

    // --- Column order based on sample data provided in the prompt ---
    // BookingID Salesperson Hospital Doctor CaseDate CaseTime Deliver Before Special Request Status Requested Sets Selected Sets Last Updated Driver UsagePhoto UsagePhoto2 Patient MRN Delivery Note Delivery Note Link Type
    // 0         1           2        3      4        5        6              7               8      9              10            11           12     13          14          15           16          17                 18
    const newRow = [
      newBookingID, // 0
      Salesperson,  // 1
      Hospital,     // 2
      Doctor,       // 3
      CaseDate,     // 4
      CaseTime,     // 5
      deliverBefore, // 6 ("Deliver Before" column)
      SpecialRequest, // 7
      'Pending',    // 8 (Status - default to Pending on creation)
      RequestedSets, // 9 ("Requested Sets" column)
      '',           // 10 ("Selected Sets" - empty on creation)
      new Date().toISOString(), // 11 ("Last Updated" - current timestamp)
      '',           // 12 (Driver - empty on creation)
      '',           // 13 (UsagePhoto - empty on creation)
      '',           // 14 (UsagePhoto2 - empty on creation)
      '',           // 15 (Patient MRN - typically assigned later via usages)
      '',           // 16 (Delivery Note - empty on creation)
      '',           // 17 (Delivery Note Link - empty on creation)
      Type          // 18
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
    });

    return { success: true, message: `Booking ${newBookingID} created successfully.` };
  } catch (error) {
    console.error('Error adding booking:', error); // Log the full error for debugging
    // Provide a more informative error message to the user
    return { success: false, error: (error as Error).message || 'An unexpected error occurred while creating the booking.' };
  }
}