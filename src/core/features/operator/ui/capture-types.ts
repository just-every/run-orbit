export type CaptureProviderId = 'google' | 'microsoft';

export interface CaptureProviderInfo {
  id: CaptureProviderId;
  name: string;
  redirectUri: string;
}

export interface CaptureProviderDirectory {
  available: boolean;
  providers: CaptureProviderInfo[];
}

export interface CaptureOption {
  id: string;
  name: string;
}

export interface CaptureOptionsPage {
  mail: CaptureOption[];
  calendars: CaptureOption[];
  continuation?: string;
}

export interface CaptureCalendarWindow {
  start: string;
  end: string;
}

export interface CaptureScope {
  mail?: { folders: string[] };
  calendars?: string[];
  calendarWindow?: CaptureCalendarWindow;
}

export interface CaptureSource {
  id: string;
  adapter: string;
  name: string;
  state: string;
  last_success_at: string | null;
  last_error: string | null;
  captured_count: number;
  skipped_count: number;
  proposals_waiting: number;
  has_credential: number;
  scope: CaptureScope;
}

export interface CaptureSyncSummary {
  captured: number;
  skipped: number;
  proposals: number;
  halted?: 'revoked' | 'unavailable';
}

export interface CaptureSyncResponse {
  summary: CaptureSyncSummary;
  more: boolean;
}

export function isCaptureProvider(value: string): value is CaptureProviderId {
  return value === 'google' || value === 'microsoft';
}

export function isRevokedSource(source: Pick<CaptureSource, 'state' | 'last_error'>): boolean {
  return source.state === 'error' && /access was revoked/i.test(source.last_error ?? '');
}

export function isUnavailableSource(source: Pick<CaptureSource, 'last_error'>): boolean {
  return /provider unavailable/i.test(source.last_error ?? '');
}
