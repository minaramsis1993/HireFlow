# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

HireFlow — an applicant tracking system (ATS), a minimal Workable. Angular 20 SPA, standalone components, zoneless, Angular Material 3, SCSS.

**There is no backend.** All data comes from in-memory fixtures in `src/app/core/data/seed-data.ts`, held by three signal stores. Product scope, roadmap, and domain model live in `SPEC.md` — read it before adding a feature; update it when scope changes.

Domain in one line: `Job ──< Application >── Candidate`. The **Application** is what moves through the pipeline (`applied → screening → interview → offer → hired`, plus `rejected`).

## Commands

```bash
npm start                # dev server, http://localhost:4200
npm run build            # production build
npm run test:ci          # single headless run — use this, not `npm test` (watch mode)
npm run lint             # ESLint over .ts and .html
npm run format           # Prettier over src/

# one spec file
npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/path/to/file.spec.ts
```

Before saying work is done, run **`npm run lint && npm run build && npm run test:ci`**. The build is the type-check — templates are only type-checked there, not by the editor.

## Architecture rules

```
features/  →  core/services/ (signal stores)  →  core/data/seed-data.ts
```

1. **`core/` holds singletons** — stores, models, interceptors, guards, utils. Never a component.
2. **`shared/` holds presentational components** — inputs and outputs only. A `shared/` component must never inject a store.
3. **`features/` never import each other.** If two features need the same thing, it moves to `shared/` or `core/`.
4. **Stores are the only data boundary.** Components never fetch, never hold domain state. When the API lands, only the three store files change.
5. **Every feature is lazily loaded** via `loadComponent`/`loadChildren` and owns a `*.routes.ts`.
6. **Path aliases only** — `@core/*`, `@shared/*`, `@layout/*`, `@features/*`, `@env/*`. Never `../../..`.
7. **Colocate** a component's `.ts`, `.html`, `.scss`, `.spec.ts` in one folder.

### Store pattern

Follow the existing shape exactly (`core/services/job-store.ts`):

```ts
@Injectable({ providedIn: 'root' })
export class ThingStore {
  private readonly state = signal<readonly Thing[]>(SEED_THINGS);
  readonly things = this.state.asReadonly();          // expose read-only
  readonly open = computed(() => ...);                 // derive, never duplicate
  byId(id: string) { return this.state().find(...); }  // reactive when called in a computed
  add(draft: ThingDraft): Thing { this.state.update(...); }
}
```

Mutations go through methods that `update()` the signal immutably. Never mutate an array or object in place — nothing will re-render.

## Angular 20 conventions

This project uses current-generation Angular. Older patterns will fail review or fail to compile.

| Use | Not |
| --- | --- |
| `signal()` / `computed()` for state | `BehaviorSubject` for component state |
| `input()`, `input.required()` | `@Input()` |
| `output()` | `@Output() EventEmitter` |
| `inject(Service)` | constructor parameter injection |
| `@if` / `@for` / `@let` / `@empty` | `*ngIf`, `*ngFor`, `NgIf`, `NgForOf` |
| typed `FormBuilder.nonNullable` forms | `ngModel`, untyped forms |
| `toSignal()` at RxJS boundaries | manual `subscribe()` in components |

- **Naming:** files are `job-list.ts` exporting `class JobList`. No `.component.ts` suffix — that's the v20 style and the whole repo follows it.
- **Every component sets `ChangeDetectionStrategy.OnPush`.** No exceptions.
- Small presentational components use inline `template:`; feature pages use `templateUrl`.
- Route params bind to signal inputs via `withComponentInputBinding()` — a detail page declares `readonly id = input.required<string>()` and derives everything with `computed()`. Don't inject `ActivatedRoute` for params.

## Hard-won gotchas

These cost time already. Don't rediscover them.

- **Zoneless.** `zone.js` is not installed and `provideZonelessChangeDetection()` is on. Never re-add zone.js. State that isn't in a signal won't trigger a render.
- **No `@angular/animations`.** Material 20 animates with CSS. Don't add `provideAnimationsAsync()` — it fails the build with an unresolved `@angular/animations/browser` import.
- **Material button syntax is the v19+ API:** `matButton`, `matButton="filled"`, `matButton="outlined"`, `matIconButton`. Not `mat-raised-button` / `mat-flat-button` / `mat-icon-button`.
- **`mat-table` row context is `any`.** Indexing a typed `Record` in the template (`labels[row.status]`) fails with TS7053. Add a typed helper method on the component and call that instead — see `statusLabel()` in `job-list.ts`.
- **Don't put `<mat-menu>` inside projected content.** `PageHeader` projects only `[actions]`; anything else is dropped. Keep the menu as a sibling after `</app-page-header>` — the template reference still resolves. See `job-detail.html`.
- **Target is ES2022:** no `toSorted`, `toSpliced`, `findLast` on arrays. Use `[...arr].sort()`.
- **Production bundle budget is 750 kB initial.** Anything imported by `app.config.ts` or an interceptor lands in the eager bundle — that's why `NotificationService` (Material snackbar) is already there. Check `npm run build` output before adding eager dependencies.

## Styling

- **Only Material 3 system variables** — `var(--mat-sys-primary)`, `--mat-sys-surface-container-low`, `--mat-sys-on-surface-variant`, `--mat-sys-outline-variant`, `var(--mat-sys-body-medium)` for type. **Never hard-code a hex color**; light and dark themes both have to work, and `ThemeService` flips `color-scheme` at runtime.
- Semantic colors go through `shared/ui/status-chip/tone.ts` (`neutral | info | success | warning | danger`). Add mappings there, not ad-hoc CSS.
- Reuse the shared primitives before writing markup: `PageHeader`, `EmptyState`, `StatCard`, `StatusChip`, `confirmAction()` from `confirm-dialog`, and the `timeAgo` pipe.
- Component styles are scoped SCSS in the colocated file. Global styles belong in `src/styles.scss` and should stay rare.

## Testing

- TestBed configs **must** include `provideZonelessChangeDetection()`. Add `provideRouter([])` for anything using `routerLink`.
- Use `await fixture.whenStable()` after an interaction. `detectChanges()` alone doesn't flush signal updates reliably in zoneless.
- Set required signal inputs with `fixture.componentRef.setInput('id', value)`.
- Cover new stores with unit specs, and new feature pages with a component spec that renders the real template — that's what catches Material and CDK wiring problems. Existing examples: `job-store.spec.ts`, `job-list.spec.ts`, `pipeline.spec.ts`, `candidate-detail.spec.ts`.

## Don't

- Add NgRx, Akita, or another state library — three signal stores are the deliberate choice.
- Add a UI or CSS framework alongside Material (no Tailwind, no Bootstrap).
- Reintroduce `zone.js`, `NgModule`s, or `*ngIf`-era syntax.
- Put business logic in `shared/`, or components in `core/`.
- Wire components directly to `seed-data.ts` — always go through a store.
- Hard-code colors, or bypass `tone.ts` for status colors.
- Commit unless asked.
