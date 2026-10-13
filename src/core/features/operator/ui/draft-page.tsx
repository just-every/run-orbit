import { DraftApproval } from "./draft-approval";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";

import { formatDateTime, label } from "./formatters";
import { OperatorApiError, operatorApi, type OperatorDraft } from "./operator-api";
import { OperatorShell, OperatorState } from "./operator-shell";
import { useOperatorResource } from "./use-operator-resource";
import { DraftContentFields } from "../../drafts/ui/draft-content-fields";

export function DraftPage() {
  const { id } = useParams({ from: "/app/drafts/$id" });
  const loadDraft = useCallback(async () => {
    const [{ draft }, { presentation }] = await Promise.all([operatorApi.readDraft(id), operatorApi.readWorkspacePresentation()]);
    const { opportunity } = await operatorApi.readOpportunity(draft.opportunityId);
    return { draft, presentation, opportunity };
  }, [id]);
  const resource = useOperatorResource(`draft:${id}`, loadDraft);
  const [draft, setDraft] = useState<OperatorDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState(false);

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

  return (
    <OperatorShell
      eyebrow="Human-reviewed outreach"
      title="Editable draft"
      action={<Link className="operator-back-link" to="/app/opportunities/$id" params={{ id: draft.opportunityId }}>← Opportunity detail</Link>}
    >
      <section className="operator-draft-editor" style={{display:"block"}} data-testid="draft-editor">
        <form className="operator-surface operator-draft-form" onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}>
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
            <label><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/> I reviewed the changed evidence, current recipient, subject and body above.</label>
            <button type="button" className="operator-primary-button" disabled={saving||!reviewed||!draft.recipientContactId} onClick={()=>void confirmReview()}>Confirm reviewed draft</button>
            <p>This confirms a new draft revision. It sends nothing.</p>
          </section> : null}
          {saveError ? <OperatorState kind="error">{saveError} <button className="operator-text-button" onClick={resource.reload} type="button">Reload saved draft</button></OperatorState> : null}
          {saved ? <OperatorState>Saved revision {draft.revision}. Your changes are saved.</OperatorState> : null}
          <div className="operator-draft-form__footer">
            <p>Save the exact message before approving or scheduling it below.</p>
            <button className="operator-primary-button" data-testid="save-draft" disabled={saving || draft.isStale} type="submit">{saving ? "Saving…" : "Save draft"}</button>
          </div>
        </form>
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
      <DraftApproval recipientName={resource.data.opportunity.contacts.find(contact=>contact.id===draft.recipientContactId)?.name??undefined} draft={draft} dirty={draft.recipientEmail !== resource.data?.draft.recipientEmail || draft.subject !== resource.data?.draft.subject || draft.body !== resource.data?.draft.body} />
    </OperatorShell>
  );
}
