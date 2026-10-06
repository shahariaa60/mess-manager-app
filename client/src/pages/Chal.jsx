import { useState, useEffect } from 'react'
import { fetchMembers, fetchChal, fetchChalAccount, bulkAddChal, deleteChal } from '../api'
import { toLocalDate } from '../utils'

function fmt(n) {
  return (n == null ? 0 : n).toLocaleString('bn-BD')
}

const monthOf = date => String(Number(date.slice(5, 7))).padStart(2, '0')
const yearOf = date => date.slice(0, 4)

function Chal() {
  const now = new Date()
  const [members, setMembers] = useState([])
  const [listChal, setListChal] = useState([])
  const [dateEntries, setDateEntries] = useState([])
  const [account, setAccount] = useState({ rows: [], totalPots: 0, totalMeals: 0 })
  const [date, setDate] = useState(toLocalDate())
  const [listMonth, setListMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [listYear, setListYear] = useState(String(now.getFullYear()))
  const [thisTime, setThisTime] = useState({})
  const [loading, setLoading] = useState(false)

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ]

  const loadAccount = async (month, year) => {
    const a = await fetchChalAccount({ month, year })
    setAccount(a || { rows: [], totalPots: 0, totalMeals: 0 })
  }

  const loadList = async () => {
    const c = await fetchChal({ month: listMonth, year: listYear })
    setListChal(c)
  }

  const loadDateEntries = async () => {
    const c = await fetchChal({ date })
    setDateEntries([...c].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')))
  }

  const refreshAll = async () => {
    await Promise.all([loadList(), loadDateEntries(), loadAccount(monthOf(date), yearOf(date))])
  }

  useEffect(() => {
    fetchMembers().then(setMembers)
    loadAccount(monthOf(date), yearOf(date))
  }, [])

  useEffect(() => { loadList() }, [listMonth, listYear])
  useEffect(() => { loadDateEntries() }, [date])

  const onChangeDate = (e) => {
    setDate(e.target.value)
  }

  const setPots = (memberId, value) => {
    setThisTime(prev => ({ ...prev, [memberId]: Number(value) || 0 }))
  }

  const handleSave = async () => {
    const validEntries = Object.entries(thisTime)
      .filter(([memberId, pots]) => Number(pots) > 0)
      .map(([memberId, pots]) => ({ member_id: Number(memberId), pots: Number(pots) }))

    if (validEntries.length === 0) return alert('কেউ chal দেয়নি - পট সংখ্যা লিখুন')

    setLoading(true)
    await bulkAddChal({ entries: validEntries, date })
    setThisTime({})
    await refreshAll()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this chal entry?')) return
    await deleteChal(id)
    await refreshAll()
  }

  const accountMap = {}
  account.rows.forEach(r => { accountMap[r.id] = r })

  const listMonthTotal = listChal.reduce((sum, c) => sum + c.pots, 0)

  return (
    <div>
      <div className="page-header">
        <h2>চাল জমা</h2>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>নতুন চাল জমা</h3>
        <div className="date-picker" style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>জমার date:</label>
          <input type="date" value={date} onChange={onChangeDate} />
        </div>
        <p className="helper-text" style={{ marginBottom: 12 }}>
          প্রতিটি member-এর পাশে "কত পট" লিখে <strong>✅ Save</strong> করুন। পাশে এই মাসের হিসাব স্বয়ংক্রিয় দেখাবে।
        </p>

        {members.length === 0 ? (
          <p className="helper-text">⚠️ আগে Members যোগ করুন</p>
        ) : (
          <table className="chal-account-table">
            <thead>
              <tr>
                <th>Member</th>
                <th style={{ width: 150 }}>এবার কত পট (add)</th>
                <th>এই মাসে জমা</th>
                <th>এই মাসে meal</th>
                <th>ব্যালেন্স (±)</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const a = accountMap[m.id] || { month_pots: 0, month_meals: 0, balance: 0 }
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Pot"
                        value={thisTime[m.id] ?? ''}
                        onChange={e => setPots(m.id, e.target.value)}
                        style={{ width: 150 }}
                      />
                    </td>
                    <td><span className="badge badge-success">{fmt(a.month_pots)} pot</span></td>
                    <td><span className="badge badge-info">{fmt(a.month_meals)}</span></td>
                    <td>
                      {a.balance > 0 ? (
                        <span className="badge badge-success">পাবে +{fmt(a.balance)}</span>
                      ) : a.balance < 0 ? (
                        <span className="badge badge-danger">দিবে {fmt(a.balance)}</span>
                      ) : (
                        <span className="badge">সমান</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="btn-group" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || members.length === 0}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-outline" onClick={() => setThisTime({})}>Clear</button>
          <span className="badge badge-info" style={{ alignSelf: 'center' }}>
            এই মাসে জমা: {fmt(account.totalPots)} pot · meal: {fmt(account.totalMeals)}
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>জমার হিসাব - {date}</h3>
        {dateEntries.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🍚</div>
            <p>{date}-এই চাল জমা হয়নি</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>পট</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dateEntries.map((ch, i) => (
                <tr key={ch.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{ch.member_name}</td>
                  <td><span className="badge badge-info">{ch.pots} pot</span></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ch.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>সব জমার তালিকা ({months[parseInt(listMonth) - 1]} {listYear})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={listMonth} onChange={e => setListMonth(e.target.value)} style={{ fontSize: 13 }}>
              {months.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
            <select value={listYear} onChange={e => setListYear(e.target.value)} style={{ fontSize: 13 }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="badge badge-warning">মোট: {fmt(listMonthTotal)} pot</span>
          </div>
        </div>
        {listChal.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🍚</div>
            <p>{months[parseInt(listMonth) - 1]} মাসে কোনো চাল জমা হয়নি</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>পট</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...listChal].sort((a, b) => b.date.localeCompare(a.date)).map(ch => (
                <tr key={ch.id}>
                  <td>{ch.date}</td>
                  <td style={{ fontWeight: 600 }}>{ch.member_name}</td>
                  <td><span className="badge badge-info">{ch.pots} pot</span></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ch.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Chal