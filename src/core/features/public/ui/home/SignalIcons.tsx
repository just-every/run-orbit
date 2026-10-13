/** The three signal kinds Orbit records (email.replied, meeting.booked, form.submitted), each as a 28-unit line icon. */
export type SignalKind = "reply" | "meeting" | "form";

const paths: Record<SignalKind, React.ReactNode> = {
  reply: <><rect x="3" y="5" width="22" height="18" rx="2" /><path d="m4 7 10 8L24 7" /></>,
  meeting: <><rect x="4" y="5" width="20" height="21" rx="2" /><path d="M4 11h20M9 2v6M19 2v6" /></>,
  form: <path d="M7 3h11l5 5v17H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M17 3v6h6M10 13h8M10 17h8M10 21h5" />
};

export function SignalIcon({ kind }: { kind: SignalKind }) {
  return <svg className="ob-icon" viewBox="0 0 28 28" aria-hidden="true">{paths[kind]}</svg>;
}
