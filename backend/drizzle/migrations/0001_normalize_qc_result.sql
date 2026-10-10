-- Migration: Normalize qc_result enum to ('passed', 'rejected', 'pending')
-- Converts any legacy non-conforming fabric rolls to 'pending' for re-inspection.

UPDATE fabric_rolls SET qc_result = 'pending' WHERE qc_result::text NOT IN ('passed', 'rejected', 'pending');

CREATE TYPE qc_result_new AS ENUM ('passed', 'rejected', 'pending');
ALTER TABLE fabric_rolls ALTER COLUMN qc_result DROP DEFAULT;
ALTER TABLE fabric_rolls ALTER COLUMN qc_result TYPE qc_result_new USING (qc_result::text::qc_result_new);
DROP TYPE qc_result;
ALTER TYPE qc_result_new RENAME TO qc_result;
ALTER TABLE fabric_rolls ALTER COLUMN qc_result SET DEFAULT 'pending';
