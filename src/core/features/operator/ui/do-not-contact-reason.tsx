import {importProvenance} from './import-provenance';
/** Says why a contact is Do not contact, so an imported list does not look broken. */
export function DoNotContactReason({record}:{record:{contactability?:string;contactability_reason?:string;custom_fields_json?:string}}){
 if(record.contactability!=='do_not_contact')return null;
 let imported:string|null=null;
 try{const fields=JSON.parse(record.custom_fields_json??'{}');const source=importProvenance('import_source',fields.import_source);imported=source?String(source.imported_from):null;}catch{imported=null;}
 return <p className="records-contactability-note">Orbit will not email this contact. {record.contactability_reason==='erased_address'?<>This email address was previously erased from Orbit. New contacts using it start Do not contact; no details from the erased contact are kept here. </>:record.contactability_reason==='captured_evidence'?<>This contact was created from captured evidence. A message is not permission to email them. </>:imported?<>They came in with the import “{imported}”. Orbit marks imported contacts Do not contact unless the file said they agreed to email, or when it says they unsubscribed or bounced. </>:<>Contacts get this mark when they unsubscribe, bounce or are on your Do not contact list, or when someone sets it. </>}If you know they agreed to hear from you, set Email permission to Contactable.</p>;
}
