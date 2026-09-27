export type CnpjCpfType = 'CPF' | 'CNPJ';

export type PaymentProvider =
  | 'Pix direto'
  | 'InfinitePay'
  | 'Mercado Pago'
  | 'Outro';

export interface Installment {
  date: string;
  value: number | null;
  paid: boolean;
}

export interface DocumentLogEntry {
  templateId: string;
  templateLabel: string;
  generatedAt: number;
}

export interface MaintenanceLogEntry {
  id: string;
  date: number;
  note: string;
}

export interface SignedDocumentEntry {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  uploadedAt: number;
}

export interface Client {
  id: string;
  name: string;
  cnpjCpf: string;
  cnpjCpfType: CnpjCpfType;
  segment: string;
  whatsapp: string;
  email: string;
  address: string;
  projectType: string;
  pipelineStage: string;
  domain: string;
  hosting: string;
  repo: string;
  contractDate: string;
  deliveryDate: string;
  budget: number | null;
  deposit: number | null;
  paymentMethod: string;
  paymentStatus: string;
  paymentProvider: PaymentProvider;
  feesAmount: number | null;
  proofReference: string;
  maintenance: boolean;
  maintenanceValue: number | null;
  notes: string;
  // New fields for document generation
  deliveryUrl: string;
  maintenanceStartDate: string;
  paymentInstallments: Installment[];
  scopeItems: string[];
  documentLogs: DocumentLogEntry[];
  // Set automatically the first time a document is generated; never edited by hand.
  budgetNumber?: string;
  // Number of revision rounds included in this client's budget/contract
  // (defaults to 3 when unset, matching the previous fixed behavior).
  reviewRounds: number;
  // One entry per maintenance request the client has used, so usage
  // against the monthly allowance (5/month, per the standard contract)
  // can be tracked. Not part of the edit form — logged from the detail view.
  maintenanceLogs: MaintenanceLogEntry[];
  // Signed documents (contract, budget, etc.) the client sent back,
  // stored in Firebase Storage. Not part of the edit form.
  signedDocuments: SignedDocumentEntry[];
  createdAt?: number;
  updatedAt?: number;
}

export type ClientInput = Omit<
  Client,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'documentLogs'
  | 'maintenanceLogs'
  | 'signedDocuments'
>;

export interface SyncState {
  online: boolean;
  pendingWrites: boolean;
  synced: boolean;
}
