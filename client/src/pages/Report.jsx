import { useState, useEffect } from 'react'
import { fetchReport, clearMonth, fetchMembers, setMealOverride } from '../api'

function Report({ user }) {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [report, setReport] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [memberMap, setMemberMap] = useState({})

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ]

  useEffect(() => {
    setClearMsg('')
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

  const isManager = user && ['admin', 'manager'].includes(user.role)
  const canEditMeals = user && ['admin', 'manager', 'co_manager'].includes(user.role)

  const handleClearMonth = async () => {
    const label = `${months[parseInt(month) - 1]} ${year}`
    if (!confirm(
      `সতর্কতা!\n\n"${label}" মাসের সব ডেটা (meal, chal, bazaar, payment, expense) একসাথে মুছে যাবে।\nএই কাজ ফেরানো যাবে না।\n\nসত্যিই মুছতে চান?`
    )) return
    setClearing(true)
    setClearMsg('')
    const res = await clearMonth(month, year)
    setClearing(false)
    if (res && (res.meals !== undefined)) {
      setClearMsg(`✅ "${label}" মাসের ডেটা মুছে গেছে — meal: ${res.meals}, chal: ${res.chal}, bazaar: ${res.bazaar}, expense: ${res.expenses}, payment: ${res.payments}`)
      fetchReport(month, year).then(setReport)
    } else {
      setClearMsg((res && res.error) || 'মুছতে ব্যর্থ হয়েছে')
    }
  }

  const handleOverrideGlobal = async (value) => {
    await setMealOverride(value === '' ? { month, year, clear: true } : { month, year, meals: Number(value) })
    fetchReport(month, year).then(setReport)
  }

  const handleOverrideMember = async (memberId, value) => {
    await setMealOverride(value === '' ? { member_id: memberId, month, year, clear: true } : { member_id: memberId, month, year, meals: Number(value) })
    fetchReport(month, year).then(setReport)
  }

  const overrideOptions = ['']
  for (let i = 0; i <= 90; i++) overrideOptions.push(String(i))

  useEffect(() => {
    if (!report) return

    const m = report.memberBills || []
    m.forEach(mm => {
      mm.meal_bill = mm.meal_bill || 0
      mm.add_expense_share = mm.add_expense_share || 0
      mm.bill = mm.bill || 0
      mm.paid = mm.paid || 0
      mm.balance = mm.balance || 0
    })
  }, [report])

  if (!report) return <p>Loading report...</p>

  const query = filter.trim().toLowerCase()
  const filteredBills = report.memberBills.filter(m => {
    if (!query) return true
    const meta = memberMap[m.id] || {}
    const name = (meta.name || m.name || '').toLowerCase()
    const phone = (meta.phone || '').trim()
    return name.includes(query) || phone.includes(query)
  })

  return (
    <div>
      <div className="page-header">
        <h2>Report</h2>
      </div>

      <div className="date-picker">
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {months.map((m, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {canEditMeals && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            Fixed meal:
            <select
              value={report.fixedMeals != null ? String(report.fixedMeals) : ''}
              onChange={e => handleOverrideGlobal(e.target.value)}
              style={{ fontSize: 12, padding: '2px 4px' }}
              title="সবাইর জন্য default fixed meal count (ঐচ্ছিক)"
            >
              <option value="">auto</option>
              {overrideOptions.filter(v => v !== '' && Number(v) !== report.fixedMeals).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        {isManager && (
          <button
            className="btn btn-danger"
            onClick={handleClearMonth}
            disabled={clearing}
            title="Manager only"
          >
            {clearing ? 'মুছে ফেলা হচ্ছে...' : '🗑️ এই মাসের সব ডেটা মুছুন (Manager only)'}
          </button>
        )}
      </div>

      {clearMsg && (
        <div className={clearMsg.startsWith('✅') ? 'login-success' : 'login-error'} style={{ marginBottom: 20 }}>
          {clearMsg}
        </div>
      )}

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🍽️</div>
          <div className="stat-info">
            <h3>{report.totalMeals}</h3>
            <p>মোট Meal</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🍚</div>
          <div className="stat-info">
            <h3>{report.totalBillCount} count</h3>
            <p>মোট Meal Count (বিল হিসাবে)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">🍚</div>
          <div className="stat-info">
            <h3>{report.totalChal} পট</h3>
            <p>চাল জমা হইচে</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🛒</div>
          <div className="stat-info">
            <h3>৳{report.totalBazar.toLocaleString()}</h3>
            <p>মোট বাজার খরচ</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">💰</div>
          <div className="stat-info">
            <h3>৳{(report.totalBazar + report.totalExpense).toLocaleString()}</h3>
            <p>মোট খরচ (বাজার + Expense)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">➕</div>
          <div className="stat-info">
            <h3>৳{report.addExpenseTotal.toLocaleString()}</h3>
            <p>Add Expense (সব, member-এ ভাগ)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-info">
            <h3>৳{report.addExpenseShare.toLocaleString()}</h3>
            <p>প্রতি member-এর Add Expense share</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📊</div>
          <div className="stat-info">
            <h3>৳{report.perMealCost}</h3>
            <p>Per Meal Rate (বাজার/মোট meal)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🧾</div>
          <div className="stat-info">
            <h3>৳{report.totalBills.toLocaleString()}</h3>
            <p>মোট বিল (সব)</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Member Bills ({months[parseInt(month)-1]} {year})</h3>

        <div className="date-picker" style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="নাম বা নম্বর দিয়ে খুঁজুন..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {filter && (
            <button className="btn btn-outline" onClick={() => setFilter('')}>সব দেখান</button>
          )}
          <span className="helper-text">
            {query ? `${filteredBills.length} জন মিলেছে` : `সব মিলিয়ে ${report.memberBills.length} জন সদস্য`}
          </span>
        </div>

        {filteredBills.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👥</div>
            <p>কোনো সদস্য পাওয়া যায়নি</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>🌅</th>
                <th>☀️</th>
                <th>🌙</th>
<th>Meal</th>
                <th>Guest</th>
                <th>Meal Count</th>
                <th>Meal বিল</th>
                <th>Add Expense</th>
                <th>মোট বিল</th>
                <th>জমা</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((m, i) => {
                const balance = m.allTimeBalance ?? m.balance
                return (
                  <tr key={m.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.breakfast}</td>
                    <td>{m.lunch}</td>
                    <td>{m.dinner}</td>
                    <td>{m.total_meals}</td>
                    <td>{m.guest_meals || 0}</td>
                    <td>
                      {canEditMeals ? (
                        <select
                          value={String(m.bill_count)}
                          onChange={e => {
                            const v = Number(e.target.value)
                            handleOverrideMember(
                              v === m.auto_count
                                ? { member_id: m.id, month, year, clear: true }
                                : { member_id: m.id, month, year, meals: v }
                            )
                          }}
                          style={{ fontSize: 12, padding: '2px 4px', maxWidth: 90 }}
                          title="Meal count"
                        >
                          {[...new Set([...overrideOptions, String(m.bill_count)])].filter(v => v !== '').map(v => (
                            <option key={v} value={v}>{v}{v === String(m.auto_count) ? ' (auto)' : ''}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{m.bill_count}</span>
                      )}
                    </td>
                    <td>৳{m.meal_bill.toLocaleString()}</td>
                    <td>৳{m.add_expense_share.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>৳{m.bill.toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>৳{m.monthDeposit.toLocaleString()}</td>
                    <td>
                      {balance > 0 ? (
                        <span className="badge badge-success">+৳{balance.toLocaleString()} (ফেরত)</span>
                      ) : balance < 0 ? (
                        <span className="badge badge-danger">৳{Math.abs(balance).toLocaleString()} দেবে</span>
                      ) : (
                        <span className="badge badge-info">সমতা</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan="5" style={{ textAlign: 'right' }}>মোট</td>
                <td>{report.totalMeals}</td>
                <td>{report.memberBills.reduce((s, m) => s + (m.guest_meals || 0), 0)}</td>
                <td>{report.totalBillCount}</td>
                <td colSpan="2" />
                <td style={{ color: 'var(--primary)' }}>৳{report.totalBills.toLocaleString()}</td>
                <td>৳{report.totalMonthDeposit.toLocaleString()}</td>
                <td>{(() => {
                  const willGet = report.memberBills.filter(m => m.allTimeBalance > 0).reduce((s, m) => s + m.allTimeBalance, 0)
                  const willGive = report.memberBills.filter(m => m.allTimeBalance < 0).reduce((s, m) => s - m.allTimeBalance, 0)
                  const net = Math.abs(willGet - willGive)
                  return willGive >= willGet ? (
                    <span className="badge badge-danger">দিবে ৳{net.toLocaleString()}</span>
                  ) : (
                    <span className="badge badge-success">পাবে ৳{net.toLocaleString()}</span>
                  )
                })()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {report.expensesByCategory.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 16 }}>খরচের ধরন</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {report.expensesByCategory.map(c => (
                <tr key={c.category}>
                  <td><span className="badge badge-info">{c.category}</span></td>
                  <td style={{ fontWeight: 600 }}>৳{c.total}</td>
                  <td>
                    {report.totalExpense > 0 ? ((c.total / report.totalExpense) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Report
