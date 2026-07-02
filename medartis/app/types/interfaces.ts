

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

// app/types/inventory.ts

export interface Sets {
  SetID: string;
  SetName: string;
  Location: string;
  DeliveryDate?: string;
  LoanType?: string;
  DeliveryNote?: string;
  //SystemStatus?: string;
  Notes?: string;
  // Dynamic client indicators
  SetStatus?: string;
  "Current Location"?: string;
  "Set Complete?"?: string;
}

export interface Trays {
  _RowNumber?: number;
  TrayID: string;
  SetID: string;
  TrayName: string;
  TrayType: string;
  Status?: string;
  Photo?: string;
  Notes?: string;
  TrayStatus?: string;
}

export interface TraysContent {
  ItemID: string;
  TrayID: string;
  PartNumber: string;
  Description: string;
  LotNumber: string;
  IdealQty: number;
  ActualQty?: number;
  ItemType: string;
  Notes?: string;
  "Current Qty"?: number;
  Restock?: number;
}

export interface Bookings {
  BookingID: string;
  Salesperson: string;
  Hospital: string;
  Doctor: string;
  CaseDate: string;
  CaseTime: string;
  "Deliver Before"?: string;
  "Special Request"?: string;
  Status: string;
  "Requested Sets": string;
  "Selected Sets"?: string;
  "Last Updated": string;
  Driver?: string;
  UsagePhoto?: string;
  UsagePhoto2?: string;
  "Patient MRN"?: string;
  "Delivery Note"?: string;
  "Delivery Note Link"?: string;
  "Sales Email"?: string;
  CaseDay?: string;
  Type?: string;
}
export interface BookingSet {
  BookingID: string;
  SetID: string;
  SetName?: string;
  Status?: string;
  // Up to 7 Tray Photos tracking columns
  Photo1?: string;
  Photo2?: string;
  Photo3?: string;
  Photo4?: string;
  Photo5?: string;
  Photo6?: string;
  Photo7?: string;
}

// Update your EnhancedBooking type to match columns 20, 23, and 24
export type EnhancedBooking = {
  BookingID: string;
  // ... other standard booking fields
  RelatedBookingSets: BookingSet[]; // Column 20: REF_ROWS("BookingSets", "BookingID")
  RelatedUsages: any[];            // Column 23: REF_ROWS("Usage", "BookingID")
  RelatedUsagePhotos: any[];       // Column 24: REF_ROWS("Usage Photos", "BookingID")
};

export interface Usage {
  UsageID: string;
  BookingID: string;
  SetID: string;
  TrayID: string;
  PartNumber: string;
  LotID?: string;
  QtyUsed: number;
  PatientMRN: string;
  Date: string;
  Hospital: string;
  "Qty Refilled": number;
  Notes?: string;
  Photo?: string;
  ItemID: string;
  "Last Update": string;
  "Set Delivery Note"?: string;
  "Refill Delivery Note"?: string;
  "Usage Status"?: string;
  Description?: string;
}

export interface UsagePhotos {
  _RowNumber?: number;
  MRN: string;
  Photo: string;
  BookingID: string;
  Date?: string;
  "Usage Ids"?: string;
  "Usage Total"?: number;
}

export interface Stock {
  "Scanned Barcode"?: string;
  GTIN: string;
  "Batch/Lot": string;
  "Item Code": string;
  Qty: number;
  "Expiry Date"?: string;
  Location: string;
}

export interface PartsMaster {
  PartNumber: string;
  "Master SKU": string;
  Description: string;
  Type: string;
  Kind: string;
  PU: string;
  Image?: string;
  "Refill Stock"?: number;
  Usages?: number;
}


export interface EnrichedUsage extends Usage {
  computedUsageStatus: 'Refilled' | 'Pending to Refill';
  rowIndex: string;
}


export interface PatientMRNGroup {
  groupKey: string; // 🔑 Add this field
  PatientMRN: string;
  Hospital: string;
  Date: string;
  BookingID: string;
  items: EnrichedUsage[];
  photos: string[];
}