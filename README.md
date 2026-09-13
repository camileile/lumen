# Lumen

## What is Lumen

Lumen is a digital awareness prototype that helps users reflect on the sources they visit online. The current product classifies submitted URLs primarily from domain-based rules and can optionally ask OpenRouter for a classification.

Lumen does not currently verify whether an article is true or false, and it does not analyze the complete article content. Its score and A/B/C/D labels are automated indicators, not objective factual verdicts.

## Architecture

- `lumen-web`: Next.js and React web application for account access, URL analysis, and the dashboard.
- `lumen-backend`: Express API with TypeScript, Prisma, SQLite, JWT authentication, and optional OpenRouter integration.
- `lumen-extension`: Chrome/Chromium Manifest V3 extension. It applies the local domain rules immediately and can call the backend when connected.

The three applications remain independent. There is no root workspace or shared dependency installation.

## Requirements

- Node.js 22.23.2 LTS (see `.nvmrc`)
- npm 10.9.8
- Chrome or another Chromium browser to load the extension

The repository enforces the Node 22 and npm 10 major versions during installation. With `nvm`, run `nvm use` from the repository root.

## Installation

Clone the repository, then install each Node application independently:

```bash
cd lumen-backend
npm ci

cd ../lumen-web
npm ci
```

There is intentionally no dependency installation at the repository root. The extension has no package installation step.

Copy each example environment file to its local counterpart before running the applications:

```text
lumen-backend/.env.example -> lumen-backend/.env
lumen-web/.env.example     -> lumen-web/.env.local
```

Never commit the resulting local environment files.

## Environment Variables

Backend (`lumen-backend/.env`):

| Variable | Purpose | Safe local example |
| --- | --- | --- |
| `PORT` | API port | `3000` |
| `CORS_ORIGIN` | Allowed web origin | `http://localhost:3001` |
| `DATABASE_URL` | Prisma SQLite connection | `file:./prisma/dev.db` |
| `JWT_SECRET` | JWT signing secret | Generate a private random value |
| `OPENROUTER_API_KEY` | Optional OpenRouter credential | Obtain your own key |
| `OPENROUTER_BASE_URL` | OpenRouter API base | `https://openrouter.ai/api/v1` |
| `OPENROUTER_SITE_URL` | Application URL sent to OpenRouter | `http://localhost:3001` |
| `OPENROUTER_APP_NAME` | Application name sent to OpenRouter | `Lumen` |

Frontend (`lumen-web/.env.local`):

| Variable | Purpose | Safe local example |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Browser-visible backend URL | `http://localhost:3000` |

The committed example files contain placeholders only. Use deployment secret management for real credentials.

## Running Locally

Start the backend on `http://localhost:3000`:

```bash
cd lumen-backend
npm run dev
```

Start the frontend on `http://localhost:3001` in a second terminal:

```bash
cd lumen-web
npm run dev
```

To run the extension locally:

1. Keep the backend available on port 3000.
2. Open `chrome://extensions` in Chrome/Chromium.
3. Enable Developer mode and choose **Load unpacked**.
4. Select the `lumen-extension` directory.

The extension's current development manifest allows the local backend at `http://localhost:3000`.

## Validation

Run these commands in both `lumen-backend` and `lumen-web`:

```bash
npm run lint
npm run typecheck
npm run build
```

Validate the extension from the repository root:

```bash
node --check lumen-extension/background.js
node --check lumen-extension/content.js
node --check lumen-extension/popup.js
node -e "JSON.parse(require('node:fs').readFileSync('lumen-extension/manifest.json', 'utf8'))"
```

Automated tests are not present yet; they will be introduced in a later modernization phase.

## Current Limitations

- Analysis is based mainly on the URL's domain and static source lists.
- Complete article-content analysis and factual verification are not implemented.
- The scoring and classification methodology still need dedicated validation and tests.
- The project is being modernized incrementally; see `docs/PROJECT_AUDIT.md` and `docs/FOUNDATION_STATUS.md` for scope and remaining work.
