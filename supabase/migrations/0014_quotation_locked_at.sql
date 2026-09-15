-- decided_at already means something else (when the customer's own
-- accept/reject decision was recorded — see src/lib/queries/today.ts's
-- "wonThisMonth" metric, keyed off status = 'accepted'). Locking a document
-- from further staff editing is a different event that can happen well
-- before any customer decision exists, so it needs its own column rather
-- than reusing decided_at and corrupting that future metric.
alter table quotations add column if not exists locked_at timestamptz;
