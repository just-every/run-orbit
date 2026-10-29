import './now-page.css';
import {OnboardingChecklist,readOnboarding} from './onboarding-checklist';
import { useCallback, useState } from "react";
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

export function NowPage({ initialData }: { initialData?: Awaited<ReturnType<typeof import("../../../app/loaders").loadNow>> }) {
  const [owner, setOwner] = useState("all");
  const [stage, setStage] = useState("all");
  const [band, setBand] = useState("all");
  const filtersKey = `${owner}:${stage}:${band}`;
  const loadNow = useCallback(async () => {
    const [{ facets, opportunities }, { presentation }] = await Promise.all([
      operatorApi.listNow({ band: band === "all" ? undefined : band, ownerId: owner === "all" ? undefined : owner, stageId: stage === "all" ? undefined : stage }),
      operatorApi.readWorkspacePresentation()
    ]);
    return { facets, opportunities, presentation, filtersKey };
  }, [band, owner, stage, filtersKey]);
  const resource = useOperatorResource(`now:${filtersKey}`, loadNow, initialData ? { ...initialData, filtersKey: "all:all:all" } : undefined);
  const onboarding = useOperatorResource('onboarding', useCallback(readOnboarding, []));
  const currentResults = resource.data?.filtersKey === filtersKey;
  const opportunities = currentResults ? resource.data!.opportunities : [];
  const loading = !resource.error && (resource.loading || !currentResults);
  const filtered = owner !== "all" || stage !== "all" || band !== "all";

  const facets = resource.data?.facets;
  const showOwners = new Set(opportunities.map(opportunity => opportunity.ownerId)).size > 1;
  useHashMap(storedTaskLink);

  return (
    <OperatorShell eyebrow="Today" title="Your brief">
      <h2 className="today-now-title" id="now-queue-title" tabIndex={-1}>NOW queue</h2>
      {onboarding.error ? <p role="alert">{onboarding.error.message}</p> : <OnboardingChecklist state={onboarding.data}/>}
      <section className="operator-queue" data-testid="now-queue">
        <div className="operator-queue__intro">
          <details className="operator-queue__policy"><summary>Ordering details</summary><p>The first 50 open opportunities are ordered by score, then the most recent contributing signal. Ties keep a consistent order.</p><p data-testid="now-ordering">Priority order version 1</p></details>
        </div>
        <fieldset className="operator-filters">
          <legend>Filter this queue</legend>
          <label>Owner
            <select aria-label="Filter by owner" onChange={(event) => setOwner(event.target.value)} value={owner}>
              <option value="all">All owners</option>
              {facets?.owners.map((item) => <option key={item.id ?? "unassigned"} value={item.id ?? "unassigned"}>{item.name ?? "Unassigned"}</option>)}
            </select>
          </label>
          <label>Stage
            <select aria-label="Filter by stage" onChange={(event) => setStage(event.target.value)} value={stage}>
              <option value="all">All stages</option>
              {facets?.stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Band
            <select aria-label="Filter by band" onChange={(event) => setBand(event.target.value)} value={band}>
              <option value="all">All bands</option>
              {facets?.bands.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
        </fieldset>
        {loading ? <OperatorState>Loading your NOW queue…</OperatorState> : null}
        {resource.error ? <OperatorState kind="error">{resource.error.message}</OperatorState> : null}
        {!loading && !resource.error && opportunities.length === 0 ? <div className="operator-state">{filtered ? <><h2>No customers match these filters</h2><button type="button" onClick={() => { setOwner("all"); setStage("all"); setBand("all"); }}>Clear filters</button></> : <><h2>No customers need attention yet</h2>{onboarding.data ? <>{onboarding.data.records ? <a href="/app/records">View customer records</a> : <a href="/app/new">Add your first customer</a>} · </> : null}<a href="/demo">See an example</a></>}</div> : null}
        <ol className="operator-queue__list">
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
                  <small>Latest contributing signal: <span>{resource.data ? formatDateTime(opportunity.lastContributingSignalAt, resource.data.presentation) : "Not recorded"}</span></small>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </OperatorShell>
  );
}
