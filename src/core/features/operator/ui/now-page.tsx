import './now-page.css';
import {SetupLine,readOnboarding} from './setup-line';
import {ReviewLine,readReviewSummary} from './review-line';
import {FilterButton,FilterChips,FilterPanel,useFilterPanel,type FilterField} from './filter-panel';
import { useCallback, useRef, useState } from "react";
import { useHashMap } from "./hash-target";
import { Link } from "@tanstack/react-router";

import { formatDateTime, label } from "./formatters";
import { operatorApi } from "./operator-api";
import { OperatorShell, OperatorState } from "./operator-shell";
import { useOperatorResource } from "./use-operator-resource";

// Notification links stored before tasks had their own page read /app#sales-task-<id> (or #sales-tasks).
function storedTaskLink(hash: string) {
  if (hash === "sales-tasks") return "/app/tasks";
  const id = /^sales-task-([0-9A-HJKMNP-TV-Z]{26})$/.exec(hash)?.[1];
  return id ? `/app/tasks/${id}` : null;
}
/** "8 deals", or while filtered "3 of 8 deals"; the queue holds at most the first 50. */
function countLine(shown: number, total: number | null, filtered: boolean) {
  const deals = (count: number) => `${count} ${count === 1 ? "deal" : "deals"}`;
  if (!filtered) return shown >= 50 ? "First 50 deals" : deals(shown);
  if (total === null) return deals(shown);
  return total >= 50 ? `${shown} of the first 50 deals` : `${shown} of ${deals(total)}`;
}

/** NOW: the deals that need the operator, highest score first, with one Filter; a line above the queue only while
 * something waits for review or setup steps remain. */
export function NowPage({ initialData }: { initialData?: Awaited<ReturnType<typeof import("../../../app/loaders").loadNow>> }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const owner = filters.owner ?? "", stage = filters.stage ?? "", band = filters.band ?? "";
  const filtersKey = `${owner}:${stage}:${band}`;
  const loadNow = useCallback(async () => {
    const [{ facets, opportunities }, { presentation }] = await Promise.all([
      operatorApi.listNow({ band: band || undefined, ownerId: owner || undefined, stageId: stage || undefined }),
      operatorApi.readWorkspacePresentation()
    ]);
    return { facets, opportunities, presentation, filtersKey };
  }, [band, owner, stage, filtersKey]);
  const resource = useOperatorResource(`now:${filtersKey}`, loadNow, initialData ? { ...initialData, filtersKey: "::" } : undefined);
  const onboarding = useOperatorResource('onboarding', useCallback(readOnboarding, []));
  const review = useOperatorResource('review-summary', useCallback(readReviewSummary, []));
  const panel = useFilterPanel();
  useHashMap(storedTaskLink);
  const currentResults = resource.data?.filtersKey === filtersKey;
  // While a new filter loads, the rows already shown stay in place rather than blanking.
  const opportunities = resource.data?.opportunities ?? [];
  const loading = !resource.error && (resource.loading || !currentResults);
  const filtered = Boolean(owner || stage || band);
  // The unfiltered count, kept from the last unfiltered read, so a filtered row can say "3 of 8 deals".
  const total = useRef<number | null>(null);
  if (resource.data?.filtersKey === "::") total.current = resource.data.opportunities.length;

  const facets = resource.data?.facets;
  const showOwners = new Set(opportunities.map(opportunity => opportunity.ownerId)).size > 1;
  const fields: FilterField[] = [
    // Owner only when the queue's deals have more than one owner, so the choice is never a single option.
    ...(facets && facets.owners.length > 1 ? [{ field: "owner", name: "Owner", selectLabel: "Filter by owner", all: "All owners", options: facets.owners.map((item) => ({ id: item.id ?? "unassigned", name: item.name ?? "Unassigned" })) }] : []),
    { field: "stage", name: "Stage", selectLabel: "Filter by stage", all: "All stages", options: facets?.stages ?? [] },
    { field: "band", name: "Band", selectLabel: "Filter by band", all: "All bands", options: (facets?.bands ?? []).map((item) => ({ id: item, name: label(item) })) },
  ];
  const change = (field: string, value: string) => setFilters({ ...filters, [field]: value });

  return (
    <OperatorShell title="NOW">
      <section className="operator-queue now-queue" aria-label="NOW" data-testid="now-queue">
        <div className="now-queue__head">
          <p role="status">{resource.data ? `${countLine(opportunities.length, total.current, resource.data.filtersKey !== "::")} · highest score first` : null}</p>
          <FilterButton panel={panel} applied={Object.values(filters).filter(Boolean).length} />
        </div>
        <FilterPanel panel={panel} fields={fields} values={filters} onChange={change} className="now-queue__filters" />
        {filtered ? <div className="now-queue__chips"><FilterChips fields={fields} values={filters} onChange={change} valueName={label} /><button type="button" className="operator-text-button" onClick={() => setFilters({})}>Clear filters</button></div> : null}
        <ReviewLine summary={review.data} />
        {onboarding.error ? <OperatorState kind="error">{onboarding.error.message}</OperatorState> : <SetupLine state={onboarding.data} />}
        {resource.error ? <OperatorState kind="error">{resource.error.message}</OperatorState> : null}
        {!loading && !resource.error && opportunities.length === 0 ? <div className="operator-state">{filtered ? <><h2>No customers match these filters</h2><button type="button" onClick={() => setFilters({})}>Clear filters</button></> : <><h2>No customers need attention yet</h2>{onboarding.data ? <>{onboarding.data.records ? <a href="/app/opportunities">View customer records</a> : <a href="/app/opportunities/new">Add your first customer</a>} · </> : null}<a href="/demo">See an example</a></>}</div> : null}
        <ol className="operator-queue__list" aria-busy={loading}>
          {opportunities.map((opportunity, index) => (
            <li className="operator-queue-card" key={opportunity.id}>
              <Link aria-label={`Open ${opportunity.title}`} to="/app/opportunities/$id" params={{ id: opportunity.id }}>
                <span className="operator-queue-card__rank">{String(index + 1).padStart(2, "0")}</span>
                <div className="operator-queue-card__headline">
                  <h2>{opportunity.title}</h2>
                  <p>{[opportunity.companyName, opportunity.stage, ...(showOwners ? [opportunity.ownerName ?? "Unassigned"] : [])].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="operator-queue-card__reason">
                  <strong>Why NOW</strong>
                  <span>{opportunity.queueReason ?? "No queue reason recorded."}</span>
                  <small>Latest signal: <span>{resource.data ? formatDateTime(opportunity.lastContributingSignalAt, resource.data.presentation) : "Not recorded"}</span></small>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </OperatorShell>
  );
}
