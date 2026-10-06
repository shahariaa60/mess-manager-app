-- ============================================================
-- Mess Manager (multi-tenant) - PostgreSQL / Supabase schema
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================

CREATE TABLE IF NOT EXISTS messes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  join_date TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_members_mess ON members(mess_id);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE (mess_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_mess ON users(mess_id);
CREATE INDEX IF NOT EXISTS idx_users_member ON users(member_id);

CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  is_guest INTEGER NOT NULL DEFAULT 0,
  guest_name TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE INDEX IF NOT EXISTS idx_meals_mess_date ON meals(mess_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meals_unique
  ON meals(mess_id, member_id, date, meal_type, is_guest);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_mess_date ON expenses(mess_id, date);

CREATE TABLE IF NOT EXISTS chal (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  pots DOUBLE PRECISION NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE INDEX IF NOT EXISTS idx_chal_mess_date ON chal(mess_id, date);

CREATE TABLE IF NOT EXISTS bazaar (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE INDEX IF NOT EXISTS idx_bazaar_mess_date ON bazaar(mess_id, date);

CREATE TABLE IF NOT EXISTS bazaar_items (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  bazaar_id INTEGER NOT NULL REFERENCES bazaar(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity TEXT,
  amount DOUBLE PRECISION DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bazaar_items_bazaar ON bazaar_items(bazaar_id);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);

CREATE INDEX IF NOT EXISTS idx_payments_mess_date ON payments(mess_id, date);

-- fixed meal count override for a whole month (per mess) - Report page "Fixed meal"
CREATE TABLE IF NOT EXISTS month_settings (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  fixed_meals INTEGER,
  UNIQUE (mess_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_month_settings_mess ON month_settings(mess_id);

-- per-member fixed meal count override for a month - Report page per-row dropdown
CREATE TABLE IF NOT EXISTS meal_overrides (
  id SERIAL PRIMARY KEY,
  mess_id INTEGER NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  meals INTEGER NOT NULL,
  UNIQUE (mess_id, member_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_meal_overrides_mess ON meal_overrides(mess_id);

-- site-wide super admin account(s) - can view/edit every mess
CREATE TABLE IF NOT EXISTS site_admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
);
