/** Имена полей соответствуют Prepare Invoice Data в исходном workflow. */
export interface Invoice {
  document_type: "invoice" | "not_invoice";
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name: string | null;
  supplier_inn: string | null;
  amount: number | null;
  currency: string | null;
  vat_amount: number | null;
  bank_account: string | null;
  payment_due_date: string | null;
  missing_fields: string[];
}

export type ScenarioId = "create" | "duplicate" | "update" | "bank-mismatch";
export type CheckId = "required" | "supplier" | "bank" | "duplicate";
export type CheckStatus = "passed" | "warning" | "skipped";
export type InvoiceAction = "created" | "duplicate" | "updated" | "blocked";

export interface InvoiceCheck {
  id: CheckId;
  status: CheckStatus;
  title: string;
  detail: string;
}

export interface ProcessingResult {
  contract_version: 1;
  source: "demo" | "backend";
  status: "processed" | "manual_review";
  action: InvoiceAction;
  invoice: Invoice;
  checks: InvoiceCheck[];
  storage: {
    record_id: string | null;
    version: number | null;
    previous_version: number | null;
    created: boolean;
    updated: boolean;
  };
  previous_invoice: Invoice | null;
  expected_bank_account: string | null;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  description: string;
  tag: string;
  filename: string;
}

export type ProcessingRequest =
  | { kind: "demo"; scenarioId: ScenarioId }
  | { kind: "file"; file: File };

export interface InvoiceApi {
  mode: "demo" | "backend";
  process: (
    request: ProcessingRequest,
    signal?: AbortSignal,
  ) => Promise<ProcessingResult>;
}
