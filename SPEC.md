# HireFlow — Specification

HireFlow is an applicant tracking system (ATS) for small hiring teams — a minimal version of Workable. It covers one loop: **open a job → collect applicants → move them through a pipeline → hire or reject.**

Status: prototype built on in-memory data. No backend yet.

---

## Goals

- Keep every candidate and job in one place, instead of inboxes and spreadsheets.
- Show the state of every pipeline on a single screen.
- Make the common actions fast — advancing a candidate should be one drag.
- Stay usable by hiring managers and interviewers, not just recruiters.
- Stay small enough for one team to build and run.

**Not building:** payroll or onboarding, AI résumé scoring, paid job-board syndication, custom workflow builders, native mobile apps.

---

## Domain model

```
Job ──< Application >── Candidate
```

- **Job** — the role being hired for. `draft → open → on-hold → closed`. Only open jobs accept applications.
- **Candidate** — a person, independent of any role. One record even if they apply twice.
- **Application** — links a candidate to a job. This is what moves through the pipeline.

Pipeline stages: `applied → screening → interview → offer → hired`, with `rejected` reachable from anywhere.

---

## MVP features

### Built

- **Jobs** — list with search and filters, detail page, create/edit form, status changes, delete.
- **Candidates** — searchable talent pool, profile page showing all of a person's applications.
- **Pipeline** — drag-and-drop kanban across the six stages, filterable by job.
- **Dashboard** — headline counters, funnel by stage, recent activity.
- **Platform** — responsive layout, light/dark theme, lazy-loaded routes, deep links.

### Still needed to ship

- **Backend** — REST API and a database replacing the seed fixtures.
- **Accounts** — login, plus roles: admin, hiring manager, interviewer.
- **Careers page** — public job list and application form. This is the main way applications arrive.
- **Résumé upload** — PDF/DOCX stored and linked to the candidate.
- **Notes and history** — comments per application, and a record of who moved what and when.
- **Email** — application received, rejection, interview invitation.
- **Server-side search and pagination** — client-side filtering won't survive real data volumes.

---

## Future features

**Next:** scorecards for structured interview feedback · interview scheduling with calendar invites · in-app email threads per candidate · custom stages per job · bulk actions.

**Later:** job-board distribution (Indeed, LinkedIn) · referral portal · reporting on time-to-hire and source quality · branded careers page · screening questions.

**Eventually:** GDPR tooling (retention, export, erasure) · EEO reporting · blind screening · audit log · SSO · multi-organization support · offer approvals · public API.

---

## Architecture

**Today** — an Angular 20 single-page app with no server:

```
features/  (lazy routes)
    ↓
core/services/  (signal stores)
    ↓
core/data/seed-data.ts  (temporary fixtures)
```

Three stores — `JobStore`, `CandidateStore`, `ApplicationStore` — hold all state. Each keeps a private signal and exposes it read-only; everything derived is a `computed()`. Components read signals and call store methods; they never own domain state.

`ApplicationStore` joins the other two, producing applications with their job and candidate attached plus the stage buckets the kanban uses. Because those are computed, one stage change updates the board, the dashboard, and the candidate profile with no extra wiring.

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

### Requirements

- WCAG 2.1 AA, including a keyboard path for every drag-and-drop action.
- Authorization enforced on the server, not just hidden in the UI.
- Signed, expiring résumé URLs; rate-limited public application intake; no PII in logs.
- Candidate data must be exportable and deletable from day one.

---

## Folder structure

```
src/app/
├── app.ts · app.config.ts · app.routes.ts
│
├── core/                  # singletons — never a component
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
│   └── ui/                # page-header, empty-state, stat-card,
│                          # status-chip, confirm-dialog
│
└── features/              # one lazy bundle per route area
    ├── dashboard/
    ├── jobs/              # job-list, job-detail, job-form
    ├── candidates/        # candidate-list, candidate-detail
    ├── pipeline/
    └── not-found/
```

Planned: `core/auth/`, `features/careers/` (public), `features/settings/`, `features/reports/`, `features/interviews/`.

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
