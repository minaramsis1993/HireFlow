# HireFlow — Specification

HireFlow is an applicant tracking system (ATS) for small hiring teams — a minimal version of Workable. It covers one loop: **open a job → collect applicants → move them through a pipeline → hire or reject.**

Two audiences share the app. **Recruiters** run the pipeline; **candidates** browse open roles, apply with a CV, and track where their applications stand. Which one you are is decided at registration and enforced by route guards.

Status: prototype built on in-memory data. Authentication is mocked in `localStorage`. No backend yet.

---

## Goals

- Keep every candidate and job in one place, instead of inboxes and spreadsheets.
- Show the state of every pipeline on a single screen.
- Make the common actions fast — advancing a candidate should be one drag.
- Stay usable by hiring managers and interviewers, not just recruiters.
- Stay small enough for one team to build and run.

**Not building:** payroll or onboarding, paid job-board syndication, custom workflow builders, native mobile apps.

---

## Domain model

```
User ─(0..1)─ Candidate ──< Application >── Job
```

- **User** — an account: `id`, `fullName`, `email`, `role` (`recruiter | candidate`). Identity only; it holds no hiring data.
- **Job** — the role being hired for. `draft → open → on-hold → closed`. Only open jobs accept applications.
- **Candidate** — a person, independent of any role, and the candidate profile a signed-in applicant edits (skills, years of experience, CV). One record even if they apply twice. `userId` links it to an account, or stays `null` for someone a recruiter sourced.
- **Application** — links a candidate to a job, carrying the CV and cover letter submitted with it plus the recruiter's stage, rating and notes. This is what moves through the pipeline.

Pipeline stages: `applied → screening → interview → offer → hired`, with `rejected` reachable from anywhere. Everything a candidate submits enters at `applied`.

**Why `Candidate` is also the candidate profile:** a separate `CandidateProfile` table would duplicate the talent pool and force a join on every recruiter screen. Signing in as a candidate guarantees a `Candidate` record exists (claiming one already sourced under the same email), so an application lands in the recruiter's talent pool the moment it is submitted.

### Roles

| | Recruiter | Candidate |
| --- | --- | --- |
| Navigation | Dashboard · Jobs · Candidates · Pipeline | Jobs · My applications · Profile |
| Jobs | full CRUD, status changes | browse open roles, apply |
| Candidates | whole talent pool, CV, rating, notes | own profile only |
| Pipeline | move anyone between stages | sees own stage, read-only |

Both roles resolve `/jobs`, to different pages — recruiters get the requisition table, candidates the job board.

---

## MVP features

### Built

- **Accounts** — sign in, register as recruiter or candidate, session that survives a reload, role-aware navigation and route guards.
- **Jobs** — list with search and filters, detail page, create/edit form, status changes, delete.
- **Candidates** — searchable talent pool, profile page showing every application with its CV, cover letter, 1-5 rating and notes.
- **Pipeline** — drag-and-drop kanban across the six stages, filterable by job.
- **Dashboard** — headline counters, funnel by stage, recent activity.
- **Job board** — candidates browse open roles and apply in a dialog with a PDF CV and optional cover letter.
- **My applications** — candidates track their own submissions and stages; recruiter ratings and notes stay hidden.
- **Candidate profile** — headline, location, experience, skills and CV, editable by the candidate.
- **AI CV screening** — an uploaded PDF is parsed and scored against the job description on submission; the recruiter sees a rating, match score, summary, strengths, weaknesses, missing skills, a recommended next stage and suggested interview questions, and can re-run it.
- **Platform** — responsive layout, light/dark theme, lazy-loaded routes, deep links.

### Still needed to ship

- **Backend** — REST API and a database replacing the seed fixtures. Until then only accounts persist; jobs, candidates and applications reset on reload.
- **Real authentication** — the current `AuthService` compares passwords in the browser. Replace with a server session, hashed credentials and server-side authorisation.
- **Résumé storage** — uploads keep metadata and a per-tab object URL; the file itself needs object storage and signed links.
- **Public careers page** — applying currently requires an account. An unauthenticated apply flow is still the widest intake channel.
- **Richer roles** — hiring manager and interviewer sit between the two roles that exist today.
- **History** — a record of who moved what and when, alongside the notes that already exist.
- **Email** — application received, rejection, interview invitation.
- **Server-side search and pagination** — client-side filtering won't survive real data volumes.

---

## Future features

**Next:** a backend proxy for the Gemini call, so the API key leaves the bundle · scorecards for structured interview feedback · interview scheduling with calendar invites · in-app email threads per candidate · custom stages per job · bulk actions.

**Later:** job-board distribution (Indeed, LinkedIn) · referral portal · reporting on time-to-hire and source quality · branded careers page · screening questions.

**Eventually:** GDPR tooling (retention, export, erasure) · EEO reporting · blind screening · audit log · SSO · multi-organization support · offer approvals · public API.

---

## Architecture

**Today** — an Angular 20 single-page app with no server:

```
features/  (lazy routes, guarded by role)
    ↓
core/services/  (signal stores)   core/auth/  (AuthService + guards)
    ↓                                  ↓
core/data/seed-data.ts  (temporary fixtures)   localStorage  (session only)
```

Three stores — `JobStore`, `CandidateStore`, `ApplicationStore` — hold all state. Each keeps a private signal and exposes it read-only; everything derived is a `computed()`. Components read signals and call store methods; they never own domain state.

`ApplicationStore` joins the other two, producing applications with their job and candidate attached plus the stage buckets the kanban uses. Because those are computed, one stage change updates the board, the dashboard, and the candidate profile with no extra wiring.

### Access control

`AuthService` is a fourth signal store with a narrower job: it holds the current `User`, derives `role`, `isRecruiter`, `isCandidate` and `homeRoute`, and persists the account directory and session id to `localStorage`. `login` and `register` are `async` so replacing the two array lookups with `POST /auth/*` touches nothing else.

Three guards sit on the routes:

- `authGuard` — protects the shell, redirecting to `/login?returnUrl=…`.
- `roleGuard(...roles)` — protects pages that belong to one role, bouncing the other to its own home.
- `roleMatch(...roles)` — a `canMatch` variant, so `/jobs` can resolve to the recruiter list or the candidate job board without changing the URL.

Hiding a nav link is convenience; the guards are the enforcement — and once there is a server, they stop being the last word.

### AI seam

CV screening lives in `core/ai/`, split so that only one piece is provider-specific:

```
PDF → ResumeParserService → PromptBuilderService → IAiProvider → AiEvaluation
    → ApplicationStore.attachEvaluation()
```

- **`ResumeParserService`** extracts plain text with `pdfjs-dist`, loaded by dynamic `import()` so it stays out of the initial bundle. Its worker ships via an `assets` entry in `angular.json`.
- **`PromptBuilderService`** renders job title, description, requirements and CV text into a prompt. Pure and deterministic.
- **`IAiProvider`** (abstract class `AiProvider`, used as its own DI token) sends a prompt and returns the model's **raw text**. It never parses — `parseAiEvaluation` in `core/models` validates once for every provider, clamping ranges, unwrapping code fences and mapping invented stage names onto real `PipelineStage` values.
- **`AiEvaluationService`** orchestrates the above, holds per-application progress in a signal, and is the only AI class a component touches.

`GeminiAiProvider` is wired in `app.config.ts`. It sends the prompt to Google Gemini's `generateContent` endpoint, constrained with `responseSchema` so the model is schema-bound as well as instructed, and retries once if the response still comes back unreadable. `GeminiApiService` owns the transport and maps every failure onto a typed, user-safe message — those strings land verbatim on the evaluation card, so they never carry the key, the URL or the response body. The key comes from `environment.gemini.apiKey`; with none set, the provider delegates to `MockAiProvider`, which scores the extracted CV text against the job's requirements offline so a fresh clone still demonstrates the whole pipeline. **Swapping to OpenAI, Claude or Ollama means writing one class against `IAiProvider` and changing that one line.** Nothing else moves.

Screening runs automatically in the background when a candidate submits, and a recruiter can re-run it from the candidate profile. The finished `AiEvaluation` is stored on the `Application` along with the extracted `resumeText`, which is what makes a re-run work after a reload — by then the uploaded `File` and its object URL are both gone. `attachEvaluation` deliberately leaves `updatedAt` alone so background screening does not reorder the dashboard's recent activity.

**Target** — the same app against a real backend:

```
Careers page (public)  ─┐
Recruiter app          ─┼─→  REST API  ─→  PostgreSQL
                        ┘                  object storage (résumés)
                                           email service
```

The three stores are the only files that touch data, so swapping fixtures for HTTP is a contained change. `apiBaseUrlInterceptor` already prefixes relative URLs; `errorInterceptor` already surfaces failures.

### Key decisions

- **Zoneless change detection** — signals drive updates; `zone.js` is not installed.
- **Signal stores instead of NgRx** — the domain is three collections; Redux would be ceremony.
- **`OnPush` on every component.**
- **Lazy routes per feature** — the initial bundle carries only the shell.
- **Route params bound to signal inputs** — detail pages are a function of the URL, so deep links work for free.
- **Material 3 system variables only** — no hard-coded colors, so light and dark both work.
- **Typed non-nullable reactive forms.**
- **Mock auth in `localStorage`** — the only persisted state, and the only thing that has to be thrown away when real sessions arrive.
- **One `Candidate` record per person**, whether sourced or self-registered, so the recruiter's talent pool is never split.
- **AI kept behind an interface** before any AI exists, so adopting it is a provider swap rather than a UI rewrite.

### Requirements

- WCAG 2.1 AA, including a keyboard path for every drag-and-drop action.
- Authorization enforced on the server, not just hidden in the UI. The current guards are UI convenience and nothing more.
- Signed, expiring résumé URLs; rate-limited public application intake; no PII in logs.
- Candidate data must be exportable and deletable from day one.

---

## Folder structure

```
src/app/
├── app.ts · app.config.ts · app.routes.ts
│
├── core/                  # singletons — never a component
│   ├── ai/                # IAiProvider + mock, resume parser, prompt builder,
│   │                      # AiEvaluationService orchestrator
│   ├── auth/              # AuthService, auth/role/guest guards
│   ├── data/              # seed fixtures (delete once the API lands)
│   ├── interceptors/
│   ├── models/            # domain types and label tables
│   ├── services/          # the stores — the only data boundary
│   └── utils/
│
├── layout/shell/          # toolbar, nav drawer, content area
│
├── shared/                # reusable presentation — no store access
│   ├── pipes/
│   └── ui/                # page-header, empty-state, stat-card, status-chip,
│                          # confirm-dialog, rating-stars, resume-chip
│
└── features/              # one lazy bundle per route area
    ├── auth/              # login, register (outside the shell)
    ├── dashboard/         # recruiter
    ├── jobs/              # recruiter: job-list, job-detail, job-form
    ├── candidates/        # recruiter: candidate-list, candidate-detail
    ├── pipeline/          # recruiter
    ├── job-board/         # candidate: browse open roles + apply dialog
    ├── my-applications/   # candidate
    ├── profile/           # candidate
    └── not-found/
```

Planned: `features/careers/` (public, no account), `features/settings/`, `features/reports/`, `features/interviews/`.

**Rules**

1. `core/` holds singletons; `shared/` holds presentational components that never inject a store.
2. Features never import each other — shared code moves to `shared/` or `core/`.
3. Every feature is lazily loaded and owns its routes file.
4. Use path aliases (`@core/*`, `@shared/*`, `@features/*`), not `../../..`.
5. A component's `.ts`, `.html`, `.scss`, and `.spec.ts` live together.

---

## Open questions

1. Backend stack and hosting.
2. Single organization, or multi-tenant from the start? Retrofitting is expensive.
3. Fixed pipeline stages in v1, or configurable per job? This changes the schema.
4. Does the careers page need server rendering for SEO?
5. Email provider — and do we need inbound replies landing on the candidate record?
6. Do hiring manager and interviewer become roles, or per-job permissions on an existing account?
7. Can candidates apply without an account, and if so, when does the account get created?
8. ~~Does CV text extraction happen client-side or on the server?~~ **Client-side**, in `ResumeParserService`. ~~Which AI provider replaces `MockAiProvider`?~~ **Google Gemini**, called direct from the browser. Still open: an API key in `environment.ts` ships inside the bundle, so a production build needs the call proxied through our own backend — `GeminiConfig.baseUrl` is the seam for that, and until then the committed key stays empty.
