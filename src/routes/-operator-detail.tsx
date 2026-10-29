import { Link, notFound } from '@tanstack/react-router';
import { OperatorShell, OperatorState } from '../core/features/operator/ui/operator-shell';
import { editorLeaf } from '../editor/leaf';

type DetailKind = 'opportunity' | 'contact' | 'company' | 'draft' | 'meeting' | 'assistance';

/** The noun a missing page names, and the list it offers as the way back. */
const pages: Record<DetailKind, { noun: string; list: string; label: string }> = {
  opportunity: { noun: 'opportunity', list: '/app/opportunities', label: 'Opportunities' },
  contact: { noun: 'contact', list: '/app/contacts', label: 'Contacts' },
  company: { noun: 'company', list: '/app/companies', label: 'Companies' },
  draft: { noun: 'draft', list: '/app/drafts', label: 'Drafts' },
  meeting: { noun: 'meeting', list: '/app/meetings', label: 'Meetings' },
  assistance: { noun: 'opportunity', list: '/app/opportunities', label: 'Opportunities' },
};

export function requireDetailId(id: string, kind: DetailKind) {
  const valid = kind === 'meeting' ? /^[A-Za-z0-9_-]{1,100}$/ : /^[0-9A-HJKMNP-TV-Z]{26}$/;
  if (!valid.test(id)) throw notFound();
}

export function OperatorDetailState({ kind, missing = false }: { kind: DetailKind; missing?: boolean }) {
  const page = pages[kind];
  return <OperatorShell title={missing ? 'Not found' : page.noun[0]!.toUpperCase() + page.noun.slice(1)}>
    <OperatorState kind="error">{missing ? `This ${page.noun} does not exist.` : `Orbit could not load this ${page.noun}.`} <Link className="operator-back-link" to={page.list}>← {page.label}</Link></OperatorState>
  </OperatorShell>;
}

export function operatorDetailErrors(kind: DetailKind) {
  return {
    notFoundComponent: editorLeaf(() => <OperatorDetailState kind={kind} missing />),
    errorComponent: editorLeaf(() => <OperatorDetailState kind={kind} />),
  };
}
