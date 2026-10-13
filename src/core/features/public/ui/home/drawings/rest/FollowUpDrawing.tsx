import { CurvedArrow, Rays } from "./CurvedArrow";
import { Icon } from "./icons";

const LABEL = "Drawing of the scheduled follow-up Checking in on the proposal, to dana@northwind.example, tomorrow at 10:00, marked cancelled because of a customer reply from Dana: Looks good, can we talk next week?";

/** The Replies stop follow-ups drawing: a scheduled follow-up, the reply that arrived, and the cancellation that joins them. */
export function FollowUpDrawing() {
  return (
    <div className="ob-art ob-art--follow" role="img" aria-label={LABEL}>
      <div className="ob-card ob-scheduled" aria-hidden="true">
        <div className="ob-lead">
          <Icon name="mail" />
          <div>
            <span className="ob-small-title">Scheduled follow-up</span>
            <b className="ob-scheduled-title">Checking in on the proposal</b>
            <span className="ob-muted">To: dana@northwind.example</span>
            <p className="ob-date"><Icon name="calendar" /><span>Tomorrow, 10:00</span></p>
          </div>
        </div>
      </div>
      <div className="ob-card ob-reply" aria-hidden="true">
        <div className="ob-lead">
          <span className="ob-avatar ob-avatar--grey">D</span>
          <div><b className="ob-name">Dana</b><span className="ob-muted">dana@northwind.example</span><span className="ob-muted">2 hours ago</span></div>
        </div>
        <span className="ob-dots">···</span>
        <p className="ob-quote">Looks good — can we talk next week?</p>
      </div>
      <p className="ob-cancelled" aria-hidden="true"><Icon name="cancel" /><span>cancelled · Customer reply</span></p>
      <CurvedArrow className="ob-arrow--follow" box={[49, 21]} from={[0, 13]} bend={[24, 5]} to={[44, 15]} />
      <Rays className="ob-rays--follow" d="m8 19 5-16m8 23 12-13m-4 26 16-4" />
    </div>
  );
}
