import { CurvedArrow, Rays } from "./CurvedArrow";
import { HandLettering } from "../../hand/HandLettering";

const LABEL = "Drawing of a new enquiry from dana@northwind.example, Requested a trial, matched by email to the existing contact Dana at Northwind.";

/** The Your contact form drawing: an enquiry on its way to the contact its email already belongs to. Sample data. */
export function FormDrawing() {
  return (
    <div className="ob-art ob-art--form" role="img" aria-label={LABEL}>
      <div className="ob-card ob-enquiry" aria-hidden="true">
        <b className="ob-enquiry-title">New enquiry</b>
        <p className="ob-label">From</p>
        <span className="ob-input">dana@northwind.example</span>
        <p className="ob-label">Message</p>
        <span className="ob-input">Requested a trial</span>
        <span className="ob-btn ob-btn--ink ob-btn--small">Submit enquiry</span>
      </div>
      <div className="ob-card ob-person" aria-hidden="true">
        <div className="ob-lead">
          <span className="ob-avatar">NT</span>
          <div><b className="ob-name">Dana</b><span className="ob-muted">dana@northwind.example</span><span className="ob-tag">Existing contact</span></div>
        </div>
        <span className="ob-dots">···</span>
      </div>
      <HandLettering className="ob-hand ob-hand--matched" lines={["MATCHED", "BY EMAIL"]} />
      <CurvedArrow className="ob-arrow--matched" box={[171, 51]} from={[3, 35]} bend={[103, -24]} to={[164, 31]} dashed />
      <Rays className="ob-rays--form" d="m3 38 14 1M10 18l12 10M28 7l4 13" />
    </div>
  );
}
