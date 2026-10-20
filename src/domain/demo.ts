import type {
  Invoice,
  InvoiceCheck,
  ProcessingResult,
  Scenario,
  ScenarioId,
} from "./types";

export const scenarios: Scenario[] = [
  {
    id: "create",
    title: "Корректный счёт",
    description: "Новый счёт от известного поставщика",
    tag: "Создание",
    filename: "invoice-1042.pdf",
  },
  {
    id: "duplicate",
    title: "Повторная загрузка",
    description: "Тот же счёт, без изменений в данных",
    tag: "Дубль",
    filename: "invoice-1042.pdf",
  },
  {
    id: "update",
    title: "Изменённый счёт",
    description: "Тот же номер, новая сумма и НДС",
    tag: "Обновление",
    filename: "invoice-1042-updated.pdf",
  },
  {
    id: "bank-mismatch",
    title: "Другие реквизиты",
    description: "Банковский счёт не совпадает с реестром",
    tag: "Проверка",
    filename: "invoice-1042-bank.pdf",
  },
];

export const sampleInvoice: Invoice = {
  document_type: "invoice",
  invoice_number: "СЧ-1042",
  invoice_date: "2026-10-14",
  supplier_name: "ООО «Северные системы»",
  supplier_inn: "7701234560",
  amount: 128400,
  currency: "RUB",
  vat_amount: 21400,
  bank_account: "40702810900000001234",
  payment_due_date: "2026-10-28",
  missing_fields: [],
};

const checkTitles = {
  required: "Обязательные данные",
  supplier: "Поставщик в реестре",
  bank: "Банковские реквизиты",
  duplicate: "Дубли и изменения",
} as const;

/** Только локальная имитация веток workflow. Все записи вымышлены и изолированы. */
export function runDemoScenario(scenarioId: ScenarioId): ProcessingResult {
  if (!scenarios.some((scenario) => scenario.id === scenarioId)) {
    throw new Error("Неизвестный демонстрационный сценарий.");
  }
  const invoice = structuredClone(sampleInvoice);
  const stored =
    scenarioId === "duplicate" || scenarioId === "update"
      ? structuredClone(sampleInvoice)
      : null;
  if (scenarioId === "update") {
    invoice.amount = 142800;
    invoice.vat_amount = 23800;
  }
  if (scenarioId === "bank-mismatch")
    invoice.bank_account = "40702810900000005678";

  const checks: InvoiceCheck[] = [
    {
      id: "required",
      status: "passed",
      title: checkTitles.required,
      detail: "Номер, ИНН и банковский счёт заполнены. Сумма больше нуля.",
    },
    {
      id: "supplier",
      status: "passed",
      title: checkTitles.supplier,
      detail: `Поставщик найден по ИНН ${invoice.supplier_inn} в тестовом реестре.`,
    },
  ];

  const result: ProcessingResult = {
    contract_version: 1,
    source: "demo",
    status: "processed",
    action: "created",
    invoice,
    checks,
    storage: {
      record_id: "demo-inv-1042",
      version: 1,
      previous_version: null,
      created: true,
      updated: false,
    },
    previous_invoice: stored,
    expected_bank_account: sampleInvoice.bank_account,
  };

  // Как в workflow: реквизиты проверяются до поиска существующего счёта.
  if (invoice.bank_account !== sampleInvoice.bank_account) {
    checks.push(
      {
        id: "bank",
        status: "warning",
        title: checkTitles.bank,
        detail:
          "Счёт в документе отличается от подтверждённого счёта поставщика.",
      },
      {
        id: "duplicate",
        status: "skipped",
        title: checkTitles.duplicate,
        detail:
          "Проверка не выполнялась: обработка остановлена на банковских реквизитах.",
      },
    );
    return {
      ...result,
      status: "manual_review",
      action: "blocked",
      storage: {
        record_id: null,
        version: null,
        previous_version: null,
        created: false,
        updated: false,
      },
    };
  }

  checks.push({
    id: "bank",
    status: "passed",
    title: checkTitles.bank,
    detail:
      "Банковский счёт совпадает с подтверждёнными реквизитами поставщика.",
  });

  if (!stored) {
    checks.push({
      id: "duplicate",
      status: "passed",
      title: checkTitles.duplicate,
      detail:
        "Счёт с таким номером и ИНН не найден. Можно создать новую запись.",
    });
    return result;
  }

  // Те же пять полей и преобразования, что в Compare Invoice Data.
  const changed =
    Number(stored.amount) !== Number(invoice.amount) ||
    String(stored.currency) !== String(invoice.currency) ||
    Number(stored.vat_amount) !== Number(invoice.vat_amount) ||
    String(stored.invoice_date).slice(0, 10) !==
      String(invoice.invoice_date).slice(0, 10) ||
    String(stored.bank_account) !== String(invoice.bank_account);

  checks.push({
    id: "duplicate",
    status: "passed",
    title: checkTitles.duplicate,
    detail: changed
      ? "Номер и ИНН совпадают. Сумма и НДС изменились — обновляется существующая запись."
      : "Номер и ИНН совпадают. Дата, сумма, валюта, НДС и банковский счёт не изменились.",
  });

  return {
    ...result,
    action: changed ? "updated" : "duplicate",
    storage: {
      record_id: "demo-inv-1042",
      version: changed ? 2 : 1,
      previous_version: 1,
      created: false,
      updated: changed,
    },
  };
}
