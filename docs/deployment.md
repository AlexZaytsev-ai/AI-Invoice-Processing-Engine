# Публикация на GitHub Pages

[Главный README](../README.md) · [Локальный запуск и LAN](getting-started.md) · [API и backend](api-contract.md)

Публичная демоверсия: **https://alexzaytsev-ai.github.io/AI-Invoice-Processing-Engine/**.

На Pages публикуется автономный интерфейс с тестовыми данными. Исходный n8n workflow остаётся отдельным артефактом репозитория и к сайту не подключается.

## Автоматическая сборка и публикация

Процесс описан в [.github/workflows/pages.yml](../.github/workflows/pages.yml):

1. Checkout исходников и установка Node.js 24.
2. Установка зависимостей через `npm ci` по lock-файлу.
3. Проверка сценариев и интерфейса через `npm test`.
4. Сборка через `npm run build:pages`.
5. Загрузка только `dist/` и развёртывание на GitHub Pages.

Push в `main` автоматически обновляет сайт. Pull request запускает только проверки и сборку. Для ручного повторного запуска откройте [Actions](https://github.com/AlexZaytsev-ai/AI-Invoice-Processing-Engine/actions/workflows/pages.yml) → **Deploy autonomous demo to GitHub Pages → Run workflow** и выберите `main`.

В [Settings → Pages](https://github.com/AlexZaytsev-ai/AI-Invoice-Processing-Engine/settings/pages) источник **Build and deployment → Source** должен быть **GitHub Actions**. В репозитории он уже настроен.

## Проверка перед публикацией

Из корня репозитория:

```powershell
npm.cmd test
npm.cmd run build:pages
npm.cmd run preview
```

Откройте **http://127.0.0.1:4173/AI-Invoice-Processing-Engine/** и проверьте четыре сценария. На macOS и Linux используйте `npm` вместо `npm.cmd`.

[vite.config.ts](../vite.config.ts) задаёт base **`/AI-Invoice-Processing-Engine/`** для production-сборки и preview. Для `dev` и `dev:lan` сохраняется корень `/`. Переименование репозитория потребует обновить base и ссылки на публичный сайт.

## Что попадает на сайт

Публикуется **только `dist/`**: HTML, JS, CSS и статические ресурсы интерфейса. Документация, JSON-экспорты n8n, `.env`, Git и зависимости в артефакт сайта не входят. Исходники и документация при этом доступны отдельно в публичном GitHub-репозитории.

`build:pages` принудительно задаёт `VITE_API_MODE=demo` и относительный путь `/api`, даже если локальные переменные настроены на backend. Поэтому загрузка собственного PDF на публичном сайте не отправляет документ на обработку.

Публикация использует временный `GITHUB_TOKEN` и OIDC; отдельно добавлять ключи или токены в репозиторий не нужно. В [.gitignore](../.gitignore) исключены реальные `.env*`, `dist/`, `node_modules/` и локальные артефакты. В репозитории хранится только несекретный [.env.example](../.env.example).

Сборка и публикация запускают только frontend-процесс. n8n workflow, рабочая база, Gmail, Telegram и Bitrix24 не вызываются.

## Справочные материалы

- [Vite: GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub Pages: custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
