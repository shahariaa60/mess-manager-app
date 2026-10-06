import { useState, useEffect } from 'react'
import { fetchReport, clearMonth, fetchMembers, setMealOverride } from '../api'
import {
  PageHeader, StatCard, BalanceBadge, EmptyState, TableWrap, MonthPicker,
  IconMeals, IconChal, IconBazaar, IconExpenses, IconPayments, IconReport,
  IconMembers, IconScale, IconTrash, IconCheck, IconAlert, money,
} from '../components/ui'
import { MONTHS_BN, num } from '../utils'

function Report({ user }) {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [report, setReport] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState(null)
  const [filter, setFilter] = useState('')
  const [memberMap, setMemberMap] = useState({})

  const canEditMeals = user && ['admin', 'manager', 'co_manager'].includes(user.role)
  const isAdmin = user && ['admin', 'manager'].includes(user.role)
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  useEffect(() => {
    setClearMsg(null)
    setReport(null)
    fetchReport(month, year).then(setReport)
  }, [month, year])

  useEffect(() => {
    fetchMembers()
      .then(list => {
        const map = {}
        ;(list || []).forEach(m => { map[m.id] = m })
        setMemberMap(map)
      })
      .catch(() => {})
  }, [])

  const handleClearMonth = async () => {
    if (!confirm(
      `সতর্কতা!\n\n"${label}" মাসের সব ডেটা (meal, chal, bazaar, payment, expense) একসাথে মুছে যাবে।\nএটি ফেরানো যাবে না।\n\nসত্যিই মুছতে চান?`
    )) return
    setClearing(true)
    const res = await clearMonth(month, year)
    setClearing(false)
    if (res && res.meals !== undefined) {
      setClearMsg({ ok: true, text: `"${label}" মাসের ডেটা মুছে গেছে — meal: ${res.meals}, chal: ${res.chal}, bazaar: ${res.bazaar}, expense: ${res.expenses}, payment: ${res.payments}` })
      fetchReport(month, year).then(setReport)
    } else {
      setClearMsg({ ok: false, text: (res && res.error) || 'মুছতে ব্যর্থ হয়েছে' })
    }
  }

  const handleOverride = async (payload) => {
    await setMealOverride(payload)
    fetchReport(month, year).then(setReport)
  }

  const overrideValues = []
  for (let i = 0; i <= 90; i++) overrideValues.push(String(i))
  const countOptions = current => (
    overrideValues.includes(String(current)) ? overrideValues : [...overrideValues, String(current)]
  )

  if (!report) {
    return (
      <div className="page">
        <PageHeader title="মাসিক রিপোর্ট" subtitle={label} />
        <EmptyState icon={<IconReport size={22} />} title="লোড হচ্ছে..." />
      </div>
    )
  }

  const rows = report.memberBills
  const query = filter.trim().toLowerCase()
  const filtered = rows.filter(m => {
    if (!query) return true
    const meta = memberMap[m.id] || {}
    const name = (meta.name || m.name || '').toLowerCase()
    const phone = (meta.phone || '').trim()
    return name.includes(query) || phone.includes(query)
  })

  const sum = pick => rows.reduce((s, m) => s + (Number(pick(m)) || 0), 0)
  const totalGuest = sum(m => m.guest_meals)
  const willGet = sum(m => (m.allTimeBalance > 0 ? m.allTimeBalance : 0))
  const willGive = sum(m => (m.allTimeBalance < 0 ? -m.allTimeBalance : 0))

  return (
    <div className="page">
      <PageHeader
        title="মাসিক রিপোর্ট"
        subtitle={label}
        actions={(
          <>
            <MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />
            {isAdmin && (
              <button className="btn btn-danger-quiet" onClick={handleClearMonth} disabled={clearing}>
                <IconTrash size={16} />
                {clearing ? 'মুছে যাচ্ছে...' : 'মাস মুছুন'}
              </button>
            )}
          </>
        )}
      />

      {clearMsg && (
        <div className={`alert ${clearMsg.ok ? 'alert-success' : 'alert-error'}`}>
          {clearMsg.ok ? <IconCheck size={17} /> : <IconAlert size={17} />}
          <span>{clearMsg.text}</span>
        </div>
      )}

      <div className="card-grid">
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="মোট Meal" value={num(report.totalMeals)} />
        <StatCard tone="yellow" icon={<IconScale size={19} />} label="মোট Meal Count" value={num(report.totalBillCount)} />
        <StatCard tone="yellow" icon={<IconChal size={19} />} label="চাল জমা" value={`${num(report.totalChal)} পট`} />
        <StatCard tone="green" icon={<IconBazaar size={19} />} label="মোট বাজার" value={money(report.totalBazar)} />
        <StatCard tone="slate" icon={<IconExpenses size={19} />} label="Add Expense" value={money(report.addExpenseTotal)} sub={`প্রতি সদস্য ${money(report.addExpenseShare)}`} />
        <StatCard tone="red" icon={<IconPayments size={19} />} label="Meal Rate" value={money(report.perMealCost)} />
        <StatCard tone="slate" icon={<IconReport size={19} />} label="মোট বিল" value={money(report.totalBills)} />
        <StatCard tone="green" icon={<IconPayments size={19} />} label="মোট জমা" value={money(report.totalMonthDeposit)} sub="আগের মাসের হিসাবসহ" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>সদস্যভিত্তিক হিসাব</h3>
          <div className="toolbar">
            <div className="month-picker">
              <input
                type="search"
                placeholder="নাম বা নম্বর"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                aria-label="সদস্য খুঁজুন"
              />
              {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')}>মুছুন</button>}
            </div>
            <span className="helper-text">
              {query ? `${filtered.length} জন মিলেছে` : `${rows.length} জন সদস্য`}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<IconMembers size={22} />} title="কোনো সদস্য পাওয়া যায়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>সদস্য</th>
                  <th className="num">সকাল</th>
                  <th className="num">দুপুর</th>
                  <th className="num">রাত</th>
                  <th className="num">Meal</th>
                  <th className="num">Guest</th>
                  <th className="num">Meal Count</th>
                  <th className="num">Meal বিল</th>
                  <th className="num">খরচ</th>
                  <th className="num">মোট বিল</th>
                  <th className="num">এই মাসে জমা</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id}>
                    <td className="muted">{i + 1}</td>
                    <td className="name">{m.name}</td>
                    <td className="num">{num(m.breakfast)}</td>
                    <td className="num">{num(m.lunch)}</td>
                    <td className="num">{num(m.dinner)}</td>
                    <td className="num">{num(m.total_meals)}</td>
                    <td className="num">{num(m.guest_meals)}</td>
                    <td className="num">
                      {canEditMeals ? (
                        <select
                          className="inline-select"
                          value={String(m.bill_count)}
                          onChange={e => {
                            const v = Number(e.target.value)
                            handleOverride(
                              v === m.auto_count
                                ? { member_id: m.id, month, year, clear: true }
                                : { member_id: m.id, month, year, meals: v }
                            )
                          }}
                          title="Meal count"
                          aria-label={`${m.name} meal count`}
                        >
                          {countOptions(m.bill_count).map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="strong">{num(m.bill_count)}</span>
                      )}
                    </td>
                    <td className="num">{money(m.meal_bill)}</td>
                    <td className="num">{money(m.add_expense_share)}</td>
                    <td className="num strong text-accent">{money(m.bill)}</td>
                    <td className="num strong">{money(m.monthDeposit)}</td>
                    <td className="num"><BalanceBadge value={m.allTimeBalance} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" style={{ textAlign: 'right' }}>মোট</td>
                  <td className="num">{num(report.totalMeals)}</td>
                  <td className="num">{num(totalGuest)}</td>
                  <td className="num">{num(report.totalBillCount)}</td>
                  <td className="num" />
                  <td className="num" />
                  <td className="num">{money(report.totalBills)}</td>
                  <td className="num">{money(report.totalMonthDeposit)}</td>
                  <td className="num">
                    <span className="badge badge-muted">
                      {willGive >= willGet ? 'দিবে ' : 'পাবে '}{money(Math.abs(willGet - willGive))}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
      </div>

      <div className="card-grid">
        <StatCard tone="green" icon={<IconScale size={19} />} label="সব মিলিয়ে পাবে" value={money(willGet)} />
        <StatCard tone="red" icon={<IconScale size={19} />} label="সব মিলিয়ে দিবে" value={money(willGive)} />
      </div>

      {canEditMeals && (
        <div className="card">
          <div className="card-head">
            <h3>Fixed Meal সেটিং</h3>
            <span className="sub">সব সদস্যের জন্য ডিফল্ট</span>
          </div>
          <div className="toolbar">
            <select
              className="inline-select"
              value={report.fixedMeals != null ? String(report.fixedMeals) : ''}
              onChange={e => handleOverride(
                e.target.value === ''
                  ? { month, year, clear: true }
                  : { month, year, meals: Number(e.target.value) }
              )}
              aria-label="Fixed meal"
            >
              <option value="">—</option>
              {countOptions(report.fixedMeals || 0).filter(v => v !== '').map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <span className="helper-text">খালি রাখলে প্রতিটি সদস্যের নিজস্ব meal অনুযায়ী হিসাব হবে।</span>
          </div>
        </div>
      )}

      {report.expensesByCategory.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>খরচের ধরন</h3>
            <span className="sub">মোট {money(report.totalExpense)}</span>
          </div>
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>ধরন</th>
                  <th className="num">Amount</th>
                  <th className="num">শতাংশ</th>
                </tr>
              </thead>
              <tbody>
                {report.expensesByCategory.map(c => (
                  <tr key={c.category}>
                    <td className="name">{c.category}</td>
                    <td className="num strong">{money(c.total)}</td>
                    <td className="num muted">
                      {report.totalExpense > 0 ? `${((c.total / report.totalExpense) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}
    </div>
  )
}

export default Report