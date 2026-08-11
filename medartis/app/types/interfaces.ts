

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
  IsComplete?: string;
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
  Status?: string;
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
// Shared view models used by server actions and client components.
export interface PatientUsageSummary {
  MRN: string;
  PhotoUrl: string;
  UsageLogSheet?: string;
  Items: Array<{
    ItemCode: string;
    Description: string;
    Quantity: number;
  }>;
}

export interface FlexibleBookingSet extends BookingSet {
  [key: string]: any;
}

export type EnhancedBooking = Bookings & {
  Type?: string;
  PatientUsages: PatientUsageSummary[];
  RelatedBookingSets: FlexibleBookingSet[];
};

export interface VirtualSet extends Sets {
  computedStatus: 'Free' | 'Booked';
  computedComplete: 'Yes' | 'No';
  computedLocation: string;
}

export interface VirtualUsage extends Usage {
  computedUsageStatus: 'Refilled' | 'Pending to Refill';
}

export interface VirtualTraysContent extends TraysContent {
  computedCurrentQty: number;
  itemHistory: VirtualUsage[];
}

export interface EnrichedTray extends Trays {
  computedTrayStatus: 'Complete' | 'InComplete';
  contents: VirtualTraysContent[];
}

export interface PartAllocationRef {
  SetID: string;
  TrayID: string;
  TrayName: string;
  CurrentQty: number;
}

export interface VirtualPartsMaster extends PartsMaster {
  inSetsQty: number;
  rowIndex: string;
  allocations: PartAllocationRef[];
  history: Usage[];
}

export interface UsageItemInput {
  id: number;
  usageId?: string;
  setId?: string;
  trayId: string;
  partNumber: string;
  itemId: string;
  description: string;
  qtyUsed: number;
  qtyRefilled: number;
}

export interface BookingSetOption {
  SetID: string;
  SetName: string;
  computedStatus?: string;
  LoanType?: string;
}
