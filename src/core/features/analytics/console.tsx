import {DataValue} from '../operator/ui/data-value';
import { useEffect, useMemo, useRef, useState } from "react";
import type { MetricSnapshot } from "../../shared/expansion-contracts";
import { ReportDetails, reportValue } from './report-details';

import { ReadState } from "../fold-ui/workspace";

import "./console.css";

const BUILT_IN_REPORT_ID = "open-opportunities";

type Definition = {
  id: string;
  version: number;
  body_json: string;
  created_at: string;
};

type ReportPreview = MetricSnapshot & {
  reviewHash: string;
  population?: { pages: number; records: number; startedAt: string; completedAt: string };
};

type SavedReport = MetricSnapshot & {
  population?: ReportPreview["population"];
};

type SavedSnapshots = { items: MetricSnapshot[]; unavailable: number };

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result;
}

function labelFor(item: Definition, versionLabel: string) {
  try {
    return `${JSON.parse(item.body_json).name} — ${versionLabel} ${item.version}`;
  } catch {
    return `${item.id} — ${versionLabel} ${item.version}`;
  }
}

function reportName(item: Definition | undefined, fallback: string) {
  if (!item) return fallback;
  try {
    const name = JSON.parse(item.body_json).name;
    return typeof name === "string" && name.trim() ? name : item.id;
  } catch {
    return item.id;
  }
}

function detailValueLabel(key: string) {
  const labels: Record<string, string> = {
    n: "Source records",
    denominator: "Base",
    unit: "Unit",
  };
  return labels[key] ?? key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function plainIncompleteReason(reason: string) {
  if (reason.includes("No open opportunities were returned")) return "No open opportunities are available to you in this workspace.";
  if (reason.includes("CRM paging completed")) return "The CRM does not confirm that all recent changes have arrived.";
  if (reason.includes("Source watermark has not reached")) return "The source has not confirmed that updates are complete through this period.";
  if (reason.includes("lack a denominator")) return "Some source records are missing a value needed to calculate this result.";
  return reason;
}

export function AnalyticsConsole({ workspaceId }: { workspaceId: string }) {
  const t = (text:string) => text;
  const [sourcePage,setSourcePage]=useState(0);
  const [items, setItems] = useState<Definition[]>([]);
  const [selected, setSelected] = useState("");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [history, setHistory] = useState<SavedSnapshots | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const scopeRef = useRef({ workspaceId, selected });
  scopeRef.current = { workspaceId, selected };
  const base = `/api/v2/workspaces/${encodeURIComponent(workspaceId)}/operations`;
  const scopeKey = `${workspaceId}:${selected}`;
  const selectedDefinition = useMemo(
    () => items.find((item) => `${item.id}:${item.version}` === selected),
    [items, selected],
  );
  const isBuiltIn = selectedDefinition?.id === BUILT_IN_REPORT_ID;
  const hasBuiltIn = items.some((item) => item.id === BUILT_IN_REPORT_ID);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setItems([]);
    setSelected("");
    setPreview(null);
    setSaved(null);
    setHistory(null);
    setError("");
    setStatus("");
    setBusy(false);
    fetch(`${base}/metrics`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const body = (await response.json()) as {
          items?: Definition[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
        if (active) {
          const definitions = body.items ?? [];
          setItems(definitions);
          const preferred = definitions.find((item) => item.id === BUILT_IN_REPORT_ID) ?? definitions[0];
          if (preferred) setSelected(`${preferred.id}:${preferred.version}`);
        }
      })
      .catch((cause) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, refresh]);

  async function loadHistory(definition: Definition) {
    const response = await fetch(
      `${base}/metrics/${encodeURIComponent(definition.id)}/versions/${definition.version}/snapshots`,
      { cache: "no-store", credentials: "same-origin" },
    );
    const body = (await response.json()) as SavedSnapshots & { error?: string };
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    return body;
  }

  useEffect(() => {
    let active = true;
    setHistory(null);
    setPreview(null);
    setSaved(null);
    if (!selectedDefinition) return () => { active = false; };
    loadHistory(selectedDefinition).then((body) => {
      if (active) setHistory(body);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => {
      active = false;
    };
  }, [base, selectedDefinition]);

  async function startBuiltIn() {
    const currentScope = scopeKey;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await post<{ id: string; version: number; created: boolean }>(
        `${base}/metrics/templates/open-opportunities`,
        {},
      );
      const response = await fetch(`${base}/metrics`, { cache: "no-store", credentials: "same-origin" });
      const definitions = (await response.json()) as { items?: Definition[]; error?: string };
      if (!response.ok) throw new Error(definitions.error ?? `HTTP ${response.status}`);
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) {
        setItems(definitions.items ?? []);
        setSelected(`${result.id}:${result.version}`);
        setStatus(result.created ? t("Open opportunities report is ready to review.") : t("Open opportunities report is available."));
      }
    } catch (cause) {
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) {
        setPreview(null);
        setSaved(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (scopeRef.current.workspaceId === workspaceId) setBusy(false);
    }
  }

  async function review() {
    if (!selectedDefinition) return;
    const currentScope = scopeKey;
    setBusy(true);
    setError("");
    setStatus("");
    setSaved(null);
    setPreview(null);
    try {
      const body = isBuiltIn
        ? await post<ReportPreview>(
            `${base}/metrics/templates/open-opportunities/preview`,
            { version: selectedDefinition.version },
          )
        : await post<ReportPreview>(
            `${base}/metrics/${encodeURIComponent(selectedDefinition.id)}/preview`,
            {
              version: selectedDefinition.version,
              from: new Date(from).toISOString(),
              through: new Date(through).toISOString(),
            },
          );
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` !== currentScope) return;
      setPreview(body);
      setStatus(t("This report uses records available to you during this review. It has not been saved yet."));
    } catch (cause) {
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) {
        setPreview(null);
        setSaved(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) setBusy(false);
    }
  }

  async function saveReviewed() {
    if (!selectedDefinition || !preview) return;
    const currentScope = scopeKey;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const body = isBuiltIn
        ? await post<SavedReport>(
            `${base}/metrics/templates/open-opportunities/save`,
            { version: selectedDefinition.version, reviewHash: preview.reviewHash },
          )
        : await post<SavedReport>(
            `${base}/metrics/${encodeURIComponent(selectedDefinition.id)}/snapshots`,
            {
              version: selectedDefinition.version,
              from: new Date(from).toISOString(),
              through: new Date(through).toISOString(),
              reviewHash: preview.reviewHash,
            },
          );
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` !== currentScope) return;
      setSaved(body);
      setPreview(null);
      setStatus(t("Saved report rechecked the records you reviewed."));
      try {
        const nextHistory = await loadHistory(selectedDefinition);
        if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) setHistory(nextHistory);
      } catch (cause) {
        if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    } catch (cause) {
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) {
        setPreview(null);
        setSaved(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (`${scopeRef.current.workspaceId}:${scopeRef.current.selected}` === currentScope) setBusy(false);
    }
  }

  const visibleResult = saved ?? preview;

  return (
    <section className="analytics-console" aria-labelledby="analytics-title">
      <header className="analytics-console__intro">
        <h2 id="analytics-title">{t("Saved reports")}</h2>
        <p>{t("Review report results from the records and activity available in this workspace.")}</p>
      </header>
      <ReadState
        subject="reports"
        workspaceId={workspaceId}
        error={loadError}
        loading={loading}
        onRetry={() => setRefresh((value) => value + 1)}
      />
      {error && <p className="analytics-console__message" role="alert">{error}</p>}
      {status && <p className="analytics-console__message" role="status">{status}</p>}
      {!loading && !loadError && !items.length && (
        <aside className="analytics-console__first-report">
          <div>
            <h3>{t("No saved reports yet")}</h3>
            <p>{t("Start with a report of open opportunities. It includes only records you can access in this workspace.")}</p>
          </div>
          <button className="analytics-console__submit" disabled={busy} onClick={startBuiltIn}>
            {busy ? t("Preparing report…") : t("Set up open opportunities report")}
          </button>
        </aside>
      )}
      {!loading && !loadError && items.length > 0 && !hasBuiltIn && (
        <aside className="analytics-console__first-report">
          <div>
            <h3>{t("Add an open opportunities report")}</h3>
            <p>{t("The open opportunities report includes only records you can access in this workspace.")}</p>
          </div>
          <button className="analytics-console__submit" disabled={busy} onClick={startBuiltIn}>
            {busy ? t("Preparing report…") : t("Set up open opportunities report")}
          </button>
        </aside>
      )}
      <div className="analytics-console__fields">
        <label>
            {t("Report")}
          <select value={selected} onChange={(event) => {
            setSelected(event.target.value);
            setPreview(null);
            setSaved(null);
            setError("");
          }}>
            <option value="">{t("Choose a report")}</option>
            {items.map((item) => (
              <option key={`${item.id}:${item.version}`} value={`${item.id}:${item.version}`}>
                {labelFor(item, t("version"))}
              </option>
            ))}
          </select>
        </label>
        {!loading && !loadError && !items.length && (
          <p className="analytics-console__empty">{t("Set up the open opportunities report above to make it available here.")}</p>
        )}
        {!isBuiltIn && (
          <>
            <label>
              {t("Window start")}
              <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              {t("Window end")}
              <input type="datetime-local" value={through} onChange={(event) => setThrough(event.target.value)} />
            </label>
          </>
        )}
        {selectedDefinition && (
          <button
            className="analytics-console__submit"
            disabled={busy || (!isBuiltIn && (!from || !through))}
            onClick={review}
          >
          {busy ? t("Loading preview…") : t("Preview report")}
          </button>
        )}
      </div>
      {visibleResult && (
        <article className="analytics-console__result">
          <h3>{saved ? t("Saved result") : t("Review before saving")}</h3>
          <p>{t("Updated")} {new Date(visibleResult.asOf).toLocaleString()}.</p>
          {visibleResult.population && (
            <p>
              {t("Records available to you during this review")}: {visibleResult.population.records}. {t("New changes may appear afterwards.")}
            </p>
          )}
          <dl>
            <div>
              <dt>{reportName(selectedDefinition, t("Result"))}</dt>
              <dd>
                {reportValue(visibleResult)}
              </dd>
            </div>
          </dl>
          {visibleResult.incompleteReasons.length > 0 && (
            <ul>
              {visibleResult.incompleteReasons.map((reason) => <li key={reason}>{t(plainIncompleteReason(reason))}</li>)}
            </ul>
          )}
          <details>
            <summary>{t("How this report is calculated")}</summary>
            <ReportDetails report={visibleResult}/>
            {visibleResult.population && (
              <p>{t("Records read")}: {visibleResult.population.records}. {t("Pages read")}: {visibleResult.population.pages}.</p>
            )}
            <p>
              {visibleResult.inputs.length} {t("source records")}.
              {visibleResult.fxSnapshots.length > 0 && <> {visibleResult.fxSnapshots.length} {t("exchange rates were used")}.</>}
            </p>
            {Object.entries(visibleResult.values).filter(([key]) => !['value','formattedValue','unit','groups'].includes(key)).length > 0 && (
              <dl>
                {Object.entries(visibleResult.values).filter(([key]) => !['value','formattedValue','unit','groups'].includes(key)).map(([key, value]) => (
                  <div key={key}>
                    <dt>{t(detailValueLabel(key))}</dt>
                    <dd>{value === null ? t("Not available") : <DataValue value={value}/>}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p>
              {visibleResult.watermark === "native-transaction-fenced"
                ? t("Native records were checked against the current data and access revisions.")
                : visibleResult.watermark === "unknown"
                ? t("The source has not confirmed that all updates are complete through this period.")
                : `${t("Source updates are confirmed through")} ${new Date(visibleResult.watermark).toLocaleString()}.`}
            </p>
            <p>{visibleResult.inputs.length} source records. Opening a record checks current access.</p><ol>{visibleResult.inputs.slice(sourcePage*50,sourcePage*50+50).map(ref=><li key={`${ref.type}:${ref.id}`}><a href={`/app/shared-records?${new URLSearchParams({kind:ref.type,id:ref.id})}`}>{ref.type}: {ref.id}</a></li>)}</ol><button disabled={sourcePage===0} onClick={()=>setSourcePage(page=>page-1)}>Previous source records</button><button disabled={(sourcePage+1)*50>=visibleResult.inputs.length} onClick={()=>setSourcePage(page=>page+1)}>Next source records</button>
          </details>
          {preview && (
            <button className="analytics-console__submit" disabled={busy} onClick={saveReviewed}>
              {busy ? t("Saving…") : t("Save reviewed report")}
            </button>
          )}
        </article>
      )}
      {selectedDefinition && history && (
        <section className="analytics-console__history" aria-label={t("Saved report history")}>
          <h3>{t("Saved report history")}</h3>
          {history.unavailable > 0 && <p>{history.unavailable} {t("older results are hidden because current source access no longer permits them.")}</p>}
          {!history.items.length && !history.unavailable && <p>{t("No saved results yet. Preview a report, then save it after review.")}</p>}
          {history.items.map((item) => (
            <article key={item.id}>
              <p>{t("As of")} {item.asOf}</p><button onClick={async()=>{try{const response=await fetch(`${base}/snapshots/${encodeURIComponent(item.id)}`,{cache:"no-store"});const result=await response.json() as SavedReport & {error?:string};if(!response.ok)throw new Error(result.error);setSaved(result);setPreview(null);}catch(e){setError(e instanceof Error?e.message:"The saved report could not be reopened.");}}}>Reopen saved report</button><a href={`${base}/snapshots/${encodeURIComponent(item.id)}/export`}>Export saved report</a>
              <p>{t("Result")}: {reportValue(item)}</p>
              <ReportDetails report={item}/>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
