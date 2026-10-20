import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Copy,
  FileCheck2,
  FilePlus2,
  FileSearch,
  FileText,
  Fingerprint,
  Info,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { invoiceApi, validatePdf } from "./api/invoiceApi";
import { scenarios } from "./domain/demo";
import type { Invoice, ProcessingResult, ScenarioId } from "./domain/types";

type Selection =
  | { kind: "demo"; id: ScenarioId }
  | { kind: "file"; file: File };
const scenarioIcons: Record<ScenarioId, LucideIcon> = {
  create: FilePlus2,
  duplicate: Copy,
  update: RefreshCw,
  "bank-mismatch": ShieldCheck,
};
const stages = [
  "Читаем тестовые данные",
  "Проверяем поставщика и реквизиты",
  "Сравниваем данные счёта",
];

function money(amount: number | null, currency: string | null = "RUB") {
  if (amount === null) return "Не указана";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "RUB",
    minimumFractionDigits: 2,
  }).format(amount);
}

function date(value: string | null) {
  if (!value) return "Не указана";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : new Intl.DateTimeFormat("ru-RU").format(parsed);
}

function Field({
  label,
  children,
  mono = false,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`data-field${wide ? " field-wide" : ""}`}>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : ""}>{children || "Не указано"}</dd>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="empty-result">
      <div className="document-illustration" aria-hidden="true">
        <div className="document-art">
          <div className="doc-shadow" />
          <div className="doc-paper">
            <div className="doc-top">
              <FileText size={23} />
              <span>СЧЁТ НА ОПЛАТУ</span>
            </div>
            <div className="doc-rule long" />
            <div className="doc-rule" />
            <div className="doc-table">
              <i />
              <i />
              <i />
            </div>
            <div className="doc-bottom">
              <span>ИТОГО</span>
              <div className="doc-rule" />
            </div>
          </div>
          <span className="doc-scan">
            <ScanLine size={24} />
          </span>
          <span className="doc-shield">
            <ShieldCheck size={19} />
          </span>
        </div>
      </div>
      <div className="empty-copy">
        <span className="eyebrow">ВСЁ НА ОДНОМ ЭКРАНЕ</span>
        <h3>
          Один документ.
          <br />
          Полная ясность.
        </h3>
        <p>
          Выберите тестовый счёт и запустите обработку. Здесь появятся данные и
          результаты проверок.
        </p>
      </div>
      <div className="empty-features">
        <span>
          <FileSearch size={16} /> Данные из PDF
        </span>
        <span>
          <ShieldCheck size={16} /> Проверка реквизитов
        </span>
        <span>
          <Fingerprint size={16} /> Защита от дублей
        </span>
      </div>
      <div className="demo-footnote">
        <Info size={14} /> Демо: обработка на подготовленных данных.
      </div>
    </div>
  );
}

function LoadingResult({ isDemo }: { isDemo: boolean }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setStage((value) => Math.min(value + 1, 2)),
      550,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="loading-result" role="status" aria-live="polite">
      <div className="loading-icon">
        <ScanLine size={34} />
        <span />
      </div>
      <span className="eyebrow">
        {isDemo ? "ДЕМОНСТРАЦИЯ ОБРАБОТКИ" : "ОБРАБОТКА ДОКУМЕНТА"}
      </span>
      <h3>
        {isDemo ? "Проверяем тестовый счёт" : "Документ отправлен на обработку"}
      </h3>
      <p>
        {isDemo
          ? "Показываем, как работают правила существующего workflow."
          : "Ожидаем ответ подключённого backend."}
      </p>
      <div className="loading-steps">
        {(isDemo
          ? stages
          : [
              "Отправляем PDF в backend",
              "Ожидаем извлечение данных",
              "Ожидаем результат проверок",
            ]
        ).map((text, index) => (
          <div key={text} className={index <= stage ? "active" : ""}>
            {index < stage ? (
              <CircleCheck size={18} />
            ) : index === stage ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <span className="step-circle" />
            )}
            <span>{text}</span>
          </div>
        ))}
      </div>
      <div className="loading-track">
        <span />
      </div>
    </div>
  );
}

function UploadNotice({ file, backend }: { file: File; backend: boolean }) {
  return (
    <div className="upload-notice">
      <div className="notice-icon">
        <FileText size={32} />
      </div>
      <span className="eyebrow">ВАШ ДОКУМЕНТ</span>
      <h3>
        {backend
          ? "PDF готов к обработке"
          : "PDF выбран. Данные остаются у вас."}
      </h3>
      <p className="selected-file-name">{file.name}</p>
      <div className="notice-box">
        <Info size={20} />
        <p>
          {backend
            ? "Нажмите «Обработать PDF», чтобы отправить документ в подключённый backend."
            : "Для извлечения данных из вашего PDF нужен подключённый backend. В деморежиме документ не отправляется и не получает выдуманный результат."}
        </p>
      </div>
      {!backend && (
        <p className="notice-hint">
          Чтобы увидеть результат сейчас, выберите один из четырёх тестовых
          сценариев слева.
        </p>
      )}
    </div>
  );
}

const outcomeCopy = {
  created: {
    title: "Новая запись создана",
    detail: "Счёт прошёл проверки и добавлен в тестовый реестр.",
  },
  duplicate: {
    title: "Повторная запись не создана",
    detail:
      "Этот счёт уже есть в реестре. Данные и версия записи остались без изменений.",
  },
  updated: {
    title: "Существующая запись обновлена",
    detail: "Данные изменились. Обновлён тот же счёт; новая запись не создана.",
  },
  blocked: {
    title: "Запись не создана",
    detail:
      "Проверки выявили данные, требующие внимания. Сохранение счёта остановлено.",
  },
};

function Changes({ result }: { result: ProcessingResult }) {
  if (result.action !== "updated" || !result.previous_invoice) return null;
  type ChangeKey =
    | "amount"
    | "vat_amount"
    | "invoice_date"
    | "currency"
    | "bank_account";
  const fields: { key: ChangeKey; label: string }[] = [
    { key: "amount", label: "Сумма" },
    { key: "vat_amount", label: "НДС" },
    { key: "invoice_date", label: "Дата" },
    { key: "currency", label: "Валюта" },
    { key: "bank_account", label: "Банковский счёт" },
  ];
  function formatField(invoice: Invoice, key: ChangeKey): string {
    if (key === "amount" || key === "vat_amount")
      return money(invoice[key], invoice.currency);
    if (key === "invoice_date") return date(invoice[key]);
    return invoice[key] ?? "Не указано";
  }
  const previous = result.previous_invoice;
  return (
    <div className="changes-panel">
      <div className="changes-heading">
        <RefreshCw size={15} />
        <strong>Что изменилось</strong>
        <span>
          Версия {result.storage.previous_version} → {result.storage.version}
        </span>
      </div>
      {fields
        .filter(({ key }) => previous[key] !== result.invoice[key])
        .map(({ key, label }) => (
          <div className="change-row" key={key}>
            <span>{label}</span>
            <del>{formatField(previous, key)}</del>
            <ArrowRight size={13} />
            <strong>{formatField(result.invoice, key)}</strong>
          </div>
        ))}
    </div>
  );
}

function Result({ result }: { result: ProcessingResult }) {
  const manual = result.status === "manual_review";
  const bankMismatch = result.checks.some(
    (check) => check.id === "bank" && check.status === "warning",
  );
  const copy = outcomeCopy[result.action];
  const passed = result.checks.filter(
    (check) => check.status === "passed",
  ).length;
  const invoice = result.invoice;
  return (
    <div className="completed-result">
      <div
        className={`status-panel ${manual ? "status-warning" : "status-success"}`}
      >
        <div className="status-symbol">
          {manual ? <CircleAlert size={23} /> : <CheckCheck size={23} />}
        </div>
        <div>
          <span className="status-eyebrow">
            ИТОГ ОБРАБОТКИ{result.source === "demo" ? " · ДЕМО" : ""}
          </span>
          <h3>{manual ? "Требуется ручная проверка" : "Обработано"}</h3>
          <p>{copy.title}</p>
        </div>
        {!manual && (
          <span className="version-pill">Версия {result.storage.version}</span>
        )}
      </div>

      <section className="invoice-data" aria-labelledby="data-title">
        <div className="section-heading">
          <h3 id="data-title">
            <FileText size={17} /> Извлечённые данные
          </h3>
          <span className="small-label">
            {result.source === "demo" ? "Тестовый документ" : "Ответ backend"}
          </span>
        </div>
        <div className="invoice-overview">
          <div>
            <span className="small-label">Счёт на оплату</span>
            <strong>{invoice.invoice_number || "Без номера"}</strong>
          </div>
          <div className="invoice-total">
            <span className="small-label">Сумма счёта</span>
            <strong>{money(invoice.amount, invoice.currency)}</strong>
          </div>
        </div>
        <dl className="data-grid">
          <Field label="Поставщик" wide>
            {invoice.supplier_name}
          </Field>
          <Field label="Дата счёта">{date(invoice.invoice_date)}</Field>
          <Field label="ИНН поставщика" mono>
            {invoice.supplier_inn}
          </Field>
          <Field label="Валюта">
            {invoice.currency === "RUB"
              ? "RUB · Российский рубль"
              : invoice.currency}
          </Field>
          <Field label="В том числе НДС">
            {money(invoice.vat_amount, invoice.currency)}
          </Field>
          <Field label="Банковский счёт" mono wide>
            <span className={bankMismatch ? "mismatch-account" : ""}>
              {invoice.bank_account || "Не указан"}
            </span>
            {bankMismatch && result.expected_bank_account && (
              <span className="expected-account">
                В реестре: {result.expected_bank_account}
              </span>
            )}
          </Field>
        </dl>
      </section>

      <Changes result={result} />
      <section className="validation-section" aria-labelledby="checks-title">
        <div className="section-heading">
          <h3 id="checks-title">
            <ShieldCheck size={17} /> Результаты проверок
          </h3>
          <span className="small-label">
            Пройдено {passed} из {result.checks.length}
          </span>
        </div>
        <ul className="check-list">
          {result.checks.map((check) => (
            <li key={check.id} className={`check-${check.status}`}>
              <span className="check-icon">
                {check.status === "passed" ? (
                  <Check size={14} />
                ) : check.status === "warning" ? (
                  <CircleAlert size={17} />
                ) : (
                  <span>—</span>
                )}
              </span>
              <div>
                <strong>{check.title}</strong>
                <p>{check.detail}</p>
              </div>
              <span className="check-status">
                {check.status === "passed"
                  ? "Пройдено"
                  : check.status === "warning"
                    ? "Проверить"
                    : "Пропущено"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className={`storage-outcome ${manual ? "storage-warning" : ""}`}>
        <div className="storage-outcome-icon">
          {result.action === "duplicate" ? (
            <Copy size={18} />
          ) : manual ? (
            <LockKeyhole size={18} />
          ) : (
            <FileCheck2 size={18} />
          )}
        </div>
        <div>
          <strong>{copy.title}</strong>
          <p>
            {result.source === "demo"
              ? copy.detail
              : "Результат получен от подключённого backend."}
          </p>
          {result.action === "duplicate" && (
            <span className="storage-tag">
              0 новых записей · 0 обновлений · версия {result.storage.version}
            </span>
          )}
          {result.action === "updated" && (
            <span className="storage-tag">
              0 новых записей · 1 обновление · версия{" "}
              {result.storage.previous_version} → {result.storage.version}
            </span>
          )}
        </div>
      </div>
      {result.source === "demo" && (
        <p className="result-disclaimer">
          <Info size={13} /> Это демонстрация. Рабочая база и внешние сервисы не
          используются.
        </p>
      )}
    </div>
  );
}

export default function App() {
  const [selection, setSelection] = useState<Selection>({
    kind: "demo",
    id: "create",
  });
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const validationId = useRef(0);
  const backend = invoiceApi.mode === "backend";
  const locked = busy || validating;
  const scenario =
    selection.kind === "demo"
      ? scenarios.find((item) => item.id === selection.id)!
      : null;
  const filename =
    selection.kind === "file" ? selection.file.name : scenario!.filename;

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      validationId.current += 1;
    },
    [],
  );

  // После обновления DOM: кнопка отмены и состояние загрузки уже заняли своё место.
  useEffect(() => {
    if (!busy || !window.matchMedia("(max-width: 800px)").matches) return;
    resultRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [busy]);

  function chooseScenario(id: ScenarioId) {
    validationId.current += 1;
    setSelection({ kind: "demo", id });
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function selectFile(files: FileList | File[] | null) {
    if (locked || !files?.length) return;
    const currentId = ++validationId.current;
    setResult(null);
    setSelection({ kind: "demo", id: "create" });
    setError(null);
    if (files.length > 1) {
      setError("Выберите один PDF-файл за раз.");
      return;
    }
    setValidating(true);
    try {
      await validatePdf(files[0]);
      if (currentId === validationId.current)
        setSelection({ kind: "file", file: files[0] });
    } catch (caught) {
      if (currentId === validationId.current)
        setError(
          caught instanceof Error
            ? caught.message
            : "Не удалось прочитать файл. Попробуйте другой PDF.",
        );
    } finally {
      if (currentId === validationId.current) setValidating(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function processInvoice() {
    if (locked || (selection.kind === "file" && !backend)) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await invoiceApi.process(
        selection.kind === "demo"
          ? { kind: "demo", scenarioId: selection.id }
          : { kind: "file", file: selection.file },
        controller.signal,
      );
      if (!controller.signal.aborted) setResult(response);
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(
          caught instanceof Error
            ? caught.message
            : "Не удалось обработать документ. Попробуйте ещё раз.",
        );
    } finally {
      if (controllerRef.current === controller) {
        setBusy(false);
        controllerRef.current = null;
      }
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    setBusy(false);
    setError(
      selection.kind === "demo"
        ? "Демонстрация остановлена. Можно запустить её снова."
        : "Ожидание остановлено. Backend мог продолжить обработку; проверьте результат перед повторной отправкой.",
    );
  }

  function reset() {
    chooseScenario("create");
    resultRef.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            aria-label="AI Invoice Processing Engine — начало"
          >
            <span className="brand-symbol">
              <FileText size={22} />
              <span />
            </span>
            <span>
              Invoice Engine
              <span className="brand-subtitle">AI-обработка счетов</span>
            </span>
          </a>
          <nav aria-label="Главная навигация">
            <a className="nav-active" href="#demo">
              Демонстрация
            </a>
            <a href="#how-it-works">
              Как это работает <ArrowUpRight size={13} />
            </a>
          </nav>
          <span className={`mode-badge ${backend ? "backend-badge" : ""}`}>
            <span />
            {backend ? "Режим backend" : "Деморежим"}
          </span>
        </div>
      </header>
      <main className="page-shell">
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span /> AI INVOICE PROCESSING ENGINE
            </div>
            <h1>
              От PDF-счёта
              <br />к <span>проверенным данным.</span>
            </h1>
            <p>
              Извлечение данных, проверка реквизитов и защита от дублей — в
              одном процессе. AI читает документ, бизнес-правила принимают
              решение.
            </p>
            <div className="hero-note">
              <LockKeyhole size={14} />{" "}
              {backend
                ? "Тестовые сценарии по-прежнему работают локально"
                : "Автономная демонстрация · без отправки документов"}
            </div>
          </div>
          <div
            className="hero-flow"
            aria-label="PDF, извлечение данных, бизнес-проверки"
          >
            <div className="flow-caption">
              <span>ОТ ДОКУМЕНТА К РЕЗУЛЬТАТУ</span>
              <span>01 — 03</span>
            </div>
            <div className="flow-nodes">
              <div className="flow-node">
                <span className="flow-icon">
                  <FileText size={24} />
                </span>
                <strong>PDF-счёт</strong>
                <small>Входной документ</small>
              </div>
              <ArrowRight className="flow-arrow" size={18} />
              <div className="flow-node">
                <span className="flow-icon flow-ai">
                  <Sparkles size={24} />
                </span>
                <strong>AI-извлечение</strong>
                <small>Структура данных</small>
              </div>
              <ArrowRight className="flow-arrow" size={18} />
              <div className="flow-node">
                <span className="flow-icon flow-check">
                  <ShieldCheck size={24} />
                </span>
                <strong>Проверки</strong>
                <small>Понятный результат</small>
              </div>
            </div>
            <div className="flow-bottom">
              <Check size={13} /> AI извлекает. Правила проверяют.
            </div>
          </div>
        </section>

        <section
          id="demo"
          className="demo-section"
          aria-labelledby="demo-title"
        >
          <div className="workspace-heading">
            <div>
              <div className="eyebrow">ИНТЕРАКТИВНАЯ ДЕМОНСТРАЦИЯ</div>
              <h2 id="demo-title">Посмотрите, как это работает</h2>
            </div>
            <span className="workspace-hint">
              <span /> Все примеры — тестовые
            </span>
          </div>
          <div className="workspace-grid">
            <aside className="input-panel" aria-label="Выбор документа">
              <div className="input-heading">
                <span className="step-number">01</span>
                <div>
                  <h3>Выберите документ</h3>
                  <p>Четыре ситуации из реального workflow</p>
                </div>
              </div>
              <div
                className="scenario-list"
                role="group"
                aria-label="Тестовые сценарии"
              >
                {scenarios.map((item) => {
                  const Icon = scenarioIcons[item.id];
                  const selected =
                    selection.kind === "demo" && selection.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={locked}
                      className={`scenario-card${selected ? " selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => chooseScenario(item.id)}
                    >
                      <span className="scenario-icon">
                        <Icon size={19} />
                      </span>
                      <span className="scenario-copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                      <span className="scenario-radio">
                        {selected && <span />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="scenario-isolation">
                Каждый сценарий запускается независимо <br />
                на своём тестовом состоянии.
              </p>
              <button
                className="primary-button"
                type="button"
                disabled={locked || (selection.kind === "file" && !backend)}
                onClick={processInvoice}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={18} /> Обрабатываем…
                  </>
                ) : validating ? (
                  <>
                    <LoaderCircle className="spin" size={18} /> Проверяем файл…
                  </>
                ) : (
                  <>
                    {selection.kind === "demo"
                      ? result
                        ? "Повторить демонстрацию"
                        : "Обработать тестовый счёт"
                      : "Обработать PDF"}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
              {busy && (
                <button className="text-button cancel-button" onClick={cancel}>
                  Отменить ожидание
                </button>
              )}

              <div className="upload-divider">
                <span />
                или свой документ
                <span />
              </div>
              <input
                ref={inputRef}
                id="pdf-upload"
                tabIndex={-1}
                className="visually-hidden"
                type="file"
                accept=".pdf,application/pdf"
                disabled={locked}
                aria-label="Выбрать PDF-файл"
                onChange={(event) => void selectFile(event.target.files)}
              />
              <button
                type="button"
                className={`drop-zone${dragging ? " dragging" : ""}${selection.kind === "file" ? " has-file" : ""}`}
                disabled={locked}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!locked) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void selectFile(event.dataTransfer.files);
                }}
              >
                <span className="upload-icon">
                  {selection.kind === "file" ? (
                    <FileCheck2 size={22} />
                  ) : (
                    <Upload size={22} />
                  )}
                </span>
                <strong>
                  {selection.kind === "file"
                    ? selection.file.name
                    : "Выберите или перетащите PDF"}
                </strong>
                <span>
                  {selection.kind === "file"
                    ? `${(selection.file.size / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} КБ · нажмите, чтобы заменить`
                    : "Один файл · до 10 МБ"}
                </span>
              </button>
              {selection.kind === "file" && (
                <button
                  className="text-button remove-file"
                  disabled={locked}
                  onClick={() => chooseScenario("create")}
                >
                  <X size={13} /> Убрать файл
                </button>
              )}
              <p className="upload-info">
                <LockKeyhole size={13} />
                <span>
                  {backend
                    ? "PDF отправится в backend только после нажатия кнопки."
                    : "Обработка своего PDF доступна после подключения backend. Сейчас файл остаётся в браузере."}
                </span>
              </p>
              {error && (
                <div className="error-box" role="alert">
                  <CircleAlert size={17} />
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    aria-label="Закрыть сообщение об ошибке"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </aside>

            <section
              ref={resultRef}
              tabIndex={-1}
              className="result-panel"
              aria-labelledby="result-title"
              aria-busy={busy}
            >
              <div className="result-panel-header">
                <div>
                  <span className="step-number">02</span>
                  <h2 id="result-title">Результат обработки</h2>
                </div>
                <span
                  className={`result-state${busy ? " is-busy" : ""}${result ? " is-ready" : ""}`}
                >
                  <span />
                  {busy ? "В процессе" : result ? "Готово" : "Ожидание"}
                </span>
              </div>
              {(result || busy || selection.kind === "file") && (
                <div className="file-strip">
                  <FileText size={15} />
                  <span title={filename}>{filename}</span>
                  <span className="file-type">
                    {selection.kind === "demo" ? "ТЕСТОВЫЕ ДАННЫЕ" : "PDF"}
                  </span>
                  {result && (
                    <button
                      onClick={reset}
                      aria-label="Сбросить результат"
                      title="Сбросить результат"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              )}
              <div aria-live="polite" aria-atomic="false">
                {busy ? (
                  <LoadingResult isDemo={selection.kind === "demo"} />
                ) : result ? (
                  <Result result={result} />
                ) : selection.kind === "file" ? (
                  <UploadNotice file={selection.file} backend={backend} />
                ) : (
                  <EmptyResult />
                )}
              </div>
            </section>
          </div>
        </section>

        <section
          id="how-it-works"
          className="how-section"
          aria-labelledby="how-title"
        >
          <div className="how-title">
            <span className="eyebrow">ПОД КАПОТОМ</span>
            <h2 id="how-title">
              AI для данных. <br />
              Правила для решений.
            </h2>
            <p>Демонстрация повторяет ключевые ветки n8n-процесса.</p>
          </div>
          <ol className="how-steps">
            <li>
              <span className="how-number">01</span>
              <div>
                <h3>Извлечение из PDF</h3>
                <p>
                  В рабочем процессе AI структурирует номер, дату, поставщика,
                  сумму и реквизиты.
                </p>
                <span className="tech-tag">PDF → структурированные данные</span>
              </div>
            </li>
            <li>
              <span className="how-number">02</span>
              <div>
                <h3>Проверка бизнес-правил</h3>
                <p>
                  Обязательные поля, поставщик по ИНН и совпадение банковского
                  счёта с реестром.
                </p>
                <span className="tech-tag">Детерминированная логика</span>
              </div>
            </li>
            <li>
              <span className="how-number">03</span>
              <div>
                <h3>Создание или обновление</h3>
                <p>
                  Номер счёта + ИНН защищают от дублей. Изменения обновляют
                  запись и её версию.
                </p>
                <span className="tech-tag">Защита от повторной записи</span>
              </div>
            </li>
          </ol>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <a href="#" className="footer-brand">
            <FileText size={16} /> AI Invoice Processing Engine
          </a>
          <span>Проект Alexander Zaytsev</span>
        </div>
        <span>
          <span className="footer-dot" />{" "}
          {backend
            ? "Тестовые сценарии работают автономно"
            : "Деморежим · Все данные вымышлены"}
        </span>
      </footer>
    </>
  );
}
