/** Configured scoring policy; manual notes are intentionally absent. */
export const weights: Readonly<Record<string, number>> = {
  'form.submitted': 25, 'email.replied': 40, 'meeting.booked': 45,
  'meeting.completed': 30, 'email.bounced': -25, 'email.unsubscribed': -100,
  'content.downloaded': 10, 'page.viewed': 2, 'email.opened': 2, 'email.sent': 0,
  'meeting.viewed': 3, 'meeting.cancelled': 0, 'chat.started': 20, 'firmographic.changed': 5
};
export const scoringPolicy = 'opportunity.scoring.v1';
export function evaluateSignals(signals: { id: string; type: string; occurred_at: string }[], now: Date) {
  const contributions = signals.map(signal => ({ signalId: signal.id,
    contribution: Math.round((weights[signal.type] ?? 0) * Math.max(0, 1 - Math.max(0, now.getTime() - Date.parse(signal.occurred_at)) / (30 * 86400000)))
  })).filter(item => item.contribution !== 0);
  const score = Math.max(0, Math.min(100, contributions.reduce((sum, item) => sum + item.contribution, 0)));
  return { contributions, score, band: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low' };
}
