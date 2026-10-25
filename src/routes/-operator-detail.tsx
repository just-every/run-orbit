import { Link, notFound } from '@tanstack/react-router';
import { OperatorShell, OperatorState } from '../core/features/operator/ui/operator-shell';
import { editorLeaf } from '../editor/leaf';

type DetailKind = 'opportunity' | 'draft' | 'meeting' | 'assistance';

export function requireDetailId(id: string, kind: DetailKind) {
  const valid = kind === 'meeting' ? /^[A-Za-z0-9_-]{1,100}$/ : /^[0-9A-HJKMNP-TV-Z]{26}$/;
  if (!valid.test(id)) throw notFound();
}

export function OperatorDetailState({ kind, missing = false }: { kind: DetailKind; missing?: boolean }) {
  const noun = kind === 'assistance' ? 'opportunity' : kind;
  return <OperatorShell title={kind[0].toUpperCase() + kind.slice(1)}>
    <OperatorState kind="error">{missing ? `That ${noun} does not exist.` : `Orbit could not load this ${noun}.`} <Link to="/app/records">Back to records</Link></OperatorState>
  </OperatorShell>;
}

export function operatorDetailErrors(kind: DetailKind) {
  return {
    notFoundComponent: editorLeaf(() => <OperatorDetailState kind={kind} missing />),
    errorComponent: editorLeaf(() => <OperatorDetailState kind={kind} />),
  };
}
