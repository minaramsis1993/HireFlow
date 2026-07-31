# HireFlow

An applicant tracking system (ATS) built with **Angular 20**, standalone components, signals, Angular Material 3 and SCSS.

## Quick start

```bash
npm install
npm start          # dev server on http://localhost:4200
```

| Script            | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm start`       | Dev server with the development environment file |
| `npm run build`   | Production build into `dist/hireflow`            |
| `npm test`        | Karma + Jasmine in watch mode                    |
| `npm run test:ci` | Single headless run                              |
| `npm run lint`    | ESLint over TypeScript and templates             |
| `npm run format`  | Prettier over `src`                              |

### AI CV screening

Screening is optional. Without a key the app falls back to an offline mock that scores the CV text
against the job's requirements, so everything below works out of the box.

To screen with a real model, paste a [Google AI Studio](https://aistudio.google.com/apikey) key into
`gemini.apiKey` in `src/environments/environment.development.ts` and restart the dev server.

**Do not commit that key, and do not put one in `src/environments/environment.ts`** — both files are
tracked, and anything in the production environment file ships inside the JS bundle where every
visitor can read it. For a real deployment, restrict the key by HTTP referrer and to the Generative
Language API in the Google Cloud console, then point `gemini.baseUrl` at your own backend proxy so
the key never reaches the browser at all.

## What's in the box

- **Dashboard** — headline metrics, pipeline funnel, recent activity.
- **Jobs** — filterable requisition list, detail view, create/edit form with typed reactive forms.
- **Candidates** — searchable talent pool and profile pages with per-application stage control.
- **Pipeline** — drag-and-drop kanban board (Angular CDK) across the six hiring stages.

Data currently comes from in-memory fixtures in `src/app/core/data/seed-data.ts`, so the UI is explorable without a backend.

## Architecture

```
src/app/
├── core/            # singletons: models, stores, interceptors, title strategy
│   ├── data/        # seed fixtures (delete once the API exists)
│   ├── interceptors/
│   ├── models/      # domain types + label/enum tables
│   ├── services/    # signal stores, notifications, theme
│   └── utils/
├── layout/shell/    # toolbar + navigation drawer + routed outlet
├── shared/          # reusable, presentational pieces
│   ├── pipes/
│   └── ui/          # page-header, empty-state, stat-card, status-chip, confirm-dialog
└── features/        # lazily loaded route bundles
    ├── dashboard/
    ├── jobs/
    ├── candidates/
    ├── pipeline/
    └── not-found/
```

Path aliases (`@core/*`, `@shared/*`, `@layout/*`, `@features/*`, `@env/*`) are configured in `tsconfig.json`.

## Conventions

- **Zoneless.** `provideZonelessChangeDetection()` is on and `zone.js` is not installed. Change detection is driven by signals, so state must live in signals (or go through `ChangeDetectorRef.markForCheck()`).
- **OnPush everywhere.** Every component sets `ChangeDetectionStrategy.OnPush`.
- **Signals over RxJS for state.** Stores hold a private `signal` and expose it read-only; derived values are `computed()`. RxJS is used where it fits — HTTP and CDK breakpoints — bridged with `toSignal()`.
- **Inputs.** `input()` / `input.required()` signal inputs; route params bind straight to component inputs via `withComponentInputBinding()`.
- **`inject()`** instead of constructor parameter injection.
- **Typed reactive forms** built with `FormBuilder.nonNullable`; no `ngModel`.
- **Theming.** Colours come from Material 3 system variables (`--mat-sys-*`) only — no hard-coded hex — so light and dark both work. `ThemeService` toggles `color-scheme` on `<body>` and persists the choice.
- **Lazy routes.** Every feature is loaded with `loadComponent` / `loadChildren`.

## Replacing the mock data

The three stores (`JobStore`, `CandidateStore`, `ApplicationStore`) are the only places that touch data. Swap the seeded `signal` for `HttpClient` calls inside those files and the rest of the app is unaffected: `apiBaseUrlInterceptor` already prefixes relative URLs with `environment.apiBaseUrl`, and `errorInterceptor` surfaces failures through the snackbar.

## Testing

Specs run against the real browser through Karma. Alongside the store unit tests there are component specs (`job-list`, `pipeline`, `candidate-detail`) that render Material and CDK templates, which is where wiring problems tend to show up. TestBed configurations must include `provideZonelessChangeDetection()`.
