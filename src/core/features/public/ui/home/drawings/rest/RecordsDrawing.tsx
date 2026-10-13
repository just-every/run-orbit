import { CurvedArrow } from "./CurvedArrow";
import { Icon } from "./icons";
import { HandLettering } from "../../hand/HandLettering";

const LABEL = "Drawing of a customer record: Northwind Traders, a company, with its contact Dana, the deal Northwind renewal as an opportunity, and the custom fields Renewal date 14 Nov and Seats 25.";

/** The Customer records drawing: a company record with its contact, deal and the owner's own custom fields. Sample data. */
export function RecordsDrawing() {
  return (
    <div className="ob-art ob-art--records" role="img" aria-label={LABEL}>
      <div className="ob-card ob-rec" aria-hidden="true">
        <div className="ob-lead">
          <span className="ob-avatar">NT</span>
          <div><b className="ob-name">Northwind Traders</b><span className="ob-tag">Company</span></div>
          <span className="ob-dots">···</span>
        </div>
        <hr />
        <p className="ob-label">Contact</p>
        <div className="ob-lead">
          <span className="ob-avatar ob-avatar--small"><Icon name="person" /></span>
          <div><b className="ob-name">Dana</b><span className="ob-muted">dana@northwind.example</span></div>
        </div>
        <hr />
        <p className="ob-label">Deal</p>
        <div className="ob-lead">
          <span className="ob-avatar ob-avatar--small"><Icon name="bars" /></span>
          <span>Northwind renewal</span>
          <span className="ob-tag ob-tag--peach">Opportunity</span>
        </div>
        <hr />
        <p className="ob-label">Custom fields</p>
        <p className="ob-field"><Icon name="calendar" /><span>Renewal date</span><span className="ob-value">14 Nov</span></p>
        <p className="ob-field"><Icon name="people" /><span>Seats</span><span className="ob-value">25</span></p>
      </div>
      <HandLettering className="ob-hand ob-hand--fields" lines={["YOUR", "FIELDS,", "YOUR WAY."]} />
      <CurvedArrow className="ob-arrow--fields" box={[49, 48]} from={[4, 46]} bend={[12, 18]} to={[41, 14]} />
    </div>
  );
}
