import { DraftApproval } from "./draft-approval";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";

import { formatDateTime, label } from "./formatters";
import { OperatorApiError, operatorApi, type OperatorDraft } from "./operator-api";
import { OperatorShell, OperatorState } from "./operator-shell";
import { useOperatorResource } from "./use-operator-resource";
import { DraftContentFields } from "../../drafts/ui/draft-content-fields";

interface SubmittedMessage { draftId: string; revision: number; state: string; scheduledAt: string | null }
const submittedTitles: Record<string, string> = { scheduled: "Scheduled message", failed: "Message not sent", bounced: "Message bounced" };

export function DraftPage() {
  const { id } = useParams({ from: "/app/drafts/$id" });
  const loadDraft = useCallback(async () => {
    const [{ draft }, { presentation }] = await Promise.all([operatorApi.readDraft(id), operatorApi.readWorkspacePresentation()]);
    const [{ opportunity }, history] = await Promise.all([operatorApi.readOpportunity(draft.opportunityId), fetch(`/api/v1/workbench/opportunities/${encodeURIComponent(draft.opportunityId)}/messages`).then(response => response.ok ? response.json() as Promise<{ messages: SubmittedMessage[];mailProvider?:string }> : { messages: [],mailProvider:undefined })]);
    // This exact revision was already approved: show what happened to it instead of an editor.
    const submitted = history.messages.find(message => message.draftId === draft.id && message.revision === draft.revision && !["draft", "cancelled"].includes(message.state)) ?? null;
    return { draft, presentation, opportunity, submitted, mailProvider:history.mailProvider };
  }, [id]);
  const resource = useOperatorResource(`draft:${id}`, loadDraft);
  const [draft, setDraft] = useState<OperatorDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState<Pick<SubmittedMessage, "state" | "scheduledAt"> | null>(null);

  useEffect(() => {
    if (resource.data) { setDraft(resource.data.draft); setReviewed(false); }
  }, [resource.data]);

  async function saveDraft() {
    if (!draft || draft.isStale) return;
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await operatorApi.updateDraft(draft);
      setDraft(updated.draft);
      setSaved(true);
      resource.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Orbit could not save this draft.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmReview() {
    if(!draft||!resource.data||!reviewed)return;
    setSaving(true);setSaveError(null);
    try {
      const response=await fetch(`/api/v1/workbench/drafts/${draft.id}/review`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:draft.revision,reviewedUpdatedAt:resource.data.draft.updatedAt,recipientContactId:draft.recipientContactId,recipientEmail:draft.recipientEmail,subject:draft.subject,body:draft.body})});
      const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??'Draft review failed.');setSaved(true);resource.reload();
    }catch(error){setSaveError(error instanceof Error?error.message:'Draft review failed.');}finally{setSaving(false);}
  }

  if (resource.loading) return <OperatorShell title="Draft"><OperatorState>Loading draft…</OperatorState></OperatorShell>;
  if (resource.error) {
    const notFound = resource.error instanceof OperatorApiError && resource.error.status === 404;
    return <OperatorShell title="Draft"><OperatorState kind="error">{notFound ? "Draft not found." : resource.error.message}</OperatorState></OperatorShell>;
  }
  if (!draft || !resource.data) return null;
  const presentation = resource.data.presentation;
  const submitted = resource.data.submitted ?? justSubmitted;

  return (
    <OperatorShell
      eyebrow="Human-reviewed outreach"
      title={submitted ? submittedTitles[submitted.state] ?? "Sent message" : "Editable draft"}
      action={<Link className="operator-back-link" to="/app/opportunities/$id" params={{ id: draft.opportunityId }}>← Opportunity detail</Link>}
    >
      <section className="operator-draft-editor" style={{display:"block"}} data-testid="draft-editor">
        {submitted ? <OperatorState>{submitted.state === "scheduled" && submitted.scheduledAt ? `This message is scheduled for ${formatDateTime(submitted.scheduledAt, presentation)}. To change it, cancel it from the opportunity first.` : `This message was approved and handed to the mail service (state: ${label(submitted.state)}). It can no longer be edited. To write to this customer again, start a new follow-up from the opportunity.`}</OperatorState> : null}
        {submitted ? <SentMessage recipient={resource.data.draft.recipientEmail} subject={resource.data.draft.subject} body={resource.data.draft.body} /> : <form className="operator-surface operator-draft-form" onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}><fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <label>Recipient
            <input data-testid="draft-recipient" required onChange={(event) => setDraft({ ...draft, recipientEmail: event.target.value })} type="email" value={draft.recipientEmail} />
          </label>
          <DraftContentFields
            body={draft.body}
            onBodyChange={(body) => setDraft({ ...draft, body })}
            onSubjectChange={(subject) => setDraft({ ...draft, subject })}
            subject={draft.subject}
          />
          {draft.isStale ? <section className="operator-state operator-state--error" data-testid="stale-review">
            <h2>Review what changed</h2><p>{draft.staleReason ?? "Customer context changed."}</p>
            <p>Current opportunity: {resource.data.opportunity.title} · {resource.data.opportunity.stage} · {resource.data.opportunity.queueReason}</p>
            <ul>{resource.data.opportunity.signals.slice(0,5).map(signal=><li key={signal.id}>{signal.subject??label(signal.type)} · {formatDateTime(signal.occurredAt,presentation)}</li>)}</ul>
            <label>Confirm the current recipient<select value={draft.recipientContactId??''} onChange={event=>{const contact=resource.data?.opportunity.contacts.find(contact=>contact.id===event.target.value);if(contact)setDraft({...draft,recipientContactId:contact.id,recipientEmail:contact.email??''});}}><option value="">Choose a linked contact</option>{resource.data.opportunity.contacts.map(contact=><option key={contact.id} value={contact.id} disabled={contact.contactability!=='contactable'}>{contact.name??contact.email} — {contact.email} ({contact.contactability})</option>)}</select></label>
            <label style={{display:"flex",gap:8,alignItems:"flex-start"}}><input style={{width:"auto",flex:"none"}} type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/> I reviewed the changed evidence, current recipient, subject and body above.</label>
            <button type="button" className="operator-primary-button" disabled={saving||!reviewed||!draft.recipientContactId} onClick={()=>void confirmReview()}>Confirm reviewed draft</button>
            <p>This confirms a new draft revision. It sends nothing.</p>
          </section> : null}
          {saveError ? <OperatorState kind="error">{saveError} <button className="operator-text-button" onClick={resource.reload} type="button">Reload saved draft</button></OperatorState> : null}
          {saved ? <OperatorState>Saved revision {draft.revision}. Your changes are saved.</OperatorState> : null}
          <div className="operator-draft-form__footer">
            <p>Save the exact message before approving or scheduling it below.</p>
            <button className="operator-primary-button" data-testid="save-draft" disabled={saving || draft.isStale} type="submit">{saving ? "Saving…" : "Save draft"}</button>
          </div>
        </fieldset></form>}
      </section>
        <details className="operator-surface operator-detail__section"><summary>Audit details</summary>
          <p className="operator-eyebrow">Draft history</p>
          <dl>
            <div><dt>Author</dt><dd>{draft.authorId}</dd></div>
            <div><dt>Source recommendation</dt><dd>{draft.recommendationId ?? "No source recommendation"}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(draft.createdAt, presentation)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDateTime(draft.updatedAt, presentation)}</dd></div>
            <div><dt>Revision</dt><dd>{draft.revision}</dd></div>
          </dl>
        </details>
      {resource.data.submitted ? null : <DraftApproval mailProvider={resource.data.mailProvider} onSubmitted={setJustSubmitted} onOptOutChanged={resource.reload} recipientName={resource.data.opportunity.contacts.find(contact=>contact.id===draft.recipientContactId)?.name??undefined} draft={draft} dirty={draft.recipientEmail !== resource.data?.draft.recipientEmail || draft.subject !== resource.data?.draft.subject || draft.body !== resource.data?.draft.body} />}
    </OperatorShell>
  );
}

/** A message handed to the mail service is a record, not a form: what was sent, as text. */
function SentMessage({ recipient, subject, body }: { recipient: string; subject: string; body: string }) {
  return <section className="operator-surface operator-draft-form" aria-label="Message as sent" data-testid="sent-message">
    <dl className="operator-sent-message">
      <div><dt>Recipient</dt><dd>{recipient}</dd></div>
      <div><dt>Subject</dt><dd>{subject}</dd></div>
      <div><dt>Body</dt><dd style={{ whiteSpace: "pre-wrap" }}>{body}</dd></div>
    </dl>
  </section>;
}
