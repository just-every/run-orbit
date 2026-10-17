The SQL in this directory is the unmodified `migrations/core/0042_record_ownership.sql`
from main `549f59d`. It creates the shipped ownership columns and triggers, rather
than approximating their schema in a test. The upgrade journey combines it with the
unchanged migrations through 0041, populates native owners and custom data at D1's
column limit, and then runs the current ownership reconciliation twice. This fixture
is deliberately independent of the current sidecar migration.
