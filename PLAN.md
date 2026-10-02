# ALITE — Data Processing, Statistical Analysis, Visualization & Report Platform

Plan for a full build (all 7 phases), phased commits, **deployable on Vercel**.
Working dir: `C:\Users\user\OneDrive\Desktop\ALITE\data` (currently empty, not a git repo).

---

## 0. Decisions locked in (from your answers)

| Decision | Choice |
|---|---|
| Scope | Full build, one commit (or small commit group) per phase |
| Stack | Next.js + Neon Postgres |
| Auth | **Hand-rolled email + password** (bcryptjs + DB session cookie). No Better Auth, no Google, no email codes |
| AI | **Groq only** (`groq-sdk`) — interpretation, never calculation |
| Stats engine | Deterministic TypeScript (server-side) |
| Report exports | PDF + DOCX + PPTX, delivered early (not deferred) |
| Billing/pricing | **Out of scope for now** (no Stripe, no plans/limits page) |
| Deployment | **Vercel** (added later) — everything below is built Vercel-compatible from Phase 0 |
| Responsiveness | **All devices** — mobile + tablet + desktop, responsive-first from Phase 0 (not a retrofit) |

## 1. Verified technology stack

Research done against current (Oct 2026) package state — three gotchas found and handled:

| Layer | Choice | Why / gotcha |
|---|---|---|
| Framework | Next.js App Router, TypeScript, Tailwind CSS | Spec default. `create-next-app@latest` |
| UI kit | shadcn/ui (cards, tabs, dialogs, toasts, drawers, tooltips) + TanStack Table | Matches spec §68 UI requirements |
| DB | Neon Postgres, `@neondatabase/serverless` + Drizzle ORM (`drizzle-orm` stable, **not** the 1.0 RC) + `drizzle-kit` migrations | Serverless HTTP driver works locally and on Vercel |
| Auth | Hand-rolled: `bcryptjs` + `sessions` table + httpOnly cookie; `middleware.ts` guards app routes | No framework needed for email/password only |
| Excel/CSV read+write | SheetJS **installed from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`**, tarball vendored into `/vendor` | Gotcha #2: npm registry `xlsx` is stuck at 0.18.5 (known registry bug). CDN is authoritative |
| CSV parsing | `papaparse` (delimiter + encoding + header detection) | Spec §6 |
| Stats engine | `simple-statistics` (descriptives, regression, CI) + `jstat` (t/χ²/F distributions → p-values) + custom-written tests (Mann-Whitney, Kruskal-Wallis, Wilcoxon, Spearman, effect sizes, assumption checks) | Gotcha #3: neither lib alone covers the spec's test list; combine + write the rest. Zero-dep, pure TS, runs in API routes |
| Charts | Recharts | Spec §84. Bar/column/line/area/pie/donut/histogram/box/scatter/heatmap/stacked/grouped/radar |
| Reports | **DOCX:** `docx`. **PPTX:** `pptxgenjs` (native charts + tables). **PDF:** Chromium print-render of the HTML report — locally via `puppeteer-core`, on Vercel via `@sparticuz/chromium` (serverless-compatible), with a print-CSS fallback | HTML report preview is the single source; all three formats early per your call |
| AI | `groq-sdk` — interpretation only, never calculation (spec §73–75) | Structured verified result JSON → AI text → stored with evidence refs |
| Validation | `zod` on every API boundary | Spec §85 |
| Testing | `vitest` — statistical engine tested against published R/scipy known values | Non-negotiable: numbers must be provably correct |
| Lint/format | ESLint + Prettier (create-next-app defaults) | — |

**Not using:** Docker (not installed), local Python sidecar (you chose pure TS).

## 1b. Vercel deployment model (design constraint from day 1)

The app must deploy to Vercel with **no architecture rework** at the end. Constraints applied from Phase 0:

| Vercel constraint | Design response |
|---|---|
| Serverless functions, no persistent disk | Raw uploads go **client → Vercel Blob** (direct upload, bypasses the 4.5 MB function body limit), server parses from Blob. Local dev fallback: `/storage/uploads` when `BLOB_READ_WRITE_TOKEN` is absent. Parsed data lives in Neon (jsonb), never on disk |
| Function time limits | All engine work is in-memory on ≤100k rows (well under limits). Heavy routes declare `export const runtime = 'nodejs'` + `maxDuration`. AI calls stream |
| PDF generation | `@sparticuz/chromium` + `puppeteer-core` (serverless Chromium, ~70 MB, fits function bundle). Print-CSS fallback if Chromium is blocked. DOCX/PPTX are pure JS — unaffected |
| DB connections | Neon pooled mode via `@neondatabase/serverless`; migrations run locally/CI (`drizzle-kit migrate`), never at runtime |
| Rate limiting | Neon-backed counter table (no extra service) |
| Secrets | `.env.example` locally; same names pasted into Vercel project env vars (production + preview) |
| Git | `git init` from Phase 0; deploy via **Vercel Git integration** (push → preview deploy; main → production). Vercel CLI also works if you'd rather not use GitHub |

**Deploy check runs at the end of every phase:** `npm run build` must pass (this is what Vercel runs).

## 1c. All-device responsiveness (design constraint from day 1)

Mobile-first Tailwind — no desktop-only screens anywhere. Every screen is verified at **360 / 768 / 1280 / 1920 px** before its phase commit.

| Concern | Approach |
|---|---|
| App shell | Sidebar ≥ lg, **bottom nav** + hamburger drawer < lg (spec §66) |
| Data tables | TanStack Table; on mobile → responsive **card/stack view** (never a squeezed table), sticky first column on tablet |
| Filters / sorting wizard | Full panel on desktop; **bottom-sheet/drawer** with collapsible sections on mobile |
| Charts | Recharts `ResponsiveContainer`; mobile = swipeable carousel (spec §66), tap-to-inspect instead of hover, fullscreen button |
| Forms / import | Touch targets ≥ 44 px, native date/pickers, paste-to-grid works with mobile keyboard |
| Report preview | Reflows like a document; pinch-zoom page preview; sections collapse |
| Navigation | Spec §69 tree identical on all sizes, just different presentation |
| Interaction | Hover-only affordances always have tap/focus equivalents; tooltips on touch = tap |
| Testing | Playwright viewport smoke tests (360/768/1280) added in Phase 0, run each phase |


## 2. Architecture

```
Browser (React, shadcn, Recharts, TanStack Table)
   │  server actions / route handlers (zod-validated, auth-checked)
   ▼
Next.js server
   ├── engines/           ← deterministic, pure functions, unit-tested
   │     ├── data        type detection, quality scoring, cleaning ops,
   │     │               sort/filter/group/split/transform/recode/formula
   │     ├── stats        descriptives, frequencies, crosstabs,
   │     │               hypothesis tests, effect sizes, assumptions, CI
   │     └── charts       auto chart selection + config builder
   ├── ai/                ← consumes engine output ONLY (structured JSON)
   ├── reports/           report assembly → PDF / DOCX / PPTX
   ▼
Neon Postgres (Drizzle)
```

**Hard rule (spec §105):** every number the user sees originates in `engines/`. AI gets the verified JSON and writes prose. AI output is rejected if it references a statistic not present in the input JSON.

### Storage model (key decision)

Datasets are **not** exploded into one SQL row per record. Instead:

- `dataset_versions.rows` = `jsonb` (array of row objects), `columns` = `jsonb` (metadata/dictionary)
- Every processing operation creates a **new version** with a recorded operation → gives undo/redo, versioning, compare, restore, reproducibility (spec §58–60) for free
- Engine loads version → operates in memory → persists result version. Fast for survey-scale data (≤100k rows); raw uploaded file kept on disk under `/storage/uploads` for reproducibility
- Analysis results, tests, charts, findings stored as structured `jsonb` rows (spec §80–83)

### Core schema (Drizzle, ~25 tables)

`users, sessions` (hand-rolled auth)
+ app tables:
`projects, datasets, dataset_versions, data_operations, analysis_sessions, analysis_results, statistical_tests, charts, findings, report_templates, reports, report_sections, report_versions, notifications, comments, audit_logs, practice_datasets, practice_challenges, saved_calculations (Ask-Your-Data history)`

Migrations via `drizzle-kit generate` → committed per phase.

## 3. App structure (routes)

```
app/
  (auth)/sign-in, sign-up
  (app)/
    dashboard
    projects/[id]/
      data/        import · preview · dictionary · quality · cleaning
                   processing · sorting · filtering · splitting · transform
      analysis/    overview · variables · questions · descriptives · survey
                   tests · cross · comparison · relationships · trends · text
      charts/      list · builder/[chartId]
      insights/    ai · findings · ask
      reports/     builder/[reportId] · generate · history
      settings/    project · history · versions
    practice/      datasets · challenges/[id] · guided
    search, notifications, settings/(account|security)
  api/             auth (sign-in/sign-up/logout/session) · import · export · stats · ai · reports
components/        ui/ (shadcn) · data/ · analysis/ · charts/ · reports/
engines/           data/ · stats/ · charts/      ← pure + vitest
lib/               db/ · auth/ · ai/ · storage/ · audit/
```

Navigation = spec §69 exactly (sidebar desktop, bottom nav mobile).

## 4. Phases → commits

Each phase ends with: `npm run lint && npm run typecheck && npx vitest run` green, then one commit (grouped where a phase is very large).

### Phase 0 — Foundation (commits: 2)
1. `chore: scaffold next.js + tailwind + eslint + vitest + git`
   - git init, `.gitignore`, `.env.example` (`DATABASE_URL`, `GROQ_API_KEY`, `NEXT_PUBLIC_APP_URL`)
2. `feat(auth,db): neon + drizzle schema + email/password auth`
   - `users` + `sessions` tables + migrations, bcryptjs hashing, sign-in/sign-up/logout, session cookie, middleware route guard, audit log helper

**Needs from you before/during this phase:** Neon project + `DATABASE_URL`, Groq API key.

### Phase 1 — Data foundation (commits: 5) = spec Phase 1
3. `feat(projects): dashboard + project CRUD + activity feed`
4. `feat(import): csv/xlsx import, manual entry grid, copy-paste, import preview`
   - SheetJS CDN tarball vendored, papaparse, workbook/worksheet/header-row/range selection, preview (rows/cols/types/missing/dupes) → Import/Cancel
5. `feat(types): automatic data type + measurement level detection, data dictionary`
   - 14 types (text/integer/decimal/currency/percentage/date/datetime/boolean/multichoice/likert/rating/id/email/phone/open-text), override, "why classified this way", recommended methods
6. `feat(quality): data quality center with transparent score`
   - completeness/validity/consistency/uniqueness breakdown, every detected issue shown with its contribution to the score
7. `feat(processing): cleaning + sort/filter/group/split/transform + history + undo/redo + export`
   - All spec §11–18 operations, 5-step sorting wizard (multi-level → order → separation → preview → apply), filter builder with AND/OR/NOT, operation log, CSV/XLSX/ZIP export (all/rows/columns/per-group)

### Phase 2 — Analysis core (commits: 4) = spec Phase 2
8. `feat(stats): deterministic engine — descriptives, frequencies, crosstabs` (+ vitest known-value fixtures)
9. `feat(analysis): analysis workspace + automatic analysis + question-by-question`
   - All §22–26 content incl. Likert handling with ordinal caveats
10. `feat(charts): auto chart selection + chart builder + explain-chart`
    - Recharts, all §43 types, hover/zoom/filter/fullscreen/download/export-data, "why this chart" reasoning (deterministic, not AI)
11. `feat(analysis): cross / comparison / relationship / trend modules`

### Phase 3 — Statistical engine (commits: 3) = spec Phase 3
12. `feat(stats): hypothesis tests + effect sizes + CI + assumption checks`
    - t-test (independent/paired), Mann-Whitney, ANOVA, Kruskal-Wallis, Wilcoxon, χ², Fisher, Pearson/Spearman, linear + multiple regression; normality (Shapiro-Wilk), Levene, expected counts, VIF, linearity; Cohen's d / η² / Cramér's V / r; every result carries statistic, df, p, CI, effect size, assumptions, decision rule, limitations
13. `feat(stats): statistical test assistant` — natural-language intent → inspects real data + assumptions → recommends method with visible why/warnings (spec §100)
14. `feat(stats): p-value + assumption explanation components` (accurate, no "probability hypothesis is true")

### Phase 4 — Reports, all 3 formats (commits: 3)  ← pulled forward per your choice
15. `feat(reports): report builder + templates + preview editor`
    - All §49 sections, 11 templates, customization (logo/colors/fonts/author/header/footer/page numbers/TOC/reorder), document-style editor
16. `feat(reports): one-click full report generator`
    - §50 pipeline: inspect → variables → quality → analyses → charts → findings → sections, every claim linked to engine evidence
17. `feat(export): PDF + DOCX + PPTX export` (Puppeteer / docx / pptxgenjs) + Excel multi-sheet export (spec §95)

### Phase 5 — AI layer (commits: 4) = spec Phase 4
18. `feat(ai): explain-this for every statistic, question and chart` + statistical learning center + "Show Me How" (§27–30, §44)
19. `feat(ai): AI insights + findings center` (evidence-linked, §45–46)
20. `feat(ai): ask your data` — NL → variable ID → deterministic calc → result + evidence + view-calculation (§47–48)
21. `feat(ai): text analysis` (keywords, word freq, themes, sentiment, editable/traceable classifications, §39–40) + analysis & report-writing copilots (§92–93)

### Phase 6 — Platform (commits: 4)
22. `feat(collab): comments, notifications, sharing` (single-user for now — owner-only roles) (§62–64)
23. `feat(practice): built-in datasets + challenges + guided analysis + analysis plan generator` (§54–57)
24. `feat(history): dataset versioning/compare/restore + reproducibility records + audit log viewer + global search` (§58–60, §65, §86–88)
25. `feat(ui): beginner/advanced mode toggle, empty/loading/error states` (§90–91, §97–99)
    *(responsiveness is not a phase — every prior phase already ships mobile-first; this commit is the final cross-device QA sweep + touch polish)*

### Phase 7 — Ship to Vercel (commits: 2)
26. `chore(vercel): blob upload path, node runtime/maxDuration, env docs`
    - Vercel Blob storage adapter with local-disk fallback, README with deploy steps
27. `chore(deploy): production verification + README`
    - Push → preview deploy → full smoke test on the live URL: sign up (email + password), import CSV/Excel, clean, analyze, chart, generate report, download PDF/DOCX/PPTX, all on phone + desktop viewports

## 5. Verification (every phase)

- `npx vitest run` — stats engine checked against published reference values (R/scipy worked examples)
- `npm run lint && npm run typecheck && npm run build` (build = what Vercel runs)
- Viewport smoke at 360 / 768 / 1280 px on every new screen (Playwright)
- Manual smoke: import a CSV end-to-end through the phase's new screens
- Final: practice dataset → full pipeline → PDF/DOCX/PPTX open correctly, on phone and desktop

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| SheetJS npm version stale/vulnerable | Vendored CDN tarball (`/vendor/xlsx-0.20.3.tgz`) |
| Stats correctness | Vitest fixtures with known values; no AI in the number path |
| AI inventing numbers | Input = verified JSON only; output validated against allowed statistic keys |
| Chromium PDF on Vercel | `@sparticuz/chromium` designed for serverless; print-CSS fallback path tested in Phase 4 |
| File uploads > 4.5 MB Vercel body limit | Client → Vercel Blob direct upload, server parses from Blob |
| Vercel function timeouts on big imports | `maxDuration` set per route; parsing chunked; job queue + cron for syncs |
| Neon/Groq credentials | `.env.example` committed; app runs with clear empty-state messages until keys added (AI features degrade gracefully, not crash) |
| Large datasets (100k+ rows) | jsonb version storage + server-side ops; pagination/virtualization in TanStack Table; document limit |
| Responsive regressions | Viewport smoke tests in CI-style check each phase, not a late mobile pass |

## 7. What I need from you (can be gathered during Phase 0)

1. Neon account → `DATABASE_URL` (free tier fine)
2. Groq API key (console.groq.com)
3. Vercel account (+ GitHub repo for Git integration, or we deploy via Vercel CLI)
4. App name/branding preference for reports — **settled: "Analytica"**

## 8. Out of scope (unless you say otherwise)

- Google (OAuth, Sheets/Drive import, live sync) — plain file upload only
- Billing/pricing/Stripe plans and limits
- Email sending of any kind (no verify/reset codes, no Resend)
- Better Auth / Auth.js — auth is hand-rolled email + password
