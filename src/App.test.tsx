// @vitest-environment jsdom
import { File as NodeFile } from "node:buffer";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function configureViewport(width: number, reducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => {
      const maxWidth = query.match(/max-width:\s*(\d+)px/);
      return {
        matches: query.includes("prefers-reduced-motion")
          ? reducedMotion
          : maxWidth !== null && width <= Number(maxWidth[1]),
      };
    }),
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Демо не должно отправлять сетевые запросы");
    }),
  );
  configureViewport(1024);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function runScenario(title: RegExp) {
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: title }));
  vi.useFakeTimers();
  fireEvent.click(
    screen.getByRole("button", { name: "Обработать тестовый счёт" }),
  );
  expect(screen.getByRole("status").textContent).toContain(
    "Проверяем тестовый счёт",
  );
  expect(
    screen
      .getByRole("button", { name: /Обрабатываем/ })
      .hasAttribute("disabled"),
  ).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1900);
  });
  vi.useRealTimers();
  expect(fetch).not.toHaveBeenCalled();
}

describe("Пользовательские действия в интерфейсе", () => {
  it("показывает начальное состояние с явным деморежимом", () => {
    render(<App />);
    expect(screen.getByText("Деморежим")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Один документ/ })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Извлечённые данные" }),
    ).toBeNull();
  });

  it("по нажатию обрабатывает новый счёт и показывает обязательные поля", async () => {
    await runScenario(/^Корректный счёт/);
    expect(screen.getByRole("heading", { name: "Обработано" })).toBeTruthy();
    const data = screen.getByRole("region", { name: "Извлечённые данные" });
    for (const value of [
      "СЧ-1042",
      "14.10.2026",
      "ООО «Северные системы»",
      "7701234560",
      "RUB · Российский рубль",
      "40702810900000001234",
    ]) {
      expect(within(data).getByText(value)).toBeTruthy();
    }
    expect(
      screen.getByRole("region", { name: "Результаты проверок" }).textContent,
    ).toContain("Пройдено 4 из 4");
    expect(screen.getAllByText("Новая запись создана")).toHaveLength(2);
  });

  it("показывает для дубля нулевые записи и обновления", async () => {
    await runScenario(/^Повторная загрузка/);
    expect(screen.getAllByText("Повторная запись не создана")).toHaveLength(2);
    expect(
      screen.getByText("0 новых записей · 0 обновлений · версия 1"),
    ).toBeTruthy();
  });

  it("показывает для обновления прежнюю и новую суммы и новую версию", async () => {
    await runScenario(/^Изменённый счёт/);
    expect(screen.getByText("Что изменилось")).toBeTruthy();
    expect(screen.getByText("Версия 1 → 2")).toBeTruthy();
    expect(
      screen.getByText("0 новых записей · 1 обновление · версия 1 → 2"),
    ).toBeTruthy();
    const changes = document.querySelector(".changes-panel")!;
    expect(changes.textContent?.replace(/\s/g, " ")).toContain("128 400,00");
    expect(changes.textContent?.replace(/\s/g, " ")).toContain("142 800,00");
  });

  it("показывает остановку и оба банковских счёта при несовпадении", async () => {
    await runScenario(/^Другие реквизиты/);
    expect(
      screen.getByRole("heading", { name: "Требуется ручная проверка" }),
    ).toBeTruthy();
    expect(screen.getByText("40702810900000005678")).toBeTruthy();
    expect(screen.getByText("В реестре: 40702810900000001234")).toBeTruthy();
    expect(screen.getByText("Пропущено")).toBeTruthy();
    expect(screen.getAllByText("Запись не создана")).toHaveLength(2);
  });

  it("после выбора собственного PDF не создаёт извлечённые данные и не отправляет файл", async () => {
    render(<App />);
    // Node File предоставляет стандартный Blob.arrayBuffer, отсутствующий в jsdom File.
    const file = new NodeFile(["%PDF-1.7\n% test"], "my-invoice.pdf", {
      type: "application/pdf",
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Выбрать PDF-файл"), {
        target: { files: [file] },
      });
    });
    expect(
      screen.getByRole("heading", {
        name: "PDF выбран. Данные остаются у вас.",
      }),
    ).toBeTruthy();
    const button = screen.getByRole("button", { name: "Обработать PDF" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(
      screen.queryByRole("heading", { name: "Извлечённые данные" }),
    ).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("показывает ошибку повреждённого файла и позволяет вернуться к сценарию", async () => {
    render(<App />);
    const file = new NodeFile(["not a pdf"], "broken.pdf", {
      type: "application/pdf",
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Выбрать PDF-файл"), {
        target: { files: [file] },
      });
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Не удалось распознать PDF",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^Повторная загрузка/ }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Обработать тестовый счёт" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("останавливает загрузку и не показывает запоздалый результат", async () => {
    render(<App />);
    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: "Обработать тестовый счёт" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Отменить ожидание" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.queryByRole("heading", { name: "Обработано" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "Демонстрация остановлена",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Прокрутка к результату после обновления DOM", () => {
  it.each([375, 390, 768])(
    "плавно прокручивает к результату на ширине %i px",
    (width) => {
      configureViewport(width);
      const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView);
      scroll.mockImplementation(function (this: HTMLElement) {
        expect(this.getAttribute("aria-busy")).toBe("true");
        expect(within(this).getByRole("status")).toBeTruthy();
      });
      render(<App />);
      fireEvent.click(
        screen.getByRole("button", { name: "Обработать тестовый счёт" }),
      );
      expect(scroll).toHaveBeenCalledExactlyOnceWith({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    },
  );

  it.each([375, 390, 768])(
    "отключает плавную прокрутку при reduced motion на ширине %i px",
    (width) => {
      configureViewport(width, true);
      render(<App />);
      fireEvent.click(
        screen.getByRole("button", { name: "Обработать тестовый счёт" }),
      );
      expect(
        HTMLElement.prototype.scrollIntoView,
      ).toHaveBeenCalledExactlyOnceWith({
        behavior: "instant",
        block: "start",
        inline: "nearest",
      });
    },
  );

  it("не прокручивает страницу в двухколоночной раскладке", () => {
    configureViewport(1024);
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Обработать тестовый счёт" }),
    );
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("Сценарии при мобильных media queries (DOM без измерения вёрстки)", () => {
  it.each([375, 390, 768])(
    "запускает четыре сценария последовательно при %i px",
    async (width) => {
      configureViewport(width);
      render(<App />);
      vi.useFakeTimers();
      for (const [scenario, status, outcome] of [
        [/^Корректный счёт/, "Обработано", "Новая запись создана"],
        [/^Повторная загрузка/, "Обработано", "Повторная запись не создана"],
        [/^Изменённый счёт/, "Обработано", "Существующая запись обновлена"],
        [/^Другие реквизиты/, "Требуется ручная проверка", "Запись не создана"],
      ] as const) {
        fireEvent.click(screen.getByRole("button", { name: scenario }));
        expect(
          screen.queryByRole("heading", { name: "Извлечённые данные" }),
        ).toBeNull();
        fireEvent.click(
          screen.getByRole("button", { name: "Обработать тестовый счёт" }),
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1900);
        });
        expect(screen.getByRole("heading", { name: status })).toBeTruthy();
        expect(screen.getAllByText(outcome)).toHaveLength(2);
      }
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(4);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
