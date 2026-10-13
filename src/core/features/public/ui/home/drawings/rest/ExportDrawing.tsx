import { CurvedArrow } from "./CurvedArrow";
import { Icon, type IconName } from "./icons";
import { HandLettering } from "../../hand/HandLettering";

const LABEL = "Drawing of Orbit's complete workspace archive, orbit-export-4f2a9c.json, listing contacts, companies, deals, signals and messages, with an Export button and a Restore button.";

/** What Orbit's export really holds: its own tables of records (archive-schema.ts reads every table but installation-bound
 * state), so only these five kinds are named. */
const contents: [IconName, string][] = [["person", "Contacts"], ["building", "Companies"], ["bars", "Deals"], ["signal", "Signals"], ["mail", "Messages"]];

/** The Export and restore drawing: the archive file, the Export button that writes it and the Restore button that reads it back. */
export function ExportDrawing() {
  return (
    <div className="ob-art ob-art--export" role="img" aria-label={LABEL}>
      <div className="ob-card ob-archive" aria-hidden="true">
        <div className="ob-lead">
          <span className="ob-file"><Icon name="file" /></span>
          <div><b className="ob-name">orbit-export-4f2a9c.json</b><span className="ob-muted">Complete workspace archive</span></div>
        </div>
        <hr />
        {contents.map(([icon, label]) => <p className="ob-field" key={label}><Icon name={icon} /><span>{label}</span></p>)}
      </div>
      <div className="ob-actions-col" aria-hidden="true">
        <span className="ob-btn ob-btn--ink"><Icon name="download" />Export</span>
        <span className="ob-btn ob-btn--line"><Icon name="upload" />Restore</span>
      </div>
      <HandLettering className="ob-hand ob-hand--backup" lines={["BACK IT UP", "ANY TIME."]} />
      <HandLettering className="ob-hand ob-hand--restore" lines={["BRING IT BACK", "WHEN YOU NEED IT."]} />
      <CurvedArrow className="ob-arrow--out" box={[70, 33]} from={[0, 23]} bend={[30, -5]} to={[63, 20]} />
      <CurvedArrow className="ob-arrow--in" box={[64, 37]} from={[58, 17]} bend={[32, 37]} to={[1, 8]} />
      <CurvedArrow className="ob-arrow--down" box={[25, 40]} from={[22, 1]} bend={[4, 8]} to={[7, 35]} />
      <CurvedArrow className="ob-arrow--up" box={[20, 42]} from={[10, 40]} bend={[-1, 24]} to={[12, 4]} />
    </div>
  );
}
