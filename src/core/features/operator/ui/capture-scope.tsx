import { useEffect, useRef, useState, type FormEvent } from 'react';
import { OperatorState } from './operator-shell';
import type { CaptureCalendarWindow, CaptureOption, CaptureOptionsPage, CaptureSource } from './capture-types';

function dateValue(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso.slice(0, 10) : date.toISOString().slice(0, 10);
}

function defaultCalendarWindow(now = new Date()): { start: string; end: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const dateInYear = (targetYear: number) => new Date(Date.UTC(targetYear, month, Math.min(day, new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate())));
  const start = dateInYear(year - 1);
  const end = dateInYear(year + 1);
  return { start: dateValue(start.toISOString()), end: dateValue(end.toISOString()) };
}

function isoUtcDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) throw new Error('Choose valid calendar start and end dates.');
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) throw new Error('Choose valid calendar start and end dates.');
  return date.toISOString();
}

function mergeOptions(current: CaptureOption[], next: CaptureOption[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of next) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()];
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || fallback;
}

function SelectionStatus({
  folders,
  calendars,
  mailOptions,
  calendarOptions,
  scopeChanged,
  hasSavedScope,
}: {
  folders: string[];
  calendars: string[];
  mailOptions: CaptureOption[];
  calendarOptions: CaptureOption[];
  scopeChanged: boolean;
  hasSavedScope: boolean;
}) {
  const names = [
    ...folders.map((id) => mailOptions.find((option) => option.id === id)?.name ?? `Saved folder unavailable (${id})`),
    ...calendars.map((id) => calendarOptions.find((option) => option.id === id)?.name ?? `Saved calendar unavailable (${id})`),
  ];
  return <div className="capture-selected-scope" role="status" aria-label="Selected capture scope">
    <strong>Selected scope</strong>
    {names.length ? <>
      <ul>{names.map((name) => <li key={name}>{name}</li>)}</ul>
      {scopeChanged ? <p>{hasSavedScope
        ? 'The saved scope remains active until a valid new scope is saved.'
        : 'Orbit will not read this mailbox or calendar until a scope is saved.'}</p> : null}
    </> : <p>{hasSavedScope
      ? 'No folders or calendars are selected in this draft. The saved scope remains active until a valid new scope is saved.'
      : 'No folders or calendars selected. Orbit will not read this mailbox or calendar until a scope is saved.'}</p>}
  </div>;
}

export function CaptureScope({
  source,
  onChanged,
  onBusyChange,
  onScopeChanged,
  busy,
}: {
  source: CaptureSource;
  onChanged: () => void;
  onBusyChange: (busy: boolean) => void;
  onScopeChanged: (changed: boolean) => void;
  busy: boolean;
}) {
  const [mailOptions, setMailOptions] = useState<CaptureOption[]>([]);
  const [calendarOptions, setCalendarOptions] = useState<CaptureOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [discoveryAttempt, setDiscoveryAttempt] = useState(0);
  const [folders, setFolders] = useState<string[]>(source.scope.mail?.folders ?? []);
  const [calendars, setCalendars] = useState<string[]>(source.scope.calendars ?? []);
  const initialWindow = source.scope.calendarWindow ?? defaultCalendarWindow();
  const [calendarStart, setCalendarStart] = useState(() => dateValue(initialWindow.start));
  const [calendarEnd, setCalendarEnd] = useState(() => dateValue(initialWindow.end));
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const canDiscover = source.adapter !== 'file' && source.has_credential > 0 && source.state !== 'disconnected' && source.state !== 'error';
  const hasSelectedScope = folders.length > 0 || calendars.length > 0;
  const savedFolders = source.scope.mail?.folders ?? [];
  const savedCalendars = source.scope.calendars ?? [];
  const hasSavedScope = savedFolders.length > 0 || savedCalendars.length > 0;
  const hasSavedCalendarWindow = Boolean(source.scope.calendarWindow);
  const needsCalendarWindow = calendars.length > 0;
  const scopeChanged = JSON.stringify([...folders].sort()) !== JSON.stringify([...savedFolders].sort())
    || JSON.stringify([...calendars].sort()) !== JSON.stringify([...savedCalendars].sort())
    || (needsCalendarWindow !== hasSavedCalendarWindow)
    || (needsCalendarWindow && hasSavedCalendarWindow
      && (calendarStart !== dateValue(source.scope.calendarWindow!.start) || calendarEnd !== dateValue(source.scope.calendarWindow!.end)));
  const scopeKey = JSON.stringify(source.scope);

  useEffect(() => onScopeChanged(scopeChanged), [onScopeChanged, scopeChanged]);

  useEffect(() => {
    const savedScope = JSON.parse(scopeKey) as CaptureSource['scope'];
    setFolders([...(savedScope.mail?.folders ?? [])]);
    setCalendars([...(savedScope.calendars ?? [])]);
    const window = savedScope.calendarWindow ?? defaultCalendarWindow();
    setCalendarStart(dateValue(window.start));
    setCalendarEnd(dateValue(window.end));
  }, [source.id, scopeKey]);

  useEffect(() => {
    if (!canDiscover) {
      setMailOptions([]);
      setCalendarOptions([]);
      setOptionsLoaded(false);
      setOptionsLoading(false);
      setOptionsError('');
      return;
    }

    const controller = new AbortController();
    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError('');
      setOptionsLoaded(false);
      setMailOptions([]);
      setCalendarOptions([]);
      let mail: CaptureOption[] = [];
      let calendars: CaptureOption[] = [];
      let continuation: string | undefined;
      const seen = new Set<string>();
      let pageCount = 0;
      try {
        do {
          if (pageCount++ >= 500) throw new Error('The provider returned too many metadata pages. Try again after narrowing the account.');
          const query = continuation ? `?continuation=${encodeURIComponent(continuation)}` : '';
          const response = await fetch(`/api/v1/capture/sources/${source.id}/options${query}`, {
            credentials: 'same-origin',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(await responseError(response, 'Mail labels and calendars could not load.'));
          const page = await response.json() as CaptureOptionsPage;
          mail = mergeOptions(mail, page.mail ?? []);
          calendars = mergeOptions(calendars, page.calendars ?? []);
          continuation = page.continuation;
          if (continuation) {
            if (seen.has(continuation)) throw new Error('The provider repeated a page marker. Try loading the choices again.');
            seen.add(continuation);
          }
        } while (continuation && !controller.signal.aborted);
        if (!controller.signal.aborted) {
          setMailOptions(mail);
          setCalendarOptions(calendars);
          setOptionsLoaded(true);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setOptionsLoaded(false);
          setOptionsError((error as Error).message || 'Mail labels and calendars could not load.');
          onChangedRef.current();
        }
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false);
      }
    }
    void loadOptions();
    return () => controller.abort();
  }, [canDiscover, discoveryAttempt, source.id]);

  async function saveScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBusyChange(true);
    setActionError('');
    setNotice('');
    try {
      const payload: { mail: { folders: string[] }; calendars: string[]; calendarWindow?: CaptureCalendarWindow } = {
        mail: { folders },
        calendars,
      };
      if (calendars.length > 0) {
        const start = isoUtcDate(calendarStart);
        const end = isoUtcDate(calendarEnd);
        if (start >= end) throw new Error('The calendar end date must be after its start date.');
        payload.calendarWindow = { start, end };
      }
      const response = await fetch(`/api/v1/capture/sources/${source.id}/scope`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response, 'The selected scope could not be saved.'));
      setNotice('Selection saved. Orbit will read only the labels, folders and calendars shown here.');
      onChanged();
    } catch (error) {
      setActionError((error as Error).message || 'The selected scope could not be saved.');
    } finally {
      onBusyChange(false);
    }
  }

  const selectedNamesReady = optionsLoaded && !optionsLoading && !optionsError;

  return <section className="capture-source-scope" aria-labelledby={`capture-scope-${source.id}`}>
    <h4 id={`capture-scope-${source.id}`}>Choose what Orbit may read</h4>
    <p>Choose at least one label or folder for mail; calendar-only capture is also valid. Leave calendars unchecked when you want to capture mail only.</p>
    {optionsLoading ? <OperatorState>Loading all mail labels, folders and calendars…</OperatorState> : null}
    {optionsError ? <><OperatorState kind="error">{optionsError}</OperatorState><button className="orbit-button orbit-button--quiet" type="button" onClick={() => setDiscoveryAttempt((value) => value + 1)}>Retry discovery</button></> : null}
    {selectedNamesReady ? <form className="capture-scope-form" method="post" action={`/api/v1/capture/sources/${source.id}/scope`} onSubmit={saveScope}>
      {folders.map((id) => mailOptions.some((option) => option.id === id) ? null : <input key={`saved-folder-${id}`} type="hidden" name="folders" value={id} />)}
      {calendars.map((id) => calendarOptions.some((option) => option.id === id) ? null : <input key={`saved-calendar-${id}`} type="hidden" name="calendars" value={id} />)}
      <fieldset className="capture-option-group">
        <legend>{source.adapter === 'google' ? 'Gmail labels' : 'Mail folders'}</legend>
        {mailOptions.length ? mailOptions.map((option) => <label key={option.id} className="capture-option">
          <input type="checkbox" name="folders" value={option.id} checked={folders.includes(option.id)} onChange={(event) => setFolders((current) => event.target.checked ? [...new Set([...current, option.id])] : current.filter((id) => id !== option.id))} />
          <span>{option.name}</span>
        </label>) : <p>No mail labels or folders were returned by the provider.</p>}
        {folders.filter((id) => !mailOptions.some((option) => option.id === id)).map((id) => <label key={id} className="capture-option capture-option--stale">
          <input type="checkbox" checked onChange={() => setFolders((current) => current.filter((item) => item !== id))} />
          <span>Saved folder no longer available <code>{id}</code></span>
        </label>)}
      </fieldset>
      <fieldset className="capture-option-group">
        <legend>Calendars <span className="capture-optional">Optional</span></legend>
        {calendarOptions.length ? calendarOptions.map((option) => <label key={option.id} className="capture-option">
          <input type="checkbox" name="calendars" value={option.id} checked={calendars.includes(option.id)} onChange={(event) => setCalendars((current) => event.target.checked ? [...new Set([...current, option.id])] : current.filter((id) => id !== option.id))} />
          <span>{option.name}</span>
        </label>) : <p>No calendars selected. This is valid; Orbit can capture mail folders only.</p>}
        {calendars.filter((id) => !calendarOptions.some((option) => option.id === id)).map((id) => <label key={id} className="capture-option capture-option--stale">
          <input type="checkbox" checked onChange={() => setCalendars((current) => current.filter((item) => item !== id))} />
          <span>Saved calendar no longer available <code>{id}</code></span>
        </label>)}
      </fieldset>
      {calendars.length > 0 ? <fieldset className="capture-calendar-window">
        <legend>Calendar dates</legend>
        <p>Orbit reads events inside this fixed date window. The default covers the previous year through the next year. Change it explicitly when you want a different period.</p>
        <div className="capture-calendar-dates">
          <label>Start date<input type="date" name="calendarStart" required value={calendarStart} onChange={(event) => setCalendarStart(event.target.value)} /></label>
          <label>End date<input type="date" name="calendarEnd" required value={calendarEnd} onChange={(event) => setCalendarEnd(event.target.value)} /></label>
        </div>
      </fieldset> : null}
      <SelectionStatus folders={folders} calendars={calendars} mailOptions={mailOptions} calendarOptions={calendarOptions} scopeChanged={scopeChanged} hasSavedScope={hasSavedScope} />
      <button className="orbit-button orbit-button--primary" type="submit" disabled={busy || optionsLoading || !hasSelectedScope}>{busy ? 'Saving…' : 'Save selected scope'}</button>
      {!hasSelectedScope ? <p className="capture-no-scope">Select one or more mail folders or calendars to save a scope. Calendars may be left unchecked when a mail folder is selected.</p> : null}
    </form> : null}
    {actionError ? <OperatorState kind="error">{actionError}</OperatorState> : null}
    {notice ? <OperatorState>{notice}</OperatorState> : null}
  </section>;
}
