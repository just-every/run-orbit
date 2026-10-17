CREATE TABLE archive_file_identities (
    job_id TEXT PRIMARY KEY,
    digest TEXT NOT NULL CHECK(length(digest)=64 AND digest NOT GLOB '*[^0-9a-f]*')
);
