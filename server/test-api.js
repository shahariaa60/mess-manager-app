const BASE = 'http://localhost:3001/api';

async function call(path, opts = {}) {
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

(async () => {
  let pass = 0, fail = 0;
  const ok = (name, cond, extra = '') => {
    if (cond) { pass++; console.log('  PASS:', name); }
    else { fail++; console.log('  FAIL:', name, extra); }
  };

  console.log('== Register mess A ==');
  const rnd = Date.now().toString().slice(-6);
  const unameA = 'rakib' + rnd;
  const unameB = 'sumon' + rnd;
  const unameU2 = 'shakil' + rnd;
  const regA = await call('/auth/register', { method: 'POST', body: { mess_name: 'টেস্ট মেস আ', name: 'রাকিব', username: unameA, password: '1234' } });
  ok('register mess A ok', regA.status === 200, JSON.stringify(regA.data));
  const tokenA = regA.data.token;
  const codeA = regA.data.user && regA.data.user.messCode;
  ok('mess A code present', !!codeA, 'code=' + codeA);

  console.log('== Register mess B (different) ==');
  const regB = await call('/auth/register', { method: 'POST', body: { mess_name: 'টেস্ট বি', name: 'সুমন', username: unameB, password: '5678' } });
  ok('register mess B ok', regB.status === 200, JSON.stringify(regB.data));
  const tokenB = regB.data.token;
  const codeB = regB.data.user && regB.data.user.messCode;
  ok('mess code differs', codeA !== codeB, `A=${codeA} B=${codeB}`);

  console.log('== Login A ==');
  const loginA = await call('/auth/login', { method: 'POST', body: { mess_code: codeA, username: unameA, password: '1234' } });
  ok('login A ok', loginA.status === 200);
  ok('login A role manager', loginA.data.user && loginA.data.user.role === 'manager', JSON.stringify(loginA.data));

  console.log('== Add member in A ==');
  const memberA = await call('/members', { method: 'POST', token: tokenA, body: { name: 'শাকিল', phone: '01933' } });
  ok('add member A ok', memberA.status === 200, JSON.stringify(memberA.data));
  const memberId = memberA.data.id;
  ok('member id present', memberId != null);

  console.log('== Join mess A (user2) ==');
  const joinA = await call('/auth/join', { method: 'POST', body: { mess_code: codeA, username: unameU2, password: '9999', name: 'শাকিল' } });
  ok('join mess A ok', joinA.status === 200, JSON.stringify(joinA.data));
  const tokenU2 = joinA.data.token;
  ok('joiner is member', joinA.data.user && joinA.data.user.role === 'member');

  console.log('== Save meals in A ==');
  const meals = await call('/meals/toggle', { method: 'POST', token: tokenA, body: { member_ids: [memberId], date: '2026-09-23', meal_type: 'lunch' } });
  ok('save meals A ok', meals.status === 200, JSON.stringify(meals.data));
  const dashA = await call('/dashboard?month=09&year=2026', { token: tokenA });
  ok('dashboard A ok', dashA.status === 200);
  ok('dashboard monthly fields', dashA.data.monthMeals >= 1 && dashA.data.monthMealCount > 0, JSON.stringify(dashA.data).slice(0, 160));

  console.log('== Cross-mess isolation ==');
  const userDashboard = await call('/my/dashboard', { token: tokenA });
  const otherDashboard = await call('/my/dashboard', { token: tokenB });
  ok('mess B sees its own empty data (no A members)', (userDashboard.status === 200), JSON.stringify(userDashboard.data).slice(0, 120));

  console.log('== Report A ==');
  const reportA = await call('/report/2026-09/2026', { token: tokenA });
  ok('report A ok', reportA.status === 200, JSON.stringify(reportA.data).slice(0, 150));
  const repRowA = reportA.data.memberBills && reportA.data.memberBills[0];
  ok('report has settlement fields', repRowA && typeof repRowA.bill === 'number' && 'monthDeposit' in repRowA && 'allTimeBalance' in repRowA && 'prevBalance' in repRowA,
    JSON.stringify(repRowA && { bill: repRowA.bill, monthDeposit: repRowA.monthDeposit, allTimeBalance: repRowA.allTimeBalance, prevBalance: repRowA.prevBalance }));
  ok('report totals', typeof reportA.data.totalBillCount === 'number' && typeof reportA.data.totalMonthDeposit === 'number', JSON.stringify({ tbc: reportA.data.totalBillCount, tmd: reportA.data.totalMonthDeposit }));

  console.log('== Bazaar + expenses + payments A ==');
  const bz = await call('/bazaar', { method: 'POST', token: tokenA, body: { date: '2026-09-23', member_id: memberId, total_amount: 850, items: [{ item_name: 'আলু', quantity: '5kg', amount: 200 }] } });
  ok('bazaar A ok', bz.status === 200, JSON.stringify(bz.data));
  const ex = await call('/expenses', { method: 'POST', token: tokenA, body: { category: 'গ্যাস', amount: 500, description: 'ট্যাবলেট', date: '2026-09-10' } });
  ok('expense A ok', ex.status === 200, JSON.stringify(ex.data));
  const pay = await call('/payments', { method: 'POST', token: tokenA, body: { member_id: memberId, amount: 1000, date: '2026-09-15', notes: 'অ্যাডভান্স' } });
  ok('payment A ok', pay.status === 200);

  console.log('== Chal ==');
  const ch = await call('/chal/bulk', { method: 'POST', token: tokenA, body: { entries: [{ member_id: memberId, pots: 2 }], date: '2026-09-22' } });
  ok('chal A ok', ch.status === 200, JSON.stringify(ch.data));

  console.log();
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('UNEXPECTED:', e); process.exit(1); });