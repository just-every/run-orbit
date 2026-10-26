import {fieldLabel} from './data-value';
import {formatDateTime, label} from './formatters';

const identityField = /^(?:id|.*(?:Id|Ids|_id|_ids)|notificationEventKey|.*(?:Hash|_hash))$/;
const identityValue = /^(?:[0-7][0-9A-HJKMNP-TV-Z]{25}|[0-9a-f]{64}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Audit panels keep the recorded facts; machine references stay in their links and stored record. */
export function AuditValue({value}: {value: unknown}) {
  if (value === null || value === undefined) return <span>Not recorded</span>;
  if (Array.isArray(value)) {
    const items = value.filter(item => typeof item !== 'string' || !identityValue.test(item));
    return items.length ? <ol className="operator-data-list">{items.map((item, index) => <li key={index}><AuditValue value={item}/></li>)}</ol> : <span>No additional details recorded.</span>;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([key, item]) => !identityField.test(key) && !(typeof item === 'string' && identityValue.test(item)));
    return entries.length ? <dl className="operator-data-fields">{entries.map(([key, item]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd><AuditValue value={item}/></dd></div>)}</dl> : <span>No additional details recorded.</span>;
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'string') {
    if (timestamp.test(value)) return <time dateTime={value}>{formatDateTime(value)}</time>;
    if (value === 'orbit-d1') return <span>Orbit</span>;
    if (/^(?:(?:opportunity|email|message|provider|manual|draft|signal|meeting|form|record)\.[\w.-]+|[\w.-]+\.v\d+)$/.test(value) && !value.includes('@')) return <span>{label(value)}</span>;
  }
  return <span className="operator-data-value">{String(value)}</span>;
}
