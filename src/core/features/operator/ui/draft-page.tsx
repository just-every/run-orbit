import {messageStatus} from './message-status';
import {recordsRequest} from './records-api';
import {DraftLibraryPicker} from '../../drafts/ui/library-picker';
import { DraftApproval } from "./draft-approval";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";

import { formatDateTime, label } from "./formatters";
import { OperatorApiError, operatorApi, type OperatorDraft } from "./operator-api";
import { OperatorShell, OperatorState } from "./operator-shell";
import { useOperatorResource } from "./use-operator-resource";
import { DraftContentFields } from "../../drafts/ui/draft-content-fields";

interface SubmittedMessage { draftId: string; revision: number; state: string; scheduledAt: string | null;recipientEmail:string;subject:string;body:string }
const submittedTitles: Record<string, string> = { scheduled: "Scheduled message", failed: "Message not sent", bounced: "Message bounced", "delivery-unknown":"Delivery unresolved", reconciling:"Reconciling provider acceptance", queued:"Submission in progress", delivered:"Delivered message" };

export function DraftPage() {
  const { id } = useParams({ from: "/app/drafts/$id" });
  const loadDraft = useCallback(async () => {
    const [{ draft }, { presentation }, {operators}] = await Promise.all([operatorApi.readDraft(id), operatorApi.readWorkspacePresentation(), recordsRequest<{operators:{id:string;display_name:string}[]}>('settings')]);
    const opportunity=draft.opportunityId?(await operatorApi.readOpportunity(draft.opportunityId)).opportunity:null;
    const contactContext=!opportunity?await fetch(`/api/v1/workbench/records/contact/${draft.recipientContactId}/mail-context`).then(async response=>{if(!response.ok)throw new Error('Recipient context could not load.');return response.json() as Promise<{contacts:{id:string;name:string|null;email:string|null;contactability:string}[]}>;}):null;
    const path=draft.opportunityId?`opportunities/${draft.opportunityId}/messages`:`records/contact/${draft.recipientContactId}/mail`;
    const history=await fetch(`/api/v1/workbench/${path}`).then(async response=>{if(!response.ok)throw new Error('Saved message history could not load.');return response.json() as Promise<{messages:SubmittedMessage[];mailProvider?:string}>;});
    // This exact revision was already approved: show what happened to it instead of an editor.
    const submitted = history.messages.find(message => message.draftId === draft.id && message.revision === draft.revision && !["draft", "cancelled"].includes(message.state)) ?? null;
    const authorName=draft.authorLabel??operators.find(operator=>operator.id===draft.authorId)?.display_name;
    return { draft, presentation, opportunity, contactContext, submitted, authorName, mailProvider:history.mailProvider };
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
  const contacts=resource.data.opportunity?.contacts??resource.data.contactContext?.contacts??[];

  return (
    <OperatorShell
      eyebrow="Human-reviewed outreach"
      title={submitted ? submittedTitles[submitted.state] ?? "Sent message" : "Editable draft"}
      action={draft.opportunityId?<Link className="operator-back-link" to="/app/opportunities/$id" params={{ id: draft.opportunityId }}>← Opportunity detail</Link>:<a className="operator-back-link" href={`/app/contacts/${draft.recipientContactId}#record-mail`}>← Contact detail</a>}
    >
      <section className="operator-draft-editor" style={{display:"block"}} data-testid="draft-editor">
        {draft.preparedByLabel&&<p>Prepared by {draft.preparedByLabel}</p>}
        {submitted ? <OperatorState>{submitted.state === "scheduled" && submitted.scheduledAt ? <>This message is scheduled for <time dateTime={submitted.scheduledAt}>{formatDateTime(submitted.scheduledAt, presentation)}</time>. To change it, cancel it from the record first.</> : <>{messageStatus(submitted.state)} It can no longer be edited. To write to this customer again, start a new follow-up from the record.</>}</OperatorState> : null}
        {submitted ? <SentMessage recipient={resource.data.submitted?.recipientEmail??draft.recipientEmail} subject={resource.data.submitted?.subject??draft.subject} body={resource.data.submitted?.body??draft.body} /> : <form className="operator-surface operator-draft-form" onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}><fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <label>Recipient
            <input data-testid="draft-recipient" required onChange={(event) => setDraft({ ...draft, recipientEmail: event.target.value })} type="email" value={draft.recipientEmail} />
          </label>
          <DraftContentFields
            body={draft.body}
            onBodyChange={(body) => setDraft({ ...draft, body })}
            onSubjectChange={(subject) => setDraft({ ...draft, subject })}
            subject={draft.subject}
          />
          <DraftLibraryPicker draft={draft} disabled={saving} onApplied={resource.reload}/>
          {draft.isStale ? <section className="operator-state operator-state--error" data-testid="stale-review">
            <h2>Review what changed</h2><p>{draft.staleReason ?? "Customer context changed."}</p>
            {resource.data.opportunity?<p>Current opportunity: {resource.data.opportunity.title} · {resource.data.opportunity.stage} · {resource.data.opportunity.queueReason}</p>:<p>Contact email: {contacts[0]?.email} · {contacts[0]?.contactability}. Review the <a href={`/app/contacts/${draft.recipientContactId}`}>current customer evidence</a> before confirming.</p>}
            <ul>{(resource.data.opportunity?.signals??[]).slice(0,5).map(signal=><li key={signal.id}>{signal.subject??label(signal.type)} · {formatDateTime(signal.occurredAt,presentation)}</li>)}</ul>
            <label>Confirm the current recipient<select value={draft.recipientContactId??''} onChange={event=>{const contact=contacts.find(contact=>contact.id===event.target.value);if(contact)setDraft({...draft,recipientContactId:contact.id,recipientEmail:contact.email??''});}}><option value="">Choose a linked contact</option>{contacts.map(contact=><option key={contact.id} value={contact.id} disabled={contact.contactability!=='contactable'}>{contact.name??contact.email} — {contact.email} ({contact.contactability})</option>)}</select></label>
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
            <div><dt>{draft.authorLabel?'Created by':'Author'}</dt><dd>{resource.data.authorName??'Author record unavailable'}</dd></div>
            <div><dt>Source recommendation</dt><dd>{draft.recommendationId&&draft.opportunityId?<Link data-row-action to="/app/opportunities/$id" params={{id:draft.opportunityId}}>View the related opportunity</Link>:"No source recommendation"}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(draft.createdAt, presentation)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDateTime(draft.updatedAt, presentation)}</dd></div>
            <div><dt>Revision</dt><dd>{draft.revision}</dd></div>
          </dl>
        </details>
      {resource.data.submitted ? null : <DraftApproval mailProvider={resource.data.mailProvider} onSubmitted={message=>{setJustSubmitted(message);resource.reload();}} onOptOutChanged={resource.reload} recipientName={contacts.find(contact=>contact.id===draft.recipientContactId)?.name??undefined} draft={draft} dirty={draft.recipientEmail !== resource.data?.draft.recipientEmail || draft.subject !== resource.data?.draft.subject || draft.body !== resource.data?.draft.body} />}
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
