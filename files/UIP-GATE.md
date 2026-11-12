# REPORT-002 independent UIP gate

**PASS — no acceptance-breaking defect or introduced security, privacy, money, or data-loss defect found within this change.**

- Reviewed candidate: `1d07561f208078d5536c5d5ad058abc7c63c04f6`.
- Base: `origin/main` at `5f92fa76579961950d49c7411f54d5446516a708`.
- Checkout: `/workspace/run-orbit-sd-orbit-c-f178`; its HEAD matched the candidate and the working tree was clean when source review began.
- Gate completed: 2026-11-12T20:37:38+00:00 UTC by the fresh independent `uip_gate` reviewer.
- Authorized scope: the REPORT-002 Basis text link, the existing journey test extension, and related destination and authority paths. Cosmetics are follow-up and are not blockers for this gate.

## Reviewed change and source

The sole runtime change is in `src/core/features/dashboards/basis.tsx`: a semantic TanStack `Link` under the Report row in Basis. The remaining diff is the `newtests/t096/dashboard-access-proof.ts` extension, the journey title in `newtests/t096/report-disclosure.test.ts`, and regenerated file hashes in `sources.lock.json`.

Read the exact candidate diff and the supporting source in `dashboards/tiles.tsx`, `dashboards/page.tsx`, `dashboards/repository.ts`, `dashboards/dashboards.css`, `routes/app.reports.$id.tsx`, `reports/report-page.tsx`, `reports/sales-report.tsx`, `reports/catalog.ts`, `reports/reports.css`, `analytics/sales.css`, `analytics/report-routes.ts`, `analytics/sales-report.ts`, and `analytics/report-shares.ts`. Read `newtests/t096/browser-observations.ts` to understand screenshot, accessibility, and page-overflow evidence.

## Flow gate

1. **Owner opens a ready report tile's Basis — PASS.** Desktop and phone captures show an underlined, legible `Open report definition · v1` text link. The source supplies `/app/reports/$id` with `id=view.definitionId`, `version=view.definitionVersion`, and `from` and `through` equal to `view.period.fromMonth` and `throughMonth`. It does not select the newest version or reuse the dashboard's broader period for a saved tile.
2. **Owner opens the exact saved definition — PASS.** Both destination captures show the original report title, `Version 1 of 2`, and Oct–Dec 2026. The open Basis discloses the definition version, month period, timezone, currency, access, freshness, missing data, definitions, and source fields. The destination source explicitly consumes `search.version` and sends the selected version and month bounds to the preview endpoint. Opening the definition computes its current readable report; it does not claim to reopen the original saved snapshot.
3. **Reader opens Basis and the same saved version — PASS.** Desktop and phone captures preserve the text link and show the same version and month period at the destination. The destination retains limited-access disclosure and reader-visible totals; per-person groups and unavailable sources remain withheld. No hidden owner-specific deal names are visible in the reader captures inspected.
4. **Unavailable or unshared source — PASS.** Ready report rendering is the only tile path that mounts `DashboardBasis`; unavailable, loading, error, and forecast branches do not acquire this report-definition link. Both post-revocation captures show nine neutral unavailable tiles with no report names, values, Basis controls, or definition links.
5. **Previously visible link after source revocation — PASS within the evidence limits below.** The journey extension focuses the actual link, revokes the underlying report's share, activates the link, checks `Not found` with no `.sales-result`, and checks a direct preview request returns 403 with only an error field before producing the unavailable captures. Independently reviewed source confirms the destination reloads its permitted report catalog and the preview path calls `metrics.permit`, `shares.assertVisible`, and current source and access proof checks. The link adds navigation, not authority, and the existing backend fences remain in place.

## Readability, interaction, and reflow

The new control has visible text and native link semantics; an icon-only tooltip is not applicable. The existing Basis summary is a native details and summary control. The test extension exercises Enter to open Basis, Tab to focus the link, and Enter to navigate for every ready report tile, for owner and reader at both widths.

The changed Basis label is 13.5px, the linked detail inherits 14px with a 1.5 line height, and source-field text is 13.5px. Destination Basis labels and details are 14.5px. These meet the requested 13px minimum. The screenshots show the link and details wrapping inside the tile at 1440 and 390 CSS pixels. The Basis grid uses a shrinking detail column and `overflow-wrap:anywhere`; no added fixed width or no-wrap rule was introduced. There is no visible page-wide horizontal overflow in the inspected captures. Existing wide report tables use local horizontal scrolling; that pre-existing behavior is not an introduced defect from this link.

All ten inspected screenshot sidecars report zero serious or critical axe violations (and their recorded violations lists are empty). The capture helper asserts `document.documentElement.scrollWidth <= window.innerWidth` before saving each screenshot. These checks support this narrow gate and do not establish full accessibility compliance.

## Screenshots actually viewed

All ten files below were opened with `view_image` and visually inspected, including the changed desktop and phone screens. Paths are relative to `/home/agent/rer-consolidation/work/sd-orbit-c-f178/local-proof/REPORT-002/`. Hashes bind this report to the exact captures inspected.

| Screenshot | Pixels | SHA-256 | Serious or critical axe |
| --- | --- | --- | --- |
| `definition-link-owner-1440.png` | 1440 × 3707 | `931bc26abb9d4381f16081a08af20e00d42a895aed50a0807155138e09f74db8` | 0 |
| `definition-link-owner-390.png` | 390 × 6924 | `2a3e3708b22111e89b13387f5950d59b830ae6199d52bbbb5d44fe192a1a3c93` | 0 |
| `definition-owner-1440.png` | 1440 × 6887 | `71ed94f84ea87069345834adda6a177473a3f7ed8056f2db4dbcd86cf95c3b28` | 0 |
| `definition-owner-390.png` | 390 × 11250 | `c70016b357ef450ddb0764697cf95b2114ed1ac8343c0a19d140da2434f64a63` | 0 |
| `definition-link-reader-1440.png` | 1440 × 3682 | `b28fe95d0411031ccc281fce2c84c97e42f1e2ffee72b5b2ee47242e5934bc2e` | 0 |
| `definition-link-reader-390.png` | 390 × 5983 | `5ebd1597b396e512f43a0f36b9b5f5a7c06844d3e2dfad5aafd536a4ccc73abf` | 0 |
| `definition-reader-1440.png` | 1440 × 5795 | `b9037b26a21a664a206dcd1b3c1715b941aee41a72c27667312388ac9d11ec46` | 0 |
| `definition-reader-390.png` | 390 × 9839 | `bf768c266436ec93e256db3fb8169ad26ba1fe8203904723b729e4362c797602` | 0 |
| `source-no-longer-shared-1440.png` | 1440 × 1284 | `6c6f5914abe7b41005b2bc3d329301bcc5ed260ed2de050cb40164f51d4986cc` | 0 |
| `source-no-longer-shared-390.png` | 390 × 2882 | `bedb868ac550e58bd78c7bfb92dc096443e1ccdbe6bc5c8f2401a1f6f5912d8b` | 0 |

## Findings and limitations

**Blocking findings: none.** No product edit is requested by this gate. No cosmetic issue is promoted to a blocker.

This was an independent read-only source and visual-evidence review, using screenshots produced by the parent's current candidate journey. The parent confirmed the added native preview refusal and unavailable-link absence assertions completed at this candidate; unrelated downstream assertions were still running when the gate was written. The reviewer did not edit product files, start another product suite, independently repeat browser interaction or revocation requests, use GitHub, commit, push, or use 12ui. Only this gate report was written. The dynamic keyboard, version and period comparisons, direct denial response, and revocation transition are supported by the reviewed journey sequence and its captures rather than a second execution by this reviewer. There is no separate screenshot of the transient Not found destination after revocation. This report does not claim full repository, release, performance, screen-reader, cross-browser, or accessibility acceptance. It applies only to the candidate SHA and evidence listed above; unrelated baseline behavior is outside the gate.
