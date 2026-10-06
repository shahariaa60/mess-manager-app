import { useEffect, useState } from 'react'
import { fetchMyDashboard, fetchMyReport, fetchMyMealsOnDate } from '../api'
import { toLocalDate } from '../utils'

function fmt(n) {
  return (n == null ? 0 : n).toLocaleString('bn-BD')
}

const taka = n => `৳${fmt(Math.round(Number(n || 0)))}`

const balanceBadge = v => {
  if (v > 0) return <span className="badge badge-success">পাবে +৳{fmt(v)}</span>
  if (v < 0) return <span className="badge badge-danger">দিবে ৳{fmt(Math.abs(v))}</span>
  return <span className="badge badge-info">সমতা</span>
}

export default function MyDashboard() {
  const [data, setData] = useState(null)
  const [bill, setBill] = useState(null)
  const [dayMeals, setDayMeals] = useState(null)
  const [day, setDay] = useState(toLocalDate())

  const todayStr = toLocalDate()
  const now = new Date()

  useEffect(() => {
    fetchMyDashboard().then(d => d && d.monthMeals !== undefined && setData(d))
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const y = String(now.getFullYear())
    fetchMyReport(m, y).then(r => {
      if (r && r.memberBills && r.memberBills.length) setBill(r.memberBills[0])
    })
  }, [])

  useEffect(() => {
    setDayMeals(null)
    fetchMyMealsOnDate(day).then(d => d && d.total !== undefined && setDayMeals(d))
  }, [day])

  const d = dayMeals || { breakfast: 0, lunch: 0, dinner: 0, guest: 0, total: 0 }

  return (
    <div>
      <div className="page-header">
        <h2>আমার ড্যাশবোর্ড</h2>
      </div>

      <div className="day-meals-card card" style={{ marginBottom: 24 }}>
        <div className="day-meals-head">
          <div>
            <h3 style={{ marginBottom: 8 }}>দৈনিক খাবার</h3>
            <p className="helper-text">
              {day === todayStr ? 'আজ' : 'তথ্য'}
              {day === todayStr && d.total > 0 ? ` ${fmt(d.total)} টি খাবার হয়েছে` : day === todayStr && d.total === 0 ? ' এখনো কোনো খাবার হয়নি' : ''}
            </p>
          </div>
          <input type="date" value={day} max={todayStr} onChange={e => setDay(e.target.value)} className="day-date" />
        </div>
        <div className="day-slots">
          {[
            { key: 'breakfast', label: 'সকাল', icon: '🌅' },
            { key: 'lunch', label: 'দুপুর', icon: '🌞' },
            { key: 'dinner', label: 'রাত', icon: '🌙' },
          ].map(slot => (
            <div key={slot.key} className={`day-slot ${d[slot.key] > 0 ? 'yes' : 'no'}`}>
              <div className="day-slot-icon">{slot.icon}</div>
              <div className="day-slot-label">{slot.label}</div>
              <div className="day-slot-state">
                {d[slot.key] > 0 ? '✔ খেয়েছে' : '✘ খায়নি'}
              </div>
            </div>
          ))}
          <div className={`day-slot ${d.guest > 0 ? 'yes' : 'no'}`}>
            <div className="day-slot-icon">👥</div>
            <div className="day-slot-label">অতিথি</div>
            <div className="day-slot-state">
              {d.guest > 0 ? `✔ ${fmt(d.guest)} জন` : '✘ নেই'}
            </div>
          </div>
        </div>
        <div className="day-meals-total">
          {day === todayStr ? 'আজকের' : 'এই দিনের'} মোট খাবার:{' '}
          <strong className={d.total > 0 ? 'text-success' : 'text-danger'}>{fmt(d.total)}</strong>
        </div>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🍛</div>
          <div className="stat-info">
            <h3>{fmt(data && data.monthMeals)}</h3>
            <p>এই মাসের খাবার</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🍚</div>
          <div className="stat-info">
            <h3>{fmt(data && data.monthChal)}</h3>
            <p>এই মাসের চাল (পট)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🧾</div>
          <div className="stat-info">
            <h3>{taka(bill && bill.bill)}</h3>
            <p>এই মাসের মোট বিল</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💳</div>
          <div className="stat-info">
            <h3>{taka(bill && bill.monthDeposit)}</h3>
            <p>এই মাসে জমা</p>
          </div>
        </div>
        <div className="stat-card">
          <div className={`stat-icon ${bill && bill.allTimeBalance >= 0 ? 'green' : 'red'}`}>⚖️</div>
          <div className="stat-info">
            <h3>{taka(bill && bill.allTimeBalance)}</h3>
            <p>মোট ব্যালেন্স (সব মাস)</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>চাল ব্যালেন্স</h3>
        <p className="helper-text">
          {data && data.chalBalance > 0
            ? `+${fmt(data.chalBalance)} পট চাল — পাবেন (জমা বেশি)`
            : data && data.chalBalance < 0
              ? `${fmt(Math.abs(data.chalBalance))} পট চাল — দিতে হবে`
              : 'চাল ব্যালেন্স সমতা'}
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>এই মাসের হিসাব</h3>
          {bill && bill.prevBalance !== 0 ? (
            <span className={`badge ${bill.prevBalance > 0 ? 'badge-success' : 'badge-danger'}`}>
              আগের মাস {bill.prevBalance > 0 ? '+' : '−'}{fmt(Math.abs(bill.prevBalance))}
            </span>
          ) : null}
        </div>
        {bill ? (
          <table>
            <thead>
              <tr>
                <th>খাবার বিল</th>
                <th>অন্যান্য খরচ</th>
                <th>মোট বিল</th>
                <th>এই মাসে জমা</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{taka(bill.meal_bill)}</td>
                <td>{taka(bill.add_expense_share)}</td>
                <td><strong>{taka(bill.bill)}</strong></td>
                <td>{taka(bill.monthDeposit)}</td>
                <td>{balanceBadge(bill.allTimeBalance)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="helper-text">এই মাসের জন্য এখনও তথ্য নেই।</p>
        )}
      </div>
    </div>
  )
}