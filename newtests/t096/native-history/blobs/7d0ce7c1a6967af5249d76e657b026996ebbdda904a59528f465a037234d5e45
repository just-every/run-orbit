CREATE TABLE archive_fold_generation(singleton INTEGER PRIMARY KEY CHECK(singleton=1),generation TEXT NOT NULL);
INSERT INTO archive_fold_generation VALUES(1,'orbit-fold-1');
CREATE TABLE archive_storage_reservations(job_id TEXT PRIMARY KEY,reserved_bytes INTEGER NOT NULL CHECK(reserved_bytes>0),initial_bytes INTEGER NOT NULL CHECK(initial_bytes>=0),kind TEXT NOT NULL CHECK(kind IN('export','import')),planned_bytes INTEGER NOT NULL CHECK(planned_bytes>0));

CREATE TABLE archive_job_profiles(job_id TEXT PRIMARY KEY,generation TEXT NOT NULL CHECK(generation='orbit-fold-1'),catalog_json TEXT NOT NULL CHECK(json_valid(catalog_json)),catalog_hash TEXT NOT NULL CHECK(length(catalog_hash)=64));

CREATE TABLE archive_legacy_lineage(singleton INTEGER PRIMARY KEY CHECK(singleton=1),receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json)));
CREATE TABLE archive_part_inventory(job_id TEXT NOT NULL,part_index INTEGER NOT NULL,row_count INTEGER NOT NULL CHECK(row_count BETWEEN 1 AND 1000),PRIMARY KEY(job_id,part_index),FOREIGN KEY(job_id,part_index) REFERENCES archive_parts(job_id,part_index) ON DELETE CASCADE);

CREATE TABLE archive_storage_observations(job_id TEXT NOT NULL,phase TEXT NOT NULL,measured_bytes INTEGER NOT NULL CHECK(measured_bytes>0),high_water_bytes INTEGER NOT NULL CHECK(high_water_bytes>=measured_bytes),observed_at TEXT NOT NULL,PRIMARY KEY(job_id,phase));
