-- Widen definitions without changing their column order, keys or revision meaning.
-- Value storage and the append-only definition history retain their exact bytes.
CREATE TABLE record_custom_fields_expanded (
 kind TEXT NOT NULL CHECK(kind IN('contact','company','opportunity')),
 field_key TEXT NOT NULL,
 label TEXT NOT NULL,
 value_type TEXT NOT NULL CHECK(value_type IN('text','number','date','picklist','boolean','user','datetime')),
 required INTEGER NOT NULL CHECK(required IN(0,1)),
 is_unique INTEGER NOT NULL CHECK(is_unique IN(0,1)),
 options_json TEXT NOT NULL CHECK(json_valid(options_json)),
 archived INTEGER NOT NULL CHECK(archived IN(0,1)),
 revision INTEGER NOT NULL,
 PRIMARY KEY(kind,field_key)
);
INSERT INTO record_custom_fields_expanded(kind,field_key,label,value_type,required,is_unique,options_json,archived,revision)
 SELECT kind,field_key,label,value_type,required,is_unique,options_json,archived,revision FROM record_custom_fields;
DROP TABLE record_custom_fields;
ALTER TABLE record_custom_fields_expanded RENAME TO record_custom_fields;
