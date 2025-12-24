# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status
- This repository currently contains a project design document at `init.md` and has not yet been scaffolded as an application (no `package.json`, build system, or tests are present).
- The design targets a local-first web app for macroeconomic data ingestion, normalization via an LLM, versioned storage, merging, and visualization.

When the app is initialized (see Bootstrapping), use the commands below. Until then, build/lint/test commands are not available.

## Bootstrapping (recommended path from init.md)
- Create a TypeScript Next.js app (App Router) in this directory:
  - `npx create-next-app@latest --typescript --app --eslint --src-dir --use-npm .`
  - Then add ECharts and any UI library you choose.
- If you prefer a separate API layer, an Express server is also acceptable, but Next.js App Router is recommended for simplicity and co-locating API routes with the UI.

## Commands (after initialization)
These commands assume the app is initialized with Next.js and a standard `package.json`:
- Dev server: `npm run dev`
- Build: `npm run build`
- Start (serve build): `npm run start`
- Lint: `npm run lint`
- Type-check (if configured): `npm run type-check`
- Test (if configured): `npm test`
- Run a single test:
  - If using Vitest: `npx vitest path/to/file.spec.ts -t "test name"`
  - If using Jest: `npx jest path/to/file.test.ts -t "test name"`

Note: choose and configure one test framework (Vitest or Jest) during setup; add the corresponding scripts in `package.json`.

## High-level architecture (from init.md)
Target structure (Next.js App Router shown, adjust if opting for Express):

```
macro-data-studio
├── public/
├── src/
│   ├── app/                    # (Next.js App Router)
│   │   ├── api/                # API routes: dataset ops, LLM calls, etc.
│   │   ├── dashboard/          # Main dashboard page(s)
│   │   └── ...
│   ├── components/             # Shared UI components
│   ├── lib/                    # Utilities: FS helpers, merge algorithm, CSV parsing
│   ├── types/                  # TypeScript types
│   └── data-store/             # Local data storage (gitignored)
│       ├── datasets.json       # Registry indexing all datasets
│       └── {dataset-id}/
│           ├── metadata.json   # Dataset metadata
│           ├── raw/            # Uploaded CSV files, YYYYMMDD_HHmmss.csv
│           └── processed/      # Converted JSON files, timestamped
└── ... config files
```

### Core flows and API surface (planned)
- Dataset management
  - Create dataset with metadata and initial upload
  - Upload CSV to `raw/` (timestamped)
  - Server triggers LLM pre-processing to learn schema/prompt for future updates
  - List datasets and versions from `datasets.json` and per-dataset `metadata.json`
- LLM-assisted conversion (DeepSeek API)
  - Convert uploaded CSV to JSON according to a prompt/schema
  - Persist converted JSON to `processed/` with matching timestamp
- Merge
  - Select multiple processed JSON versions and perform a full outer-join across time/category keys
  - Conflict resolution strategy (latest-wins/average/user-selected) determined in UI or server util
- Visualization
  - Generate an ECharts spec from natural language + sample data (server calls LLM)
  - Render chart on the client using ECharts component with provided data + spec

Suggested Next.js API endpoints (adjust naming as you implement):
- `POST /api/datasets/{id}/upload` (store CSV to `raw/`, trigger conversion)
- `POST /api/datasets/{id}/merge` (merge selected processed versions)
- `POST /api/visualize/generate-spec` (return ECharts `option` JSON)

## Data model references (from init.md)
Key types to implement under `src/types`:
- `DatasetMetadata` with id, name, description, source, created, updated
- `DataVersion` with timestamp, rawFileName, processedFileName?, note?
- `DatasetRegistry` shape for `datasets.json`

## Storage and invariants
- `src/data-store/` must be ignored by git. Do not commit user data.
- Filenames under `raw/` and `processed/` should use `YYYYMMDD_HHmmss` timestamps; `processed` files correspond to `raw` by timestamp.
- `datasets.json` is the source of truth for the registry; keep it consistent with per-dataset directories.

## Environment and security notes
- Configure the DeepSeek API key via environment variables (e.g., `.env.local` for Next.js). Do not expose secrets to the client.
- Validate any file paths derived from user input to prevent directory traversal. Treat `data-store` operations as a security boundary.

## What Claude Code should do when implementing tasks
- Prefer Next.js App Router co-location for API endpoints under `src/app/api/**` unless the project is intentionally split.
- Put filesystem utilities in `src/lib/**` and isolated pure functions for merging/conversion there.
- Keep domain types in `src/types/**` and re-use them across server and client code.
- When adding features, wire them to the storage layout and invariants defined above.

## Related docs in this repo
- `init.md`: primary design document with rationale, example types, API sketches, and development phases. Start here when adding features or making architectural choices.
