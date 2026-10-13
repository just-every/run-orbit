/** The line icons of the four drawings, each in a 24-unit box, stroked in the current colour. */
const paths = {
  person: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-3c0-6 16-6 16 0v3Z" /></>,
  people: <><circle cx="8" cy="7" r="3" /><circle cx="18" cy="7" r="3" /><path d="M1 21v-4c0-5 13-5 13 0v4ZM16 14c5-1 7 1 7 4v2h-6" /></>,
  calendar: <><rect x="4" y="5" width="16" height="17" rx="1" /><path d="M8 3v5m8-5v5M4 10h16" /></>,
  bars: <><rect x="4" y="14" width="3" height="8" rx=".5" /><rect x="10" y="9" width="3" height="13" rx=".5" /><rect x="16" y="4" width="3" height="18" rx=".5" /></>,
  mail: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="m4 7 8 7 8-7" /></>,
  file: <path d="M5 2h10l5 5v15H5ZM15 2v6h5" />,
  building: <><rect x="3" y="3" width="18" height="19" rx="1" /><path d="M13 3v19M6 7h3m-3 5h3m-3 5h3m7-10h2m-2 5h2m-2 5h2" /></>,
  signal: <><path d="M2 8q10-9 20 0M5 12q7-7 14 0M8 16q4-4 8 0" /><circle cx="12" cy="20" r="1" /></>,
  download: <path d="M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5" />,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5" />,
  cancel: <><circle cx="12" cy="12" r="9" /><path d="m6 18 12-12" /></>
};

export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return <svg className="ob-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
