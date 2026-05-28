-- E5 hosted steward billing (Stripe external ids; see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md)

ALTER TABLE steward_accounts ADD COLUMN billing_customer_id TEXT;
ALTER TABLE steward_accounts ADD COLUMN billing_subscription_id TEXT;

CREATE UNIQUE INDEX idx_steward_billing_customer
  ON steward_accounts (billing_customer_id)
  WHERE billing_customer_id IS NOT NULL;

CREATE UNIQUE INDEX idx_steward_billing_subscription
  ON steward_accounts (billing_subscription_id)
  WHERE billing_subscription_id IS NOT NULL;
