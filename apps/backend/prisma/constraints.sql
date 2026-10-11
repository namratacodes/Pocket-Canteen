-- Run AFTER `prisma db push`. Idempotent: safe to run many times.

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_staff_canteen;
ALTER TABLE users ADD CONSTRAINT chk_staff_canteen
  CHECK ((role = 'staff' AND canteen_id IS NOT NULL) OR (role <> 'staff'));

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS chk_menu_price;
ALTER TABLE menu_items ADD CONSTRAINT chk_menu_price CHECK (price >= 0);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_item_qty;
ALTER TABLE order_items ADD CONSTRAINT chk_item_qty CHECK (quantity > 0);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_split;
ALTER TABLE orders ADD CONSTRAINT chk_order_split
  CHECK (wallet_amount_applied >= 0 AND gateway_amount >= 0
         AND wallet_amount_applied + gateway_amount = total_amount);

ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallet_balance;
ALTER TABLE wallets ADD CONSTRAINT chk_wallet_balance CHECK (balance >= 0);

ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS chk_ledger_balance_after;
ALTER TABLE wallet_ledger ADD CONSTRAINT chk_ledger_balance_after CHECK (balance_after >= 0);

ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS chk_ledger_amount_nonzero;
ALTER TABLE wallet_ledger ADD CONSTRAINT chk_ledger_amount_nonzero CHECK (amount <> 0);

ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS chk_ledger_sign;
ALTER TABLE wallet_ledger ADD CONSTRAINT chk_ledger_sign CHECK (
  (entry_type = 'checkout_hold' AND amount < 0) OR
  (entry_type IN ('hold_release', 'refund_credit', 'refund_restore') AND amount > 0) OR
  (entry_type IN ('checkout_capture', 'admin_adjustment', 'expiry'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_payment_account
  ON canteen_payment_accounts (canteen_id) WHERE is_active;

CREATE OR REPLACE FUNCTION forbid_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_append_only ON wallet_ledger;
CREATE TRIGGER trg_ledger_append_only BEFORE UPDATE OR DELETE ON wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();

DROP TRIGGER IF EXISTS trg_status_log_append_only ON order_status_log;
CREATE TRIGGER trg_status_log_append_only BEFORE UPDATE OR DELETE ON order_status_log
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();
