// Shared data contract; keep this module independent of native/browser runtimes.
export type ConsultationSlot = { date: string; time: string };
export type ConsultationInput = {
  method: 'in-person' | 'virtual';
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
};
export type ConsultationRequest = ConsultationInput & {
  id: string;
  status: 'awaiting-confirmation' | 'awaiting-customer' | 'needs-alternatives' | 'confirmed' | 'local-draft';
  options: ConsultationSlot[];
  confirmedDate: string | null;
  confirmedTime: string | null;
  version: number;
  order_reference?: string | null;
};
