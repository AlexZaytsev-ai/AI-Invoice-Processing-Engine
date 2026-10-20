import { describe, expect, it } from "vitest";
import { runDemoScenario, sampleInvoice } from "./demo";

describe("Демонстрационные ветки существующего workflow", () => {
  it("создаёт новый корректный счёт версии 1 после четырёх проверок", () => {
    const result = runDemoScenario("create");
    expect(result).toMatchObject({
      source: "demo",
      status: "processed",
      action: "created",
      invoice: sampleInvoice,
    });
    expect(result.storage).toEqual({
      record_id: "demo-inv-1042",
      version: 1,
      previous_version: null,
      created: true,
      updated: false,
    });
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every((check) => check.status === "passed")).toBe(
      true,
    );
  });

  it("оставляет повторный счёт без новых записей, обновлений и изменения версии", () => {
    const result = runDemoScenario("duplicate");
    expect(result).toMatchObject({ status: "processed", action: "duplicate" });
    expect(result.invoice).toEqual(result.previous_invoice);
    expect(result.storage).toEqual({
      record_id: "demo-inv-1042",
      version: 1,
      previous_version: 1,
      created: false,
      updated: false,
    });
  });

  it("обновляет ту же запись, показывает изменённые сумму и НДС и увеличивает версию", () => {
    const result = runDemoScenario("update");
    expect(result).toMatchObject({ status: "processed", action: "updated" });
    expect(result.storage).toEqual({
      record_id: "demo-inv-1042",
      version: 2,
      previous_version: 1,
      created: false,
      updated: true,
    });
    expect(result.invoice.invoice_number).toBe(
      result.previous_invoice!.invoice_number,
    );
    expect(result.invoice.supplier_inn).toBe(
      result.previous_invoice!.supplier_inn,
    );
    expect(result.previous_invoice!.amount).toBe(128400);
    expect(result.invoice.amount).toBe(142800);
    expect(result.invoice.vat_amount).toBe(23800);
  });

  it("останавливается на несовпадении реквизитов до проверки дублей и не сохраняет счёт", () => {
    const result = runDemoScenario("bank-mismatch");
    expect(result).toMatchObject({
      status: "manual_review",
      action: "blocked",
    });
    expect(result.invoice.bank_account).not.toBe(result.expected_bank_account);
    expect(result.checks.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "required", status: "passed" },
      { id: "supplier", status: "passed" },
      { id: "bank", status: "warning" },
      { id: "duplicate", status: "skipped" },
    ]);
    expect(result.storage).toEqual({
      record_id: null,
      version: null,
      previous_version: null,
      created: false,
      updated: false,
    });
  });

  it("изолирует сценарии от порядка запуска и изменения предыдущего результата", () => {
    const before = runDemoScenario("create");
    runDemoScenario("update").invoice.amount = 1;
    runDemoScenario("bank-mismatch");
    runDemoScenario("duplicate");
    expect(runDemoScenario("create")).toEqual(before);
    expect(sampleInvoice.amount).toBe(128400);
  });
});
