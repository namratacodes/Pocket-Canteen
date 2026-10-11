-- Read-only role for the ML team. Run once as a superuser. Replace the password first.
CREATE ROLE ml_reader LOGIN PASSWORD '<set-me>';
GRANT CONNECT ON DATABASE pocketcanteen TO ml_reader;
GRANT USAGE ON SCHEMA public TO ml_reader;
GRANT SELECT ON orders, order_items, menu_items, menu_item_prep_metadata, order_status_log TO ml_reader;
-- Deliberately NOT granted: users, wallets, wallet_ledger, refresh_tokens, otp_challenges, payment tables.
