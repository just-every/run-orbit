/** An import that stops names what a person can do about it, never the database error behind it. */
export function importFailureWords(error:Error){
 const text=String(error.message);
 if(/runtime_controls/.test(text))return 'Import stopped: a record, owner or email stop this import relies on changed since it was reviewed, so nothing was changed. Reload the import history and review it again.';
 if(/D1_ERROR|SQLITE_|constraint failed/i.test(text))return 'Import stopped: Orbit could not save the change, so nothing was changed. Reload the import history and try again.';
 return `Import stopped: ${text}`;
}
