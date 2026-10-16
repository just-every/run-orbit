import {importProvenance} from './import-provenance';
/** Says why a contact is Do not contact, so an imported list does not look broken. */
export function DoNotContactReason({record}:{record:{contactability?:string;custom_fields_json?:string}}){
 if(record.contactability!=='do_not_contact')return null;
 let imported:string|null=null;
 try{const fields=JSON.parse(record.custom_fields_json??'{}');const source=importProvenance('import_source',fields.import_source);imported=source?String(source.imported_from):null;}catch{imported=null;}
 return <p className="records-contactability-note">Orbit will not email this contact. {imported?<>They came in with the import “{imported}”. Orbit marks imported contacts Do not contact unless the file said they agreed to email, or when it says they unsubscribed or bounced. </>:<>Contacts get this mark when they unsubscribe, bounce or are on your Do not contact list, or when someone sets it. </>}If you know they agreed to hear from you, choose <strong>Clear do-not-contact</strong>.</p>;
}
