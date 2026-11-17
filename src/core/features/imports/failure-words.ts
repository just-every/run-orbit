/** An import that stops names what a person can do about it, never the database error behind it. */
export function importFailureWords(error:Error){
 const text=String(error.message);
 if(/runtime_controls/.test(text))return 'Import stopped: a record, owner or email stop this import relies on changed since it was reviewed, so nothing was changed. Reload the import history and review it again.';
 if(/NATIVE_EDIT_CONFLICT/.test(text))return 'Import stopped: a record this import wrote earlier was edited in Orbit since, so applying the same file again would overwrite that edit. Nothing more was changed and your edit is kept. Choose Undo to remove this import, or change the source file and review a new dry run.';
 if(/SOURCE_ID_CONTENT_CONFLICT/.test(text))return 'Import stopped: a row in this file has the same source ID as an earlier import but different content, so nothing was changed. Use a new import name for the changed file and review its dry run.';
 if(/TARGET_REVISION_CONFLICT/.test(text))return 'Import stopped: a record changed after this dry run was reviewed, so nothing more was changed. Run the dry run again.';
 if(/D1_ERROR|SQLITE_|constraint failed/i.test(text))return 'Import stopped: Orbit could not save the change, so nothing was changed. Reload the import history and try again.';
 return `Import stopped: ${text}`;
}
