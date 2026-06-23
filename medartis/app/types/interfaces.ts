export interface MedicalSet {
  id: string;
  name: string;
  location: string;
  deliveryDate: string;
  loanType: string;
  deliveryNote: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}