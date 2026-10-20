import { runDemoScenario } from "../domain/demo";
import type { InvoiceApi, ProcessingResult } from "../domain/types";
import { parseProcessingResult } from "./resultContract";
import { InvoiceApiError } from "./errors";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Проверяет только тип, размер и сигнатуру. Содержимое PDF не извлекается. */
export async function validatePdf(file: File): Promise<void> {
  if (
    !/\.pdf$/i.test(file.name) ||
    (file.type && !["application/pdf", "application/x-pdf"].includes(file.type))
  ) {
    throw new InvoiceApiError(
      "Выберите PDF-файл. Другие форматы пока не поддерживаются.",
    );
  }
  if (file.size === 0)
    throw new InvoiceApiError("Этот файл пуст. Выберите другой PDF.");
  if (file.size > MAX_FILE_SIZE)
    throw new InvoiceApiError(
      "Файл больше 10 МБ. Выберите PDF меньшего размера.",
    );
  const signature = new TextDecoder().decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (signature !== "%PDF-")
    throw new InvoiceApiError(
      "Не удалось распознать PDF. Проверьте файл и попробуйте ещё раз.",
    );
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Обработка отменена", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

interface ApiOptions {
  mode?: string;
  baseUrl?: string;
  demoDelay?: number;
  timeoutMs?: number;
}

export function createInvoiceApi(options: ApiOptions = {}): InvoiceApi {
  // Отсутствие или опечатка в настройке оставляет приложение автономным.
  const mode = options.mode === "backend" ? "backend" : "demo";
  const baseUrl = options.baseUrl ?? "/api";

  return {
    mode,
    async process(request, signal): Promise<ProcessingResult> {
      if (request.kind === "demo") {
        await delay(options.demoDelay ?? 1800, signal);
        return runDemoScenario(request.scenarioId);
      }

      // Эта ветка находится до чтения документа и любого сетевого запроса.
      if (mode !== "backend") {
        throw new InvoiceApiError(
          "Для обработки вашего PDF нужен подключённый backend. Файл никуда не отправлен.",
        );
      }
      // В frontend допускается лишь путь к API того же origin. URL n8n и ключи здесь не нужны.
      if (!/^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(baseUrl)) {
        throw new InvoiceApiError(
          "Укажите относительный путь к backend того же сайта, например /api.",
        );
      }
      await validatePdf(request.file);
      signal?.throwIfAborted();
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, options.timeoutMs ?? 60000);
      try {
        const body = new FormData();
        body.append("file", request.file, request.file.name);
        const response = await fetch(
          `${baseUrl.replace(/\/$/, "")}/invoices/process`,
          {
            method: "POST",
            body,
            signal: controller.signal,
            credentials: "same-origin",
            cache: "no-store",
            redirect: "error",
          },
        );
        if (!response.ok) {
          const messages: Record<number, string> = {
            413: "Файл слишком большой для сервера. Выберите PDF меньшего размера.",
            415: "Сервер не поддерживает этот файл. Выберите другой PDF.",
            422: "Не удалось извлечь данные из PDF. Проверьте документ или попробуйте другой.",
            429: "Сервис занят. Попробуйте отправить документ чуть позже.",
          };
          throw new InvoiceApiError(
            messages[response.status] ??
              "Backend не смог обработать документ. Попробуйте ещё раз позже.",
          );
        }
        return parseProcessingResult(await response.json());
      } catch (error) {
        if (signal?.aborted)
          throw new DOMException("Обработка отменена", "AbortError");
        if (timedOut)
          throw new InvoiceApiError(
            "Сервис не ответил за минуту. Результат неизвестен; проверьте его перед повторной отправкой.",
          );
        if (error instanceof InvoiceApiError) throw error;
        throw new InvoiceApiError(
          "Не удалось получить результат от backend. Проверьте подключение.",
        );
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
      }
    },
  };
}

export const invoiceApi = createInvoiceApi({
  mode: import.meta.env.VITE_API_MODE,
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
