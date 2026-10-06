require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'mess-manager-dev-secret';
const MANAGER_ROLES = ['admin', 'manager', 'co_manager'];

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
});

function toLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 'YYYY-MM-DD%' LIKE pattern for a month (dates stored as TEXT)
function ym(month, year) {
  return `${year}-${String(month).padStart(2, '0')}%`;
}

function genMessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function uniqueMessCode() {
  for (let i = 0; i < 20; i++) {
    const code = genMessCode();
    const clash = await db.get('SELECT id FROM messes WHERE code = $1', [code]);
    if (!clash) return code;
  }
  throw new Error('Could not generate a unique mess code');
}

// ========== AUTH HELPERS ==========

function signToken(user, messId) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role, memberId: user.member_id, messId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired login' });
  }
  try {
    const user = await db.get(
      'SELECT id, username, role, member_id, mess_id FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!user || !user.mess_id) return res.status(401).json({ error: 'Account not found' });
    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role,
      memberId: user.member_id,
      messId: user.mess_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requireManager(req, res, next) {
  if (req.user && MANAGER_ROLES.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'Manager access required' });
}

function requireLeader(req, res, next) {
  if (req.user && ['admin', 'manager'].includes(req.user.role)) return next();
  return res.status(403).json({ error: 'Manager access required' });
}

async function userPayload(user, messId) {
  const mess = await db.get('SELECT id, name, code FROM messes WHERE id = $1', [messId]);
  const member = user.member_id
    ? await db.get('SELECT id, name, phone FROM members WHERE id = $1 AND mess_id = $2', [user.member_id, messId])
    : null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: member ? member.name : user.username,
    memberId: user.member_id,
    phone: member ? member.phone || '' : '',
    messId,
    messName: mess ? mess.name : '',
    messCode: mess ? mess.code : '',
  };
}

// ========== HEALTH ==========

app.get('/', (req, res) => res.json({ ok: true, app: 'mess-manager-app-api' }));
app.get('/api/health', async (req, res) => {
  try {
    await db.get('SELECT 1 AS ok');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ========== AUTH ==========

// create a brand-new mess (registers the owner as manager + member)
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { mess_name, name, username, password } = req.body;
    if (!mess_name || !String(mess_name).trim()) return res.status(400).json({ error: 'Please enter the mess name' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter your name' });
    const uname = String(username || '').trim();
    if (uname.length < 4) return res.status(400).json({ error: 'User ID must be at least 4 characters' });
    if (!password || String(password).length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const code = await uniqueMessCode();
    const hash = bcrypt.hashSync(String(password), 10);

    const created = await db.tx(async client => {
      const mess = await client.query(
        'INSERT INTO messes (name, code) VALUES ($1, $2) RETURNING id',
        [String(mess_name).trim(), code]
      );
      const messId = mess.rows[0].id;
      const mem = await client.query(
        'INSERT INTO members (mess_id, name) VALUES ($1, $2) RETURNING id',
        [messId, String(name).trim()]
      );
      const memberId = mem.rows[0].id;
      const u = await client.query(
        `INSERT INTO users (mess_id, username, password, role, member_id)
         VALUES ($1, $2, $3, 'manager', $4) RETURNING id`,
        [messId, uname, hash, memberId]
      );
      return { messId, userId: u.rows[0].id, username: uname, role: 'manager', member_id: memberId };
    });

    const full = await db.get('SELECT * FROM users WHERE id = $1', [created.userId]);
    res.json({
      token: signToken(full, created.messId),
      user: await userPayload(full, created.messId),
    });
  } catch (err) {
    if (err && err.code === '23505') return res.status(400).json({ error: 'This User ID is already registered in this mess' });
    next(err);
  }
});

// join an existing mess with its code (self-service member signup)
app.post('/api/auth/join', async (req, res, next) => {
  try {
    const { mess_code, name, username, password } = req.body;
    const code = String(mess_code || '').trim();
    if (!code) return res.status(400).json({ error: 'Please enter the Mess Code' });
    const mess = await db.get('SELECT id FROM messes WHERE upper(code) = upper($1)', [code]);
    if (!mess) return res.status(400).json({ error: 'Invalid Mess Code' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter your name' });
    const uname = String(username || '').trim();
    if (uname.length < 4) return res.status(400).json({ error: 'User ID must be at least 4 characters' });
    if (!password || String(password).length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const hash = bcrypt.hashSync(String(password), 10);
    const created = await db.tx(async client => {
      const mem = await client.query(
        'INSERT INTO members (mess_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
        [mess.id, String(name).trim(), uname]
      );
      const memberId = mem.rows[0].id;
      const u = await client.query(
        `INSERT INTO users (mess_id, username, password, role, member_id)
         VALUES ($1, $2, $3, 'member', $4) RETURNING id`,
        [mess.id, uname, hash, memberId]
      );
      return { messId: mess.id, userId: u.rows[0].id };
    });

    const full = await db.get('SELECT * FROM users WHERE id = $1', [created.userId]);
    res.json({
      token: signToken(full, created.messId),
      user: await userPayload(full, created.messId),
    });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(400).json({ error: 'This User ID is already registered in this mess' });
    }
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { mess_code, username, password } = req.body;
    const code = String(mess_code || '').trim();
    if (!code || !username || !password) {
      return res.status(400).json({ error: 'Enter Mess Code, User ID and Password' });
    }
    const mess = await db.get('SELECT id FROM messes WHERE upper(code) = upper($1)', [code]);
    if (!mess) return res.status(401).json({ error: 'Invalid Mess Code' });
    const user = await db.get(
      'SELECT * FROM users WHERE mess_id = $1 AND lower(username) = lower($2)',
      [mess.id, String(username).trim()]
    );
    if (!user || !bcrypt.compareSync(String(password), user.password)) {
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }
    res.json({
      token: signToken(user, mess.id),
      user: await userPayload(user, mess.id),
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/auth/me', authenticate, async (req, res, next) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = $1 AND mess_id = $2', [req.user.userId, req.user.messId]);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    res.json(await userPayload(user, req.user.messId));
  } catch (err) {
    next(err);
  }
});

app.put('/api/auth/password', authenticate, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || String(new_password).length < 4) {
      return res.status(400).json({ error: 'নতুন password কমপক্ষে ৪ অক্ষরের হতে হবে' });
    }
    const user = await db.get('SELECT * FROM users WHERE id = $1 AND mess_id = $2', [req.user.userId, req.user.messId]);
    if (!user || !bcrypt.compareSync(current_password || '', user.password)) {
      return res.status(401).json({ error: 'বর্তমান password ভুল' });
    }
    await db.query('UPDATE users SET password = $1 WHERE id = $2 AND mess_id = $3', [
      bcrypt.hashSync(String(new_password), 10), req.user.userId, req.user.messId,
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// change own phone number = change own login username (member-linked accounts)
app.put('/api/auth/number', authenticate, async (req, res, next) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = $1 AND mess_id = $2', [req.user.userId, req.user.messId]);
    if (!user || !user.member_id) {
      return res.status(400).json({ error: 'এই account-এর number বদলানো যায় না' });
    }
    const phone = String(req.body.new_phone || '').trim();
    if (phone.length < 4) return res.status(400).json({ error: 'নতুন নম্বর প্রবেশ করুন' });
    const clash = await db.get(
      'SELECT id FROM users WHERE mess_id = $1 AND lower(username) = lower($2) AND id != $3',
      [req.user.messId, phone, req.user.userId]
    );
    if (clash) return res.status(400).json({ error: 'এই নম্বরটি অন্য account-এ আছে' });
    await db.query('UPDATE members SET phone = $1 WHERE id = $2 AND mess_id = $3', [phone, user.member_id, req.user.messId]);
    await db.query('UPDATE users SET username = $1 WHERE id = $2 AND mess_id = $3', [phone, req.user.userId, req.user.messId]);
    res.json({ success: true, username: phone });
  } catch (err) {
    if (err && err.code === '23505') return res.status(400).json({ error: 'এই নম্বরটি অন্য account-এ আছে' });
    next(err);
  }
});

// ========== MEMBERS ==========

app.get('/api/members', authenticate, requireManager, async (req, res, next) => {
  try {
    const members = await db.all(`
      SELECT m.*, u.role, u.username AS login_username
      FROM members m
      LEFT JOIN users u ON u.member_id = m.id AND u.mess_id = m.mess_id
      WHERE m.mess_id = $1
      ORDER BY m.name
    `, [req.user.messId]);
    res.json(members);
  } catch (err) { next(err); }
});

app.post('/api/members', authenticate, requireManager, async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    const phoneNo = String(phone || '').trim();
    if (phoneNo.length < 4) {
      return res.status(400).json({ error: 'Phone number is required - এটাই login username হবে' });
    }
    const clash = await db.get(
      'SELECT id FROM users WHERE mess_id = $1 AND lower(username) = lower($2)',
      [req.user.messId, phoneNo]
    );
    if (clash) return res.status(400).json({ error: 'এই মেসে এই নম্বরে ইতিমধ্যে account আছে' });

    const result = await db.tx(async client => {
      const mem = await client.query(
        'INSERT INTO members (mess_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
        [req.user.messId, String(name).trim(), phoneNo]
      );
      const memberId = mem.rows[0].id;
      await client.query(
        `INSERT INTO users (mess_id, username, password, role, member_id)
         VALUES ($1, $2, $3, 'member', $4)`,
        [req.user.messId, phoneNo, bcrypt.hashSync(phoneNo, 10), memberId]
      );
      return memberId;
    });
    res.json({ id: result });
  } catch (err) {
    if (err && err.code === '23505') return res.status(400).json({ error: 'এই মেসে এই নম্বরে ইতিমধ্যে account আছে' });
    next(err);
  }
});

app.put('/api/members/:id', authenticate, requireManager, async (req, res, next) => {
  try {
    const old = await db.get('SELECT * FROM members WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    if (!old) return res.status(404).json({ error: 'Member not found' });
    const { name, phone, is_active } = req.body;
    const newPhone = phone === undefined ? old.phone : String(phone).trim();
    if (newPhone && newPhone.length >= 4) {
      const clash = await db.get(
        `SELECT u.id FROM users u JOIN members m ON u.member_id = m.id
         WHERE u.mess_id = $1 AND lower(u.username) = lower($2) AND m.id != $3`,
        [req.user.messId, newPhone, req.params.id]
      );
      if (clash) return res.status(400).json({ error: 'এই নম্বরটি অন্য account-এ আছে' });
    }
    await db.tx(async client => {
      await client.query(
        'UPDATE members SET name = $1, phone = $2, is_active = $3 WHERE id = $4 AND mess_id = $5',
        [name ?? old.name, newPhone ?? old.phone, is_active ?? old.is_active, req.params.id, req.user.messId]
      );
      if (newPhone && newPhone !== old.phone) {
        await client.query(
          'UPDATE users SET username = $1 WHERE member_id = $2 AND mess_id = $3',
          [newPhone, req.params.id, req.user.messId]
        );
      }
    });
    res.json({ success: true });
  } catch (err) {
    if (err && err.code === '23505') return res.status(400).json({ error: 'এই নম্বরটি অন্য account-এ আছে' });
    next(err);
  }
});

app.delete('/api/members/:id', authenticate, requireManager, async (req, res, next) => {
  try {
    const member = await db.get('SELECT * FROM members WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const { month, year } = req.body || {};
    const mid = req.user.messId;

    // no month given -> plain deactivate, keep all history
    if (!month || !year) {
      await db.query('UPDATE members SET is_active = 0 WHERE id = $1 AND mess_id = $2', [req.params.id, mid]);
      return res.json({ success: true, deactivated: true, purged: null });
    }

    const cutoff = `${year}-${String(month).padStart(2, '0')}-01`;

    const purged = await db.tx(async client => {
      const meals = await client.query(
        'DELETE FROM meals WHERE mess_id = $1 AND member_id = $2 AND date >= $3', [mid, req.params.id, cutoff]
      );
      const chal = await client.query(
        'DELETE FROM chal WHERE mess_id = $1 AND member_id = $2 AND date >= $3', [mid, req.params.id, cutoff]
      );
      const bazaar = await client.query(
        'DELETE FROM bazaar WHERE mess_id = $1 AND member_id = $2 AND date >= $3', [mid, req.params.id, cutoff]
      );
      const payments = await client.query(
        'DELETE FROM payments WHERE mess_id = $1 AND member_id = $2 AND date >= $3', [mid, req.params.id, cutoff]
      );
      await client.query('DELETE FROM meal_overrides WHERE mess_id = $1 AND member_id = $2', [mid, req.params.id]);
      await client.query('UPDATE members SET is_active = 0 WHERE id = $1 AND mess_id = $2', [req.params.id, mid]);
      return { meals: meals.rowCount, chal: chal.rowCount, bazaar: bazaar.rowCount, payments: payments.rowCount };
    });

    res.json({ success: true, deactivated: true, from: cutoff, purged });
  } catch (err) { next(err); }
});

async function getOrCreateUserForMember(memberId, messId) {
  const member = await db.get('SELECT * FROM members WHERE id = $1 AND mess_id = $2', [memberId, messId]);
  if (!member) return null;
  let user = await db.get('SELECT * FROM users WHERE member_id = $1 AND mess_id = $2', [memberId, messId]);
  if (user) return user;
  const phone = member.phone && String(member.phone).trim().length >= 4 ? String(member.phone).trim() : null;
  let username = phone || `member${memberId}`;
  const clash = await db.get('SELECT id FROM users WHERE mess_id = $1 AND lower(username) = lower($2)', [messId, username]);
  if (clash) username = `member${memberId}`;
  await db.query(
    `INSERT INTO users (mess_id, username, password, role, member_id) VALUES ($1, $2, $3, 'member', $4)`,
    [messId, username, bcrypt.hashSync(phone || username, 10), memberId]
  );
  return db.get('SELECT * FROM users WHERE member_id = $1 AND mess_id = $2', [memberId, messId]);
}

app.post('/api/admin/assign-manager', authenticate, requireLeader, async (req, res, next) => {
  try {
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });
    const exists = await db.get('SELECT id FROM members WHERE id = $1 AND mess_id = $2', [member_id, req.user.messId]);
    if (!exists) return res.status(404).json({ error: 'Member not found' });
    const memberUser = await getOrCreateUserForMember(member_id, req.user.messId);
    await db.tx(async client => {
      await client.query(
        "UPDATE users SET role = 'member' WHERE mess_id = $1 AND member_id IS NOT NULL AND role IN ('manager', 'co_manager')",
        [req.user.messId]
      );
      await client.query("UPDATE users SET role = 'manager' WHERE member_id = $1 AND mess_id = $2", [member_id, req.user.messId]);
    });
    res.json({ success: true, login_username: memberUser.username });
  } catch (err) { next(err); }
});

app.post('/api/admin/assign-co-manager', authenticate, requireLeader, async (req, res, next) => {
  try {
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });
    const exists = await db.get('SELECT id FROM members WHERE id = $1 AND mess_id = $2', [member_id, req.user.messId]);
    if (!exists) return res.status(404).json({ error: 'Member not found' });
    const memberUser = await getOrCreateUserForMember(member_id, req.user.messId);
    await db.tx(async client => {
      await client.query("UPDATE users SET role = 'member' WHERE mess_id = $1 AND role = 'co_manager'", [req.user.messId]);
      await client.query("UPDATE users SET role = 'co_manager' WHERE member_id = $1 AND mess_id = $2", [member_id, req.user.messId]);
    });
    res.json({ success: true, login_username: memberUser.username });
  } catch (err) { next(err); }
});

// MANAGER ONLY: erase all records of one month (own mess only)
app.post('/api/admin/clear-month', authenticate, requireLeader, async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const pattern = ym(month, year);
    const mid = req.user.messId;

    const cleared = await db.tx(async client => {
      const meals = await client.query(
        "DELETE FROM meals WHERE mess_id = $1 AND date LIKE $2", [mid, pattern]
      );
      const bazaarItems = await client.query(
        `DELETE FROM bazaar_items WHERE mess_id = $1 AND bazaar_id IN
         (SELECT id FROM bazaar WHERE mess_id = $1 AND date LIKE $2)`, [mid, pattern]
      );
      const bazaar = await client.query(
        'DELETE FROM bazaar WHERE mess_id = $1 AND date LIKE $2', [mid, pattern]
      );
      const chal = await client.query(
        'DELETE FROM chal WHERE mess_id = $1 AND date LIKE $2', [mid, pattern]
      );
      const expenses = await client.query(
        'DELETE FROM expenses WHERE mess_id = $1 AND date LIKE $2', [mid, pattern]
      );
      const payments = await client.query(
        'DELETE FROM payments WHERE mess_id = $1 AND date LIKE $2', [mid, pattern]
      );
      return {
        meals: meals.rowCount,
        bazaarItems: bazaarItems.rowCount,
        bazaar: bazaar.rowCount,
        chal: chal.rowCount,
        expenses: expenses.rowCount,
        payments: payments.rowCount,
      };
    });
    res.json(cleared);
  } catch (err) { next(err); }
});

// admin/manager: reset a password inside own mess
app.put('/api/admin/reset-password', authenticate, async (req, res, next) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Manager access required' });
    }
    const { member_id, username, new_password } = req.body;
    if (!new_password || String(new_password).length < 4) {
      return res.status(400).json({ error: 'নতুন password কমপক্ষে ৪ অক্ষরের হতে হবে' });
    }
    if (!member_id && !username) {
      return res.status(400).json({ error: 'member_id অথবা username দিতে হবে' });
    }
    const user = member_id
      ? await db.get('SELECT * FROM users WHERE member_id = $1 AND mess_id = $2', [member_id, req.user.messId])
      : await db.get('SELECT * FROM users WHERE mess_id = $1 AND lower(username) = lower($2)', [req.user.messId, String(username).trim()]);
    if (!user) return res.status(404).json({ error: 'এই member/user-এর login account পাওয়া যায়নি' });
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'শুধু মেসের নির্মাতা admin-ই admin account-এর password বদলাতে পারে' });
    }
    await db.query('UPDATE users SET password = $1 WHERE id = $2 AND mess_id = $3', [
      bcrypt.hashSync(String(new_password), 10), user.id, req.user.messId,
    ]);
    res.json({ success: true, username: user.username });
  } catch (err) { next(err); }
});

// ========== MY (member self-service, registered before global guard) ==========

app.get('/api/my/meals', authenticate, async (req, res, next) => {
  try {
    if (!req.user.memberId) return res.json({ total_meals: 0, breakfast: 0, lunch: 0, dinner: 0, guest: 0 });
    const now = new Date();
    const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || String(now.getFullYear());
    const row = await db.get(`
      SELECT
        COALESCE(SUM(CASE WHEN meal_type = 'breakfast' AND is_guest = 0 THEN 1 ELSE 0 END), 0) breakfast,
        COALESCE(SUM(CASE WHEN meal_type = 'lunch' AND is_guest = 0 THEN 1 ELSE 0 END), 0) lunch,
        COALESCE(SUM(CASE WHEN meal_type = 'dinner' AND is_guest = 0 THEN 1 ELSE 0 END), 0) dinner,
        COALESCE(SUM(CASE WHEN is_guest = 1 THEN 1 ELSE 0 END), 0) guest,
        COUNT(*) total_meals
      FROM meals
      WHERE mess_id = $1 AND member_id = $2 AND date LIKE $3
    `, [req.user.messId, req.user.memberId, ym(month, year)]);
    res.json({
      total_meals: row ? row.total_meals : 0,
      breakfast: row ? row.breakfast : 0,
      lunch: row ? row.lunch : 0,
      dinner: row ? row.dinner : 0,
      guest: row ? row.guest : 0,
    });
  } catch (err) { next(err); }
});

app.get('/api/my/meals/date/:date', authenticate, async (req, res, next) => {
  try {
    const result = { date: req.params.date, breakfast: 0, lunch: 0, dinner: 0, guest: 0, total: 0 };
    if (!req.user.memberId) return res.json(result);
    const rows = await db.all(`
      SELECT meal_type, is_guest, COUNT(*)::int AS c FROM meals
      WHERE mess_id = $1 AND member_id = $2 AND date = $3
      GROUP BY meal_type, is_guest
    `, [req.user.messId, req.user.memberId, req.params.date]);
    for (const row of rows) {
      if (row.is_guest) result.guest += row.c;
      else result[row.meal_type] += row.c;
    }
    result.total = result.breakfast + result.lunch + result.dinner + result.guest;
    res.json(result);
  } catch (err) { next(err); }
});

app.get('/api/my/chal', authenticate, async (req, res, next) => {
  try {
    if (!req.user.memberId) return res.json({ total: 0, month_total: 0 });
    const now = new Date();
    const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || String(now.getFullYear());
    const monthRow = await db.get(
      'SELECT COALESCE(SUM(pots), 0) AS total FROM chal WHERE mess_id = $1 AND member_id = $2 AND date LIKE $3',
      [req.user.messId, req.user.memberId, ym(month, year)]
    );
    const monthMealsRow = await db.get(
      'SELECT COUNT(*)::int AS c FROM meals WHERE mess_id = $1 AND member_id = $2 AND date LIKE $3',
      [req.user.messId, req.user.memberId, ym(month, year)]
    );
    const all = await db.get(
      'SELECT COALESCE(SUM(pots), 0) AS all_pots FROM chal WHERE mess_id = $1 AND member_id = $2',
      [req.user.messId, req.user.memberId]
    );
    const allMeals = await db.get(
      'SELECT COUNT(*)::int AS c FROM meals WHERE mess_id = $1 AND member_id = $2',
      [req.user.messId, req.user.memberId]
    );
    const all_pots = Number(all.all_pots) || 0;
    const all_meals = Number(allMeals.c) || 0;
    const balance = Math.round((all_pots - all_meals) * 10) / 10;
    res.json({
      total: Number(monthRow.total),
      month_total: Number(monthRow.total),
      month_meals: Number(monthMealsRow.c) || 0,
      balance,
    });
  } catch (err) { next(err); }
});

app.get('/api/my/report/:month/:year', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.params;
    const full = await buildReport(month, year, req.user.messId);
    const own = full.memberBills.find(m => m.id === req.user.memberId) || null;
    res.json({
      ...full,
      memberBills: own ? [own] : [],
      onlyOwn: true,
    });
  } catch (err) { next(err); }
});

app.get('/api/my/dashboard', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const pattern = ym(month, year);
    let monthMeals = 0;
    let monthChal = 0;
    if (req.user.memberId) {
      const mealRow = await db.get(
        'SELECT COUNT(*)::int AS c FROM meals WHERE mess_id = $1 AND member_id = $2 AND date LIKE $3',
        [req.user.messId, req.user.memberId, pattern]
      );
      const chalRow = await db.get(
        'SELECT COALESCE(SUM(pots), 0) AS c FROM chal WHERE mess_id = $1 AND member_id = $2 AND date LIKE $3',
        [req.user.messId, req.user.memberId, pattern]
      );
      monthMeals = mealRow.c;
      monthChal = Number(chalRow.c);
    }
    res.json({ month, year, monthMeals, monthChal });
  } catch (err) { next(err); }
});

// ========== GLOBAL GUARD ==========
// every remaining /api route below requires an authenticated manager of its own mess
app.use('/api', (req, res, next) => {
  authenticate(req, res, () => {
    if (!req.user || !MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Manager access required' });
    }
    next();
  });
});

// ========== MEALS ==========

app.get('/api/meals', async (req, res, next) => {
  try {
    const { date, month, year } = req.query;
    const params = [req.user.messId];
    let query = `
      SELECT meals.*, members.name as member_name
      FROM meals
      JOIN members ON meals.member_id = members.id AND members.mess_id = meals.mess_id
      WHERE meals.mess_id = $1
    `;
    if (date) {
      params.push(date);
      query += ` AND meals.date = $${params.length}`;
    }
    if (month && year) {
      params.push(ym(month, year));
      query += ` AND meals.date LIKE $${params.length}`;
    }
    query += ' ORDER BY meals.date DESC, meals.created_at DESC';
    res.json(await db.all(query, params));
  } catch (err) { next(err); }
});

app.get('/api/meals/counts/:date', async (req, res, next) => {
  try {
    const counts = await db.all(`
      SELECT meal_type, COUNT(*) as count
      FROM meals WHERE mess_id = $1 AND date = $2
      GROUP BY meal_type
    `, [req.user.messId, req.params.date]);
    const result = { breakfast: 0, lunch: 0, dinner: 0 };
    counts.forEach(c => { result[c.meal_type] = Number(c.count); });
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/api/meals', async (req, res, next) => {
  try {
    const { member_id, date, meal_type } = req.body;
    if (!member_id || !date || !meal_type) {
      return res.status(400).json({ error: 'member_id, date, and meal_type are required' });
    }
    const member = await db.get('SELECT id FROM members WHERE id = $1 AND mess_id = $2', [member_id, req.user.messId]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const existing = await db.get(
      'SELECT id FROM meals WHERE mess_id = $1 AND member_id = $2 AND date = $3 AND meal_type = $4 AND is_guest = 0',
      [req.user.messId, member_id, date, meal_type]
    );
    if (existing) return res.status(400).json({ error: 'Meal already added for this member on this date' });
    const r = await db.get(
      'INSERT INTO meals (mess_id, member_id, date, meal_type) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.messId, member_id, date, meal_type]
    );
    res.json({ id: r.id });
  } catch (err) { next(err); }
});

app.post('/api/meals/bulk', async (req, res, next) => {
  try {
    const { member_ids, date, meal_type } = req.body;
    if (!member_ids?.length || !date || !meal_type) {
      return res.status(400).json({ error: 'member_ids, date, and meal_type are required' });
    }
    await db.tx(async client => {
      for (const id of member_ids) {
        await client.query(
          `INSERT INTO meals (mess_id, member_id, date, meal_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (mess_id, member_id, date, meal_type, is_guest) DO NOTHING`,
          [req.user.messId, id, date, meal_type]
        );
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// additive: add selected members' meals (skip ones already recorded)
app.post('/api/meals/toggle', async (req, res, next) => {
  try {
    const { member_ids, date, meal_type } = req.body;
    if (!date || !meal_type) {
      return res.status(400).json({ error: 'date and meal_type are required' });
    }
    await db.tx(async client => {
      for (const id of (member_ids || [])) {
        await client.query(
          `INSERT INTO meals (mess_id, member_id, date, meal_type, is_guest)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT (mess_id, member_id, date, meal_type, is_guest) DO NOTHING`,
          [req.user.messId, id, date, meal_type]
        );
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.post('/api/meals/unmark', async (req, res, next) => {
  try {
    const { member_ids, date, meal_type } = req.body;
    if (!date || !meal_type) {
      return res.status(400).json({ error: 'date and meal_type are required' });
    }
    await db.tx(async client => {
      for (const id of (member_ids || [])) {
        await client.query(
          'DELETE FROM meals WHERE mess_id = $1 AND date = $2 AND meal_type = $3 AND is_guest = 0 AND member_id = $4',
          [req.user.messId, date, meal_type, id]
        );
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.post('/api/meals/guest', async (req, res, next) => {
  try {
    const { member_id, date, meal_type, guest_name } = req.body;
    if (!member_id || !date || !meal_type) {
      return res.status(400).json({ error: 'member_id, date, and meal_type are required' });
    }
    const existing = await db.get(
      'SELECT id FROM meals WHERE mess_id = $1 AND member_id = $2 AND date = $3 AND meal_type = $4 AND is_guest = 1',
      [req.user.messId, member_id, date, meal_type]
    );
    if (existing) {
      await db.query('DELETE FROM meals WHERE id = $1 AND mess_id = $2', [existing.id, req.user.messId]);
      return res.json({ success: true, removed: true });
    }
    const r = await db.get(
      'INSERT INTO meals (mess_id, member_id, date, meal_type, is_guest, guest_name) VALUES ($1, $2, $3, $4, 1, $5) RETURNING id',
      [req.user.messId, member_id, date, meal_type, guest_name || 'Guest']
    );
    res.json({ id: r.id, removed: false });
  } catch (err) { next(err); }
});

app.delete('/api/meals/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM meals WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ========== CHAL (RICE) ==========

app.get('/api/chal', async (req, res, next) => {
  try {
    const { date, month, year } = req.query;
    const params = [req.user.messId];
    let query = `
      SELECT chal.*, members.name as member_name
      FROM chal
      JOIN members ON chal.member_id = members.id AND members.mess_id = chal.mess_id
      WHERE chal.mess_id = $1
    `;
    if (date) {
      params.push(date);
      query += ` AND chal.date = $${params.length}`;
    }
    if (month && year) {
      params.push(ym(month, year));
      query += ` AND chal.date LIKE $${params.length}`;
    }
    query += ' ORDER BY chal.date DESC, chal.created_at DESC';
    res.json(await db.all(query, params));
  } catch (err) { next(err); }
});

app.post('/api/chal', async (req, res, next) => {
  try {
    const { member_id, date, pots } = req.body;
    if (!member_id || !date || !pots) {
      return res.status(400).json({ error: 'member_id, date, and pots are required' });
    }
    const member = await db.get('SELECT id FROM members WHERE id = $1 AND mess_id = $2', [member_id, req.user.messId]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const r = await db.get(
      'INSERT INTO chal (mess_id, member_id, date, pots) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.messId, member_id, date, pots]
    );
    res.json({ id: r.id });
  } catch (err) { next(err); }
});

app.post('/api/chal/bulk', async (req, res, next) => {
  try {
    const { entries, date } = req.body;
    if (!entries?.length || !date) {
      return res.status(400).json({ error: 'entries and date are required' });
    }
    await db.tx(async client => {
      for (const e of entries) {
        await client.query(
          'INSERT INTO chal (mess_id, member_id, date, pots) VALUES ($1, $2, $3, $4)',
          [req.user.messId, e.member_id, date, e.pots]
        );
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.delete('/api/chal/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM chal WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// monthly chal account per member:
// - month_pots: chal deposited this month
// - month_meals: real meals (incl. guest) eaten this month
// - balance: running balance = all-time pots deposited - all-time real meals
app.get('/api/chal/account', async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || String(now.getFullYear());
    const mid = req.user.messId;
    const pattern = ym(month, year);

    const rows = await db.all(`
      SELECT members.id, members.name,
        COALESCE((SELECT SUM(pots) FROM chal c WHERE c.member_id = members.id AND c.mess_id = members.mess_id
          AND c.date LIKE $2), 0) as month_pots,
        COALESCE((SELECT COUNT(*) FROM meals x WHERE x.member_id = members.id AND x.mess_id = members.mess_id
          AND x.date LIKE $2), 0) as month_meals,
        COALESCE((SELECT COUNT(*) FROM meals x WHERE x.member_id = members.id AND x.mess_id = members.mess_id
          AND x.is_guest = 1 AND x.date LIKE $2), 0) as month_guest,
        COALESCE((SELECT SUM(pots) FROM chal c WHERE c.member_id = members.id AND c.mess_id = members.mess_id), 0) as all_pots,
        COALESCE((SELECT COUNT(*) FROM meals x WHERE x.member_id = members.id AND x.mess_id = members.mess_id), 0) as all_meals
      FROM members
      WHERE members.mess_id = $1
        AND (members.is_active = 1 OR EXISTS (
          SELECT 1 FROM meals m3 WHERE m3.member_id = members.id AND m3.mess_id = members.mess_id
            AND m3.date LIKE $2
        ))
      ORDER BY members.name
    `, [mid, pattern]);

    const memberRows = rows.map(r => {
      const balance = Math.round((Number(r.all_pots) - Number(r.all_meals)) * 10) / 10;
      return {
        id: r.id,
        name: r.name,
        month_pots: Number(r.month_pots),
        month_meals: Number(r.month_meals),
        month_guest: Number(r.month_guest),
        balance,
      };
    });
    const totalPots = memberRows.reduce((s, r) => s + r.month_pots, 0);
    const totalMeals = memberRows.reduce((s, r) => s + r.month_meals, 0);
    const totalGuest = memberRows.reduce((s, r) => s + r.month_guest, 0);
    res.json({ month, year, rows: memberRows, totalPots, totalMeals, totalGuest });
  } catch (err) { next(err); }
});

// ========== BAZAAR ==========

app.get('/api/bazaar', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const params = [req.user.messId];
    let query = `
      SELECT bazaar.*, members.name as member_name
      FROM bazaar
      JOIN members ON bazaar.member_id = members.id AND members.mess_id = bazaar.mess_id
      WHERE bazaar.mess_id = $1
    `;
    if (month && year) {
      params.push(ym(month, year));
      query += ` AND bazaar.date LIKE $${params.length}`;
    }
    query += ' ORDER BY bazaar.date DESC, bazaar.created_at DESC';
    const bazaars = await db.all(query, params);
    const itemsStmt = await Promise.all(
      bazaars.map(b => db.all('SELECT * FROM bazaar_items WHERE bazaar_id = $1 AND mess_id = $2', [b.id, req.user.messId]))
    );
    const result = bazaars.map((b, i) => ({ ...b, items: itemsStmt[i] }));
    res.json(result);
  } catch (err) { next(err); }
});

app.post('/api/bazaar', async (req, res, next) => {
  try {
    const { member_id, date, total_amount, notes, items } = req.body;
    if (!member_id || !date) {
      return res.status(400).json({ error: 'member_id and date are required' });
    }
    const member = await db.get('SELECT id FROM members WHERE id = $1 AND mess_id = $2', [member_id, req.user.messId]);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const id = await db.tx(async client => {
      const b = await client.query(
        'INSERT INTO bazaar (mess_id, member_id, date, total_amount, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user.messId, member_id, date, total_amount || 0, notes || '']
      );
      const bazaarId = b.rows[0].id;
      if (items?.length) {
        for (const item of items) {
          await client.query(
            'INSERT INTO bazaar_items (mess_id, bazaar_id, item_name, quantity, amount) VALUES ($1, $2, $3, $4, $5)',
            [req.user.messId, bazaarId, item.item_name, item.quantity || '', item.amount || 0]
          );
        }
      }
      return bazaarId;
    });
    res.json({ id });
  } catch (err) { next(err); }
});

app.put('/api/bazaar/:id', async (req, res, next) => {
  try {
    const old = await db.get('SELECT id FROM bazaar WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    if (!old) return res.status(404).json({ error: 'Bazaar not found' });
    const { member_id, date, total_amount, notes, items } = req.body;
    await db.tx(async client => {
      await client.query(
        'UPDATE bazaar SET member_id = $1, date = $2, total_amount = $3, notes = $4 WHERE id = $5 AND mess_id = $6',
        [member_id, date, total_amount || 0, notes || '', req.params.id, req.user.messId]
      );
      await client.query('DELETE FROM bazaar_items WHERE bazaar_id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
      if (items?.length) {
        for (const item of items) {
          await client.query(
            'INSERT INTO bazaar_items (mess_id, bazaar_id, item_name, quantity, amount) VALUES ($1, $2, $3, $4, $5)',
            [req.user.messId, req.params.id, item.item_name, item.quantity || '', item.amount || 0]
          );
        }
      }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.delete('/api/bazaar/:id', async (req, res, next) => {
  try {
    await db.tx(async client => {
      await client.query('DELETE FROM bazaar_items WHERE bazaar_id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
      await client.query('DELETE FROM bazaar WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ========== EXPENSES ==========

app.get('/api/expenses', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const params = [req.user.messId];
    let query = 'SELECT * FROM expenses WHERE mess_id = $1';
    if (month && year) {
      params.push(ym(month, year));
      query += ` AND date LIKE $${params.length}`;
    }
    query += ' ORDER BY date DESC, created_at DESC';
    res.json(await db.all(query, params));
  } catch (err) { next(err); }
});

app.post('/api/expenses', async (req, res, next) => {
  try {
    const { category, amount, description, date } = req.body;
    if (!category || !amount || !date) {
      return res.status(400).json({ error: 'category, amount, and date are required' });
    }
    const r = await db.get(
      'INSERT INTO expenses (mess_id, category, amount, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.messId, category, amount, description || '', date]
    );
    res.json({ id: r.id });
  } catch (err) { next(err); }
});

app.delete('/api/expenses/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM expenses WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ========== PAYMENTS ==========

app.get('/api/payments', async (req, res, next) => {
  try {
    const { month, year, member_id } = req.query;
    const params = [req.user.messId];
    let query = `
      SELECT payments.*, members.name as member_name
      FROM payments
      JOIN members ON payments.member_id = members.id AND members.mess_id = payments.mess_id
      WHERE payments.mess_id = $1
    `;
    if (month && year) {
      params.push(ym(month, year));
      query += ` AND payments.date LIKE $${params.length}`;
    }
    if (member_id) {
      params.push(member_id);
      query += ` AND payments.member_id = $${params.length}`;
    }
    query += ' ORDER BY payments.date DESC, payments.created_at DESC';
    res.json(await db.all(query, params));
  } catch (err) { next(err); }
});

app.post('/api/payments', async (req, res, next) => {
  try {
    const { member_id, amount, date, notes } = req.body;
    if (!member_id || !amount || !date) {
      return res.status(400).json({ error: 'member_id, amount, and date are required' });
    }
    const member = await db.get('SELECT id FROM members WHERE id = $1 AND mess_id = $2', [member_id, req.user.messId]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const r = await db.get(
      'INSERT INTO payments (mess_id, member_id, amount, date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.messId, member_id, amount, date, notes || '']
    );
    res.json({ id: r.id });
  } catch (err) { next(err); }
});

app.delete('/api/payments/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM payments WHERE id = $1 AND mess_id = $2', [req.params.id, req.user.messId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ========== DASHBOARD ==========

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
    const year = req.query.year || String(now.getFullYear());
    const today = toLocalDate(now);
    const isCurrentMonth = month === String(now.getMonth() + 1).padStart(2, '0') && year === String(now.getFullYear());
    const mid = req.user.messId;
    const monthPattern = ym(month, year);

    const totalMembers = await db.get(
      'SELECT COUNT(*)::int as count FROM members WHERE mess_id = $1 AND is_active = 1', [mid]
    );

    const todayMealCounts = await db.all(
      'SELECT meal_type, COUNT(*) as count FROM meals WHERE mess_id = $1 AND date = $2 GROUP BY meal_type',
      [mid, today]
    );
    const todayMeals = { breakfast: 0, lunch: 0, dinner: 0 };
    todayMealCounts.forEach(c => { todayMeals[c.meal_type] = Number(c.count); });

    const monthExpenses = await db.get(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE mess_id = $1 AND date LIKE $2',
      [mid, monthPattern]
    );
    const monthMeals = await db.get(
      'SELECT COUNT(*) as count FROM meals WHERE mess_id = $1 AND date LIKE $2',
      [mid, monthPattern]
    );
    const monthChal = await db.get(
      'SELECT COALESCE(SUM(pots), 0) as total FROM chal WHERE mess_id = $1 AND date LIKE $2',
      [mid, monthPattern]
    );
    const monthBazaarTotal = await db.get(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM bazaar WHERE mess_id = $1 AND date LIKE $2',
      [mid, monthPattern]
    );
    const recentExpenses = await db.all(
      'SELECT * FROM expenses WHERE mess_id = $1 AND date LIKE $2 ORDER BY date DESC, created_at DESC LIMIT 5',
      [mid, monthPattern]
    );

    const monthMealTypeCounts = await db.all(
      'SELECT meal_type, COUNT(*) as count FROM meals WHERE mess_id = $1 AND date LIKE $2 GROUP BY meal_type',
      [mid, monthPattern]
    );
    const monthMealTypes = { breakfast: 0, lunch: 0, dinner: 0 };
    monthMealTypeCounts.forEach(c => { monthMealTypes[c.meal_type] = Number(c.count); });

    const rep = await buildReport(month, year, mid);

    res.json({
      totalMembers: totalMembers.count,
      todayMeals,
      monthMealTypes,
      isCurrentMonth,
      monthExpenses: Number(monthExpenses.total),
      monthMeals: Number(monthMeals.count),
      monthChal: Number(monthChal.total),
      monthBazaarTotal: Number(monthBazaarTotal.total),
      recentExpenses,
      monthMealCount: rep.totalBillCount,
      mealRate: rep.perMealCost,
      totalBills: rep.totalBills,
      totalMonthDeposit: rep.totalMonthDeposit,
      willGet: rep.memberBills.filter(m => m.allTimeBalance > 0).reduce((s, m) => s + m.allTimeBalance, 0),
      willGive: rep.memberBills.filter(m => m.allTimeBalance < 0).reduce((s, m) => s - m.allTimeBalance, 0),
      totalExpense: rep.totalExpense,
      month,
      year,
    });
  } catch (err) { next(err); }
});

// ========== REPORT ==========

// single month's report: meals, chal, bazaar, expense share, payments, per-member bills
async function buildMonthReport(month, year, messId) {
  const pattern = ym(month, year);

  const totalExpense = await db.get(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE mess_id = $1 AND date LIKE $2',
    [messId, pattern]
  );

  const expensesByCategory = await db.all(
    'SELECT category, SUM(amount) as total FROM expenses WHERE mess_id = $1 AND date LIKE $2 GROUP BY category ORDER BY total DESC',
    [messId, pattern]
  );

  const mealsPerMember = await db.all(`
    SELECT members.id, members.name,
      COALESCE(SUM(CASE WHEN meals.meal_type = 'breakfast' AND meals.is_guest = 0 THEN 1 ELSE 0 END), 0) as breakfast,
      COALESCE(SUM(CASE WHEN meals.meal_type = 'lunch' AND meals.is_guest = 0 THEN 1 ELSE 0 END), 0) as lunch,
      COALESCE(SUM(CASE WHEN meals.meal_type = 'dinner' AND meals.is_guest = 0 THEN 1 ELSE 0 END), 0) as dinner,
      COALESCE(SUM(CASE WHEN meals.is_guest = 1 THEN 1 ELSE 0 END), 0) as guest_meals,
      COUNT(meals.id) as total_meals
    FROM members
    LEFT JOIN meals ON members.id = meals.member_id
      AND meals.mess_id = members.mess_id
      AND meals.date LIKE $2
    WHERE members.mess_id = $1
      AND (members.is_active = 1 OR EXISTS (
        SELECT 1 FROM meals m2 WHERE m2.member_id = members.id AND m2.mess_id = members.mess_id
          AND m2.date LIKE $2
      ))
    GROUP BY members.id, members.name
    ORDER BY members.name
  `, [messId, pattern]);

  const chalPerMember = await db.all(
    'SELECT member_id, COALESCE(SUM(pots), 0) as total_chal FROM chal WHERE mess_id = $1 AND date LIKE $2 GROUP BY member_id',
    [messId, pattern]
  );
  const chalMap = {};
  chalPerMember.forEach(c => { chalMap[c.member_id] = Number(c.total_chal); });

  const overrideRow = await db.get(
    'SELECT fixed_meals FROM month_settings WHERE mess_id = $1 AND month = $2 AND year = $3',
    [messId, month, year]
  );
  const fixedMeals = overrideRow && overrideRow.fixed_meals != null ? overrideRow.fixed_meals : null;

  const totalMeals = mealsPerMember.reduce((sum, m) => sum + Number(m.total_meals), 0);
  const totalChal = chalPerMember.reduce((sum, c) => sum + Number(c.total_chal), 0);

  // per meal rate = total bazaar / total meal count (bill-based, all members combined)
  const totalBazarRow = await db.get(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM bazaar WHERE mess_id = $1 AND date LIKE $2',
    [messId, pattern]
  );

  const perMemberOverrideRows = await db.all(
    'SELECT member_id, meals FROM meal_overrides WHERE mess_id = $1 AND month = $2 AND year = $3',
    [messId, month, year]
  );
  const perMemberOverride = {};
  perMemberOverrideRows.forEach(o => { perMemberOverride[o.member_id] = Number(o.meals); });

  // mess rule (auto fixed meal count): regular 0-10 -> 35, 11-69 -> 70, 70+ -> actual
  const autoFloorFor = regular => (regular >= 70 ? regular : regular >= 11 ? 70 : 35);
  const countParts = m => {
    const total = Number(m.total_meals) || 0;
    const guest = Number(m.guest_meals) || 0;
    return { regular: total - guest, guest };
  };
  const autoCount = m => {
    const { regular, guest } = countParts(m);
    const baseFloor = fixedMeals != null ? fixedMeals : autoFloorFor(regular);
    return Math.max(baseFloor, regular) + guest;
  };
  const billCount = m => {
    const { regular, guest } = countParts(m);
    const ov = perMemberOverride[m.id];
    if (ov != null) return Math.max(ov, regular) + guest;
    return autoCount(m);
  };

  const totalBillCount = mealsPerMember.reduce((sum, m) => sum + billCount(m), 0);
  const perMealCost = totalBillCount > 0 ? Number(totalBazarRow.total) / totalBillCount : 0;

  const memberBills = mealsPerMember.map(m => {
    const chal = chalMap[m.id] || 0;
    const bc = billCount(m);
    const mealBill = Math.round(perMealCost * bc);

    return {
      ...m,
      breakfast: Number(m.breakfast),
      lunch: Number(m.lunch),
      dinner: Number(m.dinner),
      guest_meals: Number(m.guest_meals),
      total_meals: Number(m.total_meals),
      chal,
      bill_count: bc,
      auto_count: autoCount(m),
      override_meals: perMemberOverride[m.id] != null ? perMemberOverride[m.id] : null,
      meal_bill: mealBill,
      bill: mealBill,
    };
  });

  // add expense shared equally among active members
  const activeMemberCount = memberBills.length;
  const addExpenseTotal = Number(totalExpense.total);
  const addExpenseShare = activeMemberCount > 0 ? Math.ceil(addExpenseTotal / activeMemberCount) : 0;

  memberBills.forEach(m => {
    m.add_expense_share = addExpenseShare;
    m.bill = m.meal_bill + addExpenseShare;
  });

  const totalBills = memberBills.reduce((sum, m) => sum + m.bill, 0);

  // payments (deposits) this month per member
  const payments = await db.all(
    'SELECT member_id, COALESCE(SUM(amount), 0) as total FROM payments WHERE mess_id = $1 AND date LIKE $2 GROUP BY member_id',
    [messId, pattern]
  );
  const paymentMap = {};
  payments.forEach(p => { paymentMap[p.member_id] = Number(p.total); });

  memberBills.forEach(m => {
    m.paid = paymentMap[m.id] || 0;
    m.balance = m.paid - m.bill;
  });

  return {
    month,
    year,
    totalMeals,
    totalChal,
    totalExpense: addExpenseTotal,
    addExpenseTotal,
    addExpenseShare,
    totalBazar: Number(totalBazarRow.total),
    perMealCost: Math.round(perMealCost * 100) / 100,
    memberBills,
    expensesByCategory: expensesByCategory.map(c => ({ category: c.category, total: Number(c.total) })),
    totalBills,
    totalBillCount,
    fixedMeals,
  };
}

// cumulative balance: sum of (paid - bill) across every month up to & incl. given month
async function buildReport(month, year, messId) {
  const rep = await buildMonthReport(month, year, messId);

  const monthRows = await db.all(`
    SELECT DISTINCT substr(ym, 1, 4) AS y, substr(ym, 6, 2) AS m FROM (
      SELECT substr(date, 1, 7) AS ym FROM meals WHERE mess_id = $1
      UNION SELECT substr(date, 1, 7) FROM chal WHERE mess_id = $1
      UNION SELECT substr(date, 1, 7) FROM bazaar WHERE mess_id = $1
      UNION SELECT substr(date, 1, 7) FROM payments WHERE mess_id = $1
      UNION SELECT substr(date, 1, 7) FROM expenses WHERE mess_id = $1
    ) t
    ORDER BY y, m
  `, [messId]);

  const uptoY = Number(year);
  const uptoM = Number(month);
  const acc = {};

  for (const { y, m } of monthRows) {
    const yy = Number(y);
    const mm = Number(m);
    if (yy > uptoY) continue;
    if (yy === uptoY && mm > uptoM) continue;
    const mrep = await buildMonthReport(m, y, messId);
    (mrep.memberBills || []).forEach(mb => {
      acc[mb.id] = (acc[mb.id] || 0) + (mb.balance || 0);
    });
  }

  rep.memberBills.forEach(m => {
    m.allTimeBalance = Math.round((acc[m.id] || 0) * 100) / 100;
    m.prevBalance = Math.round((m.allTimeBalance - m.balance) * 100) / 100;
    m.monthDeposit = Math.max(0, Math.round((m.paid + m.prevBalance) * 100) / 100);
  });
  rep.allTimeBalanceTotal = rep.memberBills.reduce((s, m) => s + m.allTimeBalance, 0);
  rep.totalMonthDeposit = rep.memberBills.reduce((s, m) => s + m.monthDeposit, 0);
  rep.totalPaid = rep.memberBills.reduce((s, m) => s + m.paid, 0);

  return rep;
}

app.get('/api/report/:month/:year', async (req, res, next) => {
  try {
    res.json(await buildReport(req.params.month, req.params.year, req.user.messId));
  } catch (err) { next(err); }
});

app.post('/api/report/meal-override', async (req, res, next) => {
  try {
    const { member_id, month, year, meals, clear } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }
    const mid = req.user.messId;
    if (member_id != null) {
      if (clear === true) {
        await db.query(
          'DELETE FROM meal_overrides WHERE member_id = $1 AND mess_id = $2 AND month = $3 AND year = $4',
          [member_id, mid, month, year]
        );
        return res.json({ success: true, removed: true });
      }
      const val = parseInt(meals, 10);
      if (!Number.isInteger(val) || val < 0 || val > 90) {
        return res.status(400).json({ error: 'meals must be an integer between 0 and 90' });
      }
      await db.query(
        `INSERT INTO meal_overrides (member_id, mess_id, month, year, meals) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (member_id, mess_id, month, year) DO UPDATE SET meals = EXCLUDED.meals`,
        [member_id, mid, month, year, val]
      );
      return res.json({ success: true });
    }
    if (clear === true) {
      await db.query(
        'DELETE FROM month_settings WHERE mess_id = $1 AND month = $2 AND year = $3',
        [mid, month, year]
      );
      return res.json({ success: true, removed: true });
    }
    const val = parseInt(meals, 10);
    if (!Number.isInteger(val) || val < 0 || val > 90) {
      return res.status(400).json({ error: 'meals must be an integer between 0 and 90' });
    }
    await db.query(
      `INSERT INTO month_settings (mess_id, month, year, fixed_meals) VALUES ($1, $2, $3, $4)
       ON CONFLICT (mess_id, month, year) DO UPDATE SET fixed_meals = EXCLUDED.fixed_meals`,
      [mid, month, year, val]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ========== START ==========

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mess Manager API running on port ${PORT}`);
});
