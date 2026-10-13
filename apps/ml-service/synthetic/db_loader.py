"""Loads simulated orders into the backend's Postgres schema. Dev/demo databases only."""
import hashlib, random, uuid
from datetime import timezone
from decimal import Decimal
import pandas as pd

SYN_EMAIL_DOMAIN = "@synthetic.pocketcanteen.test"
SYN_UID_PREFIX = "PKT-SYN-"


def reset_synthetic(conn) -> None:
    """order_status_log has an append-only trigger that also blocks the ON DELETE CASCADE, so disable it for this transaction."""
    with conn.transaction():
        conn.execute("ALTER TABLE order_status_log DISABLE TRIGGER trg_status_log_append_only")
        conn.execute("DELETE FROM orders WHERE order_uid LIKE %s", (SYN_UID_PREFIX + "%",))
        conn.execute("ALTER TABLE order_status_log ENABLE TRIGGER trg_status_log_append_only")
        conn.execute("DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE %s)", ("%" + SYN_EMAIL_DOMAIN,))
        conn.execute("DELETE FROM users WHERE email LIKE %s", ("%" + SYN_EMAIL_DOMAIN,))


def _h(s: str, n: int) -> str:
    return hashlib.sha1(s.encode()).hexdigest()[:n]


def load(conn, orders: pd.DataFrame, lines: pd.DataFrame, n_students: int = 1500, seed: int = 1) -> dict:
    rnd = random.Random(seed)
    students = [str(uuid.UUID(int=rnd.getrandbits(128), version=4)) for _ in range(n_students)]
    with conn.transaction():
        with conn.cursor() as cur:
            with cur.copy("COPY users (id, name, email, role) FROM STDIN") as cp:
                for i, sid in enumerate(students): cp.write_row((sid, f"Synthetic Student {i}", f"syn{i}{SYN_EMAIL_DOMAIN}", "student"))
            with cur.copy("COPY wallets (user_id, balance) FROM STDIN") as cp:
                for sid in students: cp.write_row((sid, Decimal("0")))
            with cur.copy("""COPY orders (id, order_uid, client_request_id, token_no, pickup_salt, student_id, canteen_id, status, total_amount,
                    wallet_amount_applied, gateway_amount, payment_status, payment_ref, estimated_prep_seconds, eta_source, predicted_ready_at,
                    placed_at, ready_at, actual_prep_seconds, created_at, updated_at) FROM STDIN""") as cp:
                for r in orders.itertuples():
                    total = Decimal(r.total_paise) / 100
                    cp.write_row((r.order_id, SYN_UID_PREFIX + _h(r.order_id, 8).upper(), str(uuid.uuid4()), r.token_no, _h(r.order_id, 12),
                                  rnd.choice(students), r.canteen_id, "completed", total, Decimal(0), total, "paid", "pay_syn_" + _h(r.order_id, 10),
                                  r.estimated_prep_seconds, r.eta_source, r.placed_at + pd.Timedelta(seconds=r.estimated_prep_seconds),
                                  r.placed_at, r.ready_at, r.actual_prep_seconds, r.created_at, r.completed_at))
            with cur.copy("COPY order_items (id, order_id, menu_item_id, quantity, price_at_order_time) FROM STDIN") as cp:
                for r in lines.itertuples(): cp.write_row((str(uuid.uuid4()), r.order_id, r.menu_item_id, r.quantity, Decimal(r.price_paise) / 100))
            with cur.copy("COPY order_status_log (order_id, from_status, to_status, changed_at) FROM STDIN") as cp:
                for r in orders.itertuples():
                    for frm, to, at in ((None, "pending_payment", r.created_at), ("pending_payment", "placed", r.placed_at),
                                        ("placed", "preparing", r.prep_start_at), ("preparing", "ready", r.ready_at), ("ready", "completed", r.completed_at)):
                        cp.write_row((r.order_id, frm, to, at))
    return {"students": len(students), "orders": len(orders), "order_items": len(lines), "status_log_rows": len(orders) * 5}
