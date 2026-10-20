import type { Invoice, ProcessingResult } from "../domain/types";
import { InvoiceApiError } from "./errors";

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nullableString = (value: unknown) =>
  value === null || typeof value === "string";
const nullableNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const version = (value: unknown) =>
  value === null ||
  (typeof value === "number" && Number.isInteger(value) && value >= 1);

function isInvoice(value: unknown): value is Invoice {
  if (!object(value)) return false;
  return (
    (value.document_type === "invoice" ||
      value.document_type === "not_invoice") &&
    [
      "invoice_number",
      "invoice_date",
      "supplier_name",
      "supplier_inn",
      "currency",
      "bank_account",
      "payment_due_date",
    ].every((key) => nullableString(value[key])) &&
    ["amount", "vat_amount"].every((key) => nullableNumber(value[key])) &&
    (value.currency === null || /^[A-Z]{3}$/.test(String(value.currency))) &&
    ["invoice_date", "payment_due_date"].every(
      (key) =>
        value[key] === null || /^\d{4}-\d{2}-\d{2}$/.test(String(value[key])),
    ) &&
    Array.isArray(value.missing_fields) &&
    value.missing_fields.every((field) => typeof field === "string")
  );
}

/** Не доверяем произвольному JSON: UI получает только полный и согласованный контракт. */
export function parseProcessingResult(value: unknown): ProcessingResult {
  const fail = () => {
    throw new InvoiceApiError(
      "Backend вернул неполный или несовместимый результат. Проверьте контракт API.",
    );
  };
  if (
    !object(value) ||
    value.contract_version !== 1 ||
    value.source !== "backend" ||
    !isInvoice(value.invoice)
  )
    return fail();
  if (
    typeof value.status !== "string" ||
    !["processed", "manual_review"].includes(value.status) ||
    typeof value.action !== "string" ||
    !["created", "duplicate", "updated", "blocked"].includes(value.action)
  )
    return fail();
  if (
    !object(value.storage) ||
    !nullableString(value.storage.record_id) ||
    !version(value.storage.version) ||
    !version(value.storage.previous_version) ||
    typeof value.storage.created !== "boolean" ||
    typeof value.storage.updated !== "boolean"
  )
    return fail();
  if (
    !(value.previous_invoice === null || isInvoice(value.previous_invoice)) ||
    !nullableString(value.expected_bank_account)
  )
    return fail();
  if (!Array.isArray(value.checks) || value.checks.length !== 4) return fail();
  const checkIds = new Set<string>();
  for (const check of value.checks) {
    if (
      !object(check) ||
      typeof check.id !== "string" ||
      !["required", "supplier", "bank", "duplicate"].includes(check.id) ||
      typeof check.status !== "string" ||
      !["passed", "warning", "skipped"].includes(check.status) ||
      typeof check.title !== "string" ||
      typeof check.detail !== "string"
    )
      return fail();
    checkIds.add(String(check.id));
  }
  if (checkIds.size !== 4) return fail();
  const { action, status, storage } = value;
  if (action === "blocked") {
    if (
      status !== "manual_review" ||
      storage.created ||
      storage.updated ||
      storage.record_id !== null ||
      storage.version !== null ||
      storage.previous_version !== null ||
      !value.checks.some((check) => check.status === "warning")
    )
      return fail();
  } else {
    if (
      status !== "processed" ||
      !storage.record_id ||
      storage.version === null ||
      value.checks.some((check) => check.status !== "passed")
    )
      return fail();
    if (
      action === "created" &&
      (!storage.created ||
        storage.updated ||
        storage.version !== 1 ||
        storage.previous_version !== null)
    )
      return fail();
    if (
      action === "duplicate" &&
      (storage.created ||
        storage.updated ||
        storage.version !== storage.previous_version)
    )
      return fail();
    if (
      action === "updated" &&
      (storage.created ||
        !storage.updated ||
        typeof storage.previous_version !== "number" ||
        storage.version !== storage.previous_version + 1 ||
        value.previous_invoice === null)
    )
      return fail();
  }
  return value as unknown as ProcessingResult;
}
