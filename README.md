# Mess Manager App (Multi-Tenant + APK)

একাধিক মেসের জন্য SaaS হিসেবে ব্যবহারযোগ্য Mess Manager — React + Express + **Supabase PostgreSQL** (ফ্রি ডেটাবেস) + **Capacitor** দিয়ে Android APK।

> পুরনো `mess-manager/` প্রজেক্টে কোনো পরিবর্তন করা হয়নি। এটা সম্পূর্ণ নতুন প্রজেক্ট।

## আর্কিটেকচার

```
mess-manager-app/
├── server/          Express API (PostgreSQL / Supabase)
│   ├── schema.sql   ডেটাবেস স্কিমা (Supabase-এ চালাবেন)
│   ├── db.js        pg connection
│   └── index.js     সব API (প্রতিটি query mess_id দিয়ে ফিল্টার)
├── client/          React + Vite + Capacitor (APK)
└── render.yaml      সার্ভার ডিপ্লয়মেন্ট (Render free)
```

**প্রতিটি মেসের ডেটা আলাদা**: সব টেবিলে `mess_id` আছে, JWT-তে `messId` থাকে, প্রতিটি query নিজের মেসের বাইরের ডেটা দেখায় না।

## ১. Supabase ডেটাবেস সেটআপ (ফ্রি)

1. https://supabase.com এ গিয়ে GitHub দিয়ে ফ্রি অ্যাকাউন্ট খুলুন
2. **New Project** তৈরি করুন (Region: `ap-southeast-1` বা যেটা কাছে, Region `Singapore` ভালো)
3. Project খুলে **SQL Editor → New query** → `server/schema.sql` ফাইলের পুরো content পেস্ট করে **Run** চাপুন
4. **Project Settings → Database** → **Connection string** সেকশনে **"Session pooler"** ট্যাব নির্বাচন করুন
   - ⚠️ **"Direct connection" নিবেন না** — সেটা শুধু IPv6-এ চলে, ব্রডব্যান্ড/মোবাইল নেটওয়ার্কে কাজ নাও করতে পারে
   - Pooler URL এমন দেখায়: `postgresql://postgres.প্রজেক্টআইডি:পাসওয়ার্ড@aws-0-<region>.pooler.supabase.com:5432/postgres`
5. `server/.env` ফাইল তৈরি করুন (`server/.env.example` কপি করে):

```env
DATABASE_URL=postgresql://postgres.xyz...:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
JWT_SECRET=কোনো_লম্বা_র‌্যানডম_স্ট্রিং_এখানে_লিখুন
```

## ২. লোকালি চালানো

```bash
# সার্ভার
cd server
npm install
npm start            # http://localhost:3001

# client (আলাদা terminal বা start.bat দিয়ে)
cd client
npm install
npm run dev          # http://localhost:5173
```

বা রুটে ডাবল-ক্লিক: `start.bat`

**নতুন মেস খুলুন**: অ্যাপে **নতুন মেস** ট্যাব → মেসের নাম, আপনার নাম, User ID, Password দিন → লগইন হয়ে যাবে, Settings পেজে **Mess Code** পাবেন। সেই code দিয়ে সদস্যরা **মেসে যোগ দিন** ট্যাবে গিয়ে জয়েন করবে।

## ৩. সার্ভার ডিপ্লয় (Render — ফ্রি)

1. এই ফোল্ডার GitHub-এ push করুন
2. https://render.com → **New → Web Service** → রিপো সিলেক্ট
3. `render.yaml` অটো-ডিটেক্ট হবে (না হলে manually):
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm start`
4. Environment এ যোগ করুন:
   - `DATABASE_URL` = Supabase connection string
   - `JWT_SECRET` = কোনো লম্বা random string
5. Deploy → URL পাবেন, যেমন: `https://mess-manager-app-api.onrender.com`

## ৪. Client ডিপ্লয় (Vercel — ফ্রি) + APK-র API URL

APK/ওয়েব দুটোতেই backend URL বিল্ট-ইন থাকে। `client/src/api.js`-এর `PROD_API` আপনার Render URL হতে হবে:

```js
const PROD_API = 'https://আপনার-render-url.onrender.com/api';
```

(অথবা বিল্ড করার সময় env দিন: `VITE_API_URL=https://...onrender.com`)

ওয়েব ভার্সন চাইলে:
```bash
cd client
npm run build          # dist/ তৈরি হবে
```
`dist/` Vercel-এ deploy করুন (ফোল্ডার ড্র্যাগ-অ্যান্ড-ড্রপও চলবে)।

## ৫. Android APK বিল্ড

প্রয়োজন: [Android Studio](https://developer.android.com/studio) ইনস্টল থাকা (একবারই লাগবে)

```bash
cd client
npm install

# প্রথমবার — android ফোল্ডার তৈরি (একবারই)
npx cap add android

# প্রতিবার কোড বদলের পর — build + sync
npm run cap:sync

# Android Studio খুলে APK বিল্ড
npm run cap:open
```

Android Studio-তে: **Build → Build Bundle(s)/APK(s) → Build APK(s)** → APK path শেষে দেখাবে, সেই `.apk` ফোনে কপি করে ইনস্টল করুন (চাইলে Play Console দিয়ে Play Store-এও দেওয়া যাবে)।

> নতুন ভ্যার্সন বানানোর সময়: `npm run cap:sync` → Android Studio খুলে আবার APK বিল্ড।

## কীভাবে একাধিক মেস চলে

| বিষয় | কীভাবে |
|---|---|
| নতুন মেস | **নতুন মেস** ট্যাব → auto Mess Code তৈরি |
| সদস্য জয়েন | **মেসে যোগ দিন** + Mess Code (Settings পেজে আছে) |
| মেস admin | মেস খোলার creator = admin |
| ডেটা আলাদা | প্রতিটি row-তে `mess_id`, প্রতিটি query-তে filter |
| DB | Supabase PostgreSQL (ফ্রি 500MB — অনেক মেসের জন্যই যথেষ্ট) |

## API সারসংক্ষেপ

- `POST /api/auth/register` — নতুন মেস + admin তৈরি
- `POST /api/auth/join` — Mess Code দিয়ে সদস্য জয়েন
- `POST /api/auth/login` — Mess Code + User ID + Password
- Manager routes: members, meals, chal, bazaar, payments, expenses, report, dashboard
- Member routes: `/api/my/*` (শুধু নিজের ডেটা)
- Admin: clear-month, reset-password, assign-manager/co-manager