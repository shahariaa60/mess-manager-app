import { useEffect, useState } from 'react'
import { fetchMyReport } from '../api'

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

function fmt(n) {
  return (n == null ? 0 : n).toLocaleString('bn-BD')
}

const taka = n => `৳${fmt(Math.round(Number(n || 0)))}`

const balanceBadge = v => {
  if (v > 0) return <span className="badge badge-success">পাবে +৳{fmt(v)}</span>
  if (v < 0) return <span className="badge badge-danger">দিবে ৳{fmt(Math.abs(v))}</span>
  return <span className="badge badge-info">সমতা</span>
}

export default function MyReport() {
  const now = new Date()
  const yearOptions = []
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) yearOptions.push(y)

  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    setData(null)
    fetchMyReport(month, year).then(r => {
      if (r && r.memberBills) setData(r)
      else setError((r && r.error) || 'লোড করা যায়নি')
    })
  }, [month, year])

  const row = data && data.memberBills && data.memberBills[0]
  const perMeal = data ? data.perMealCost || 0 : 0

  return (
    <div>
      <div className="page-header">
        <h2>আমার হিসাব</h2>
      </div>

      <div className="month-selector" style={{ marginBottom: 20 }}>
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {row ? (
        <>
          <div className="card-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon blue">🍛</div>
              <div className="stat-info">
                <h3>{fmt(row.total_meals)}</h3>
                <p>অতিথিসহ খাবার</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">🍚</div>
              <div className="stat-info">
                <h3>{fmt(row.chal)}</h3>
                <p>চাল (পট)</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">💰</div>
              <div className="stat-info">
                <h3>{taka(perMeal)}</h3>
                <p>প্রতি খাবারের দর</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">💳</div>
              <div className="stat-info">
                <h3>{taka(row.monthDeposit)}</h3>
                <p>এই মাসে জমা</p>
              </div>
            </div>
            <div className="stat-card">
              <div className={`stat-icon ${row.allTimeBalance >= 0 ? 'green' : 'red'}`}>⚖️</div>
              <div className="stat-info">
                <h3>{taka(row.allTimeBalance)}</h3>
                <p>মোট ব্যালেন্স (সব মাস)</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{MONTHS[Number(month) - 1]} {year} — আমার বিল</h3>
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
                  <td>{taka(row.meal_bill)}</td>
                  <td>{taka(row.add_expense_share)}</td>
                  <td><strong>{taka(row.bill)}</strong></td>
                  <td>{taka(row.monthDeposit)}</td>
                  <td>{balanceBadge(row.allTimeBalance)}</td>
                </tr>
              </tbody>
            </table>
            {row.prevBalance !== 0 && (
              <p className="helper-text" style={{ marginTop: 12 }}>
                আগের মাসের হিসাব {row.prevBalance > 0 ? '+' : '−'}{taka(Math.abs(row.prevBalance))} — এই মাসের জমায় যুক্ত হয়েছে।
              </p>
            )}
          </div>
        </>
      ) : (
        !error && (
          <div className="card">
            <p className="helper-text">এই মাসের জন্য তথ্য নেই।</p>
          </div>
        )
      )}
    </div>
  )
}