import { useEffect, useState } from 'react';
const dayLabel = (value: string) => new Intl.DateTimeFormat('en-US', {dateStyle: 'full', timeZone: 'UTC'}).format(new Date(`${value}T12:00:00Z`));
export function TaskCalendar({date, onDate}: {date: string; onDate: (date: string) => void}) {
 const [month, setMonth] = useState(date.slice(0, 7));
 useEffect(() => {setMonth(date.slice(0, 7));}, [date]);
 const first = new Date(`${month}-01T12:00:00Z`), days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
 const title = new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(first);
 function shift(amount: number) {const next = new Date(first); next.setUTCMonth(next.getUTCMonth() + amount); setMonth(next.toISOString().slice(0, 7));}
 return <div className="sales-task-calendar" aria-label="Activity calendar">
  <header><button type="button" aria-label="Previous month" onClick={() => shift(-1)}>←</button><strong aria-live="polite">{title}</strong><button type="button" aria-label="Next month" onClick={() => shift(1)}>→</button></header>
  <div className="sales-task-calendar__grid"><span aria-hidden="true">Su</span><span aria-hidden="true">Mo</span><span aria-hidden="true">Tu</span><span aria-hidden="true">We</span><span aria-hidden="true">Th</span><span aria-hidden="true">Fr</span><span aria-hidden="true">Sa</span>
   {Array.from({length: first.getUTCDay()}, (_, index) => <span key={`empty-${index}`}/>)}
   {Array.from({length: days}, (_, index) => {const value = `${month}-${String(index + 1).padStart(2, '0')}`; return <button type="button" key={value} aria-label={dayLabel(value)} aria-pressed={date === value} onClick={() => onDate(value)}>{index + 1}</button>;})}
  </div>
  <label>Calendar date<input type="date" required value={date} onChange={event => {if (event.target.value) onDate(event.target.value);}}/></label>
 </div>;
}
