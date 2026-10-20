import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvoiceApi, MAX_FILE_SIZE, validatePdf } from "./invoiceApi";
import { parseProcessingResult } from "./resultContract";
import { runDemoScenario } from "../domain/demo";

const pdf = () =>
  new File(["%PDF-1.7\n% local test document"], "invoice.pdf", {
    type: "application/pdf",
  });
const backendResult = () => ({
  ...runDemoScenario("create"),
  source: "backend",
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Автономность и защита PDF в деморежиме", () => {
  it("по умолчанию запускает все четыре сценария без единого fetch", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const api = createInvoiceApi({ demoDelay: 0 });
    expect(api.mode).toBe("demo");
    for (const scenarioId of [
      "create",
      "duplicate",
      "update",
      "bank-mismatch",
    ] as const) {
      expect((await api.process({ kind: "demo", scenarioId })).source).toBe(
        "demo",
      );
    }
    expect(network).not.toHaveBeenCalled();
  });

  it("не отправляет произвольный PDF и не подставляет тестовый результат", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    await expect(
      createInvoiceApi().process({ kind: "file", file: pdf() }),
    ).rejects.toThrow("Файл никуда не отправлен");
    expect(network).not.toHaveBeenCalled();
  });

  it("остаётся автономным при опечатке в конфигурации", () => {
    expect(createInvoiceApi({ mode: "backedn" }).mode).toBe("demo");
  });

  it("поддерживает отмену демонстрации", async () => {
    const controller = new AbortController();
    const pending = createInvoiceApi().process(
      { kind: "demo", scenarioId: "create" },
      controller.signal,
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("Проверка выбранного файла", () => {
  it("принимает PDF по сигнатуре, включая файл с пустым MIME от браузера", async () => {
    await expect(validatePdf(pdf())).resolves.toBeUndefined();
    await expect(
      validatePdf(new File(["%PDF-1.7"], "invoice.PDF")),
    ).resolves.toBeUndefined();
  });

  it("отклоняет неверный формат, пустой, поддельный и слишком большой PDF", async () => {
    await expect(
      validatePdf(new File(["text"], "invoice.txt", { type: "text/plain" })),
    ).rejects.toThrow("Выберите PDF");
    await expect(validatePdf(new File([], "empty.pdf"))).rejects.toThrow(
      "пуст",
    );
    await expect(
      validatePdf(new File(["not a pdf"], "fake.pdf")),
    ).rejects.toThrow("Не удалось распознать PDF");
    await expect(
      validatePdf(new File([new Uint8Array(MAX_FILE_SIZE + 1)], "big.pdf")),
    ).rejects.toThrow("больше 10 МБ");
  });
});

describe("Будущий backend — только изолированные сетевые заглушки", () => {
  it("отправляет PDF только по явному вызову и проверяет ответ", async () => {
    const network = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(backendResult()), { status: 200 }),
      );
    vi.stubGlobal("fetch", network);
    const api = createInvoiceApi({ mode: "backend", baseUrl: "/api" });
    expect(network).not.toHaveBeenCalled();
    const response = await api.process({ kind: "file", file: pdf() });
    expect(response.source).toBe("backend");
    expect(network).toHaveBeenCalledOnce();
    const [path, options] = network.mock.calls[0];
    expect(path).toBe("/api/invoices/process");
    expect(options.method).toBe("POST");
    expect(options.redirect).toBe("error");
    expect(options.body.get("file")).toBeInstanceOf(File);
  });

  it("не допускает прямой URL внешнего сервиса", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    for (const baseUrl of [
      "https://example.invalid/webhook",
      "//example.invalid/api",
      "/api?token=secret",
    ]) {
      await expect(
        createInvoiceApi({ mode: "backend", baseUrl }).process({
          kind: "file",
          file: pdf(),
        }),
      ).rejects.toThrow("относительный путь");
    }
    expect(network).not.toHaveBeenCalled();
  });

  it("даже в режиме backend тестовые сценарии остаются локальными", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const response = await createInvoiceApi({
      mode: "backend",
      demoDelay: 0,
    }).process({ kind: "demo", scenarioId: "duplicate" });
    expect(response.source).toBe("demo");
    expect(network).not.toHaveBeenCalled();
  });

  it("не отправляет запрос, если ожидание уже отменено", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const controller = new AbortController();
    controller.abort();
    await expect(
      createInvoiceApi({ mode: "backend" }).process(
        { kind: "file", file: pdf() },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(network).not.toHaveBeenCalled();
  });

  it("показывает понятную ошибку сервера вместо фиктивного успеха", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 422 })),
    );
    await expect(
      createInvoiceApi({ mode: "backend" }).process({
        kind: "file",
        file: pdf(),
      }),
    ).rejects.toThrow("Не удалось извлечь данные");
  });

  it("обрабатывает сетевую ошибку и истечение времени ожидания", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(
      createInvoiceApi({ mode: "backend" }).process({
        kind: "file",
        file: pdf(),
      }),
    ).rejects.toThrow("Не удалось получить результат");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_path, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    await expect(
      createInvoiceApi({ mode: "backend", timeoutMs: 5 }).process({
        kind: "file",
        file: pdf(),
      }),
    ).rejects.toThrow("Результат неизвестен");
  });
});

describe("Контракт ответа", () => {
  it("принимает согласованные результаты четырёх веток", () => {
    for (const scenarioId of [
      "create",
      "duplicate",
      "update",
      "bank-mismatch",
    ] as const) {
      const value = { ...runDemoScenario(scenarioId), source: "backend" };
      expect(parseProcessingResult(value)).toEqual(value);
    }
  });

  it("отклоняет произвольный JSON, пропущенные проверки и противоречивые версии", () => {
    expect(() => parseProcessingResult({ success: true })).toThrow(
      "контракт API",
    );
    expect(() =>
      parseProcessingResult({ ...backendResult(), checks: [] }),
    ).toThrow("контракт API");
    expect(() =>
      parseProcessingResult({ ...backendResult(), source: "demo" }),
    ).toThrow("контракт API");
    const duplicate = { ...runDemoScenario("duplicate"), source: "backend" };
    duplicate.storage.created = true;
    expect(() => parseProcessingResult(duplicate)).toThrow("контракт API");
    const updated = { ...runDemoScenario("update"), source: "backend" };
    updated.storage.version = 9;
    expect(() => parseProcessingResult(updated)).toThrow("контракт API");
  });
});
