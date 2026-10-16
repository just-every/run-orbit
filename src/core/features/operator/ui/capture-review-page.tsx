import './records.css';
import './capture-setup.css';
import { CaptureProposals } from './capture-proposals';
import { OperatorShell } from './operator-shell';

/** Daily use: changes Orbit found in captured mail and meetings, each waiting for a person. */
export function CaptureReviewPage() {
  return <OperatorShell eyebrow={<nav className="capture-breadcrumb" aria-label="Breadcrumb"><a href="/app/capture">Capture</a> <span aria-hidden="true">/</span> <span aria-current="page">Review</span></nav>} title="Review proposed changes">
    <CaptureProposals standalone />
  </OperatorShell>;
}
