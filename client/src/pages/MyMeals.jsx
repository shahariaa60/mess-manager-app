import { useEffect, useState } from 'react'
import { fetchMyMeals } from '../api'

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

function fmt(n) {
  return (n == null ? 0 : n).toLocaleString('bn-BD')
}

export default function MyMeals() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    fetchMyMeals({ month, year }).then(d => {
      if (d && d.total_meals !== undefined) setData(d)
      else setError((d && d.error) || 'লোড করা যায়নি')
    })
  }, [month, year])

  const rows = data || { total_meals: 0, breakfast: 0, lunch: 0, dinner: 0, guest: 0 }

  return (
    <div>
      <div className="page-header">
        <h2>খাবার</h2>
      </div>

      <div className="month-selector" style={{ marginBottom: 20 }}>
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🥣</div>
          <div className="stat-info">
            <h3>{fmt(rows.breakfast)}</h3>
            <p>নাস্তা</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🍛</div>
          <div className="stat-info">
            <h3>{fmt(rows.lunch)}</h3>
            <p>দুপুর</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">🍽️</div>
          <div className="stat-info">
            <h3>{fmt(rows.dinner)}</h3>
            <p>রাত</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">👤</div>
          <div className="stat-info">
            <h3>{fmt(rows.guest)}</h3>
            <p>অতিথি</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>সর্বমোট</h3>
        <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>
          {fmt(rows.total_meals)} <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-light)' }}>টি খাবার</span>
        </p>
      </div>
    </div>
  )
}