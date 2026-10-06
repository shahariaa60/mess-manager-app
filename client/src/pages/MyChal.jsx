import { useEffect, useState } from 'react'
import { fetchMyChal } from '../api'

function fmt(n) {
  return (n == null ? 0 : n).toLocaleString('bn-BD')
}

const balanceBadge = v => {
  if (v > 0) return <span className="badge badge-success">পাবে +{fmt(v)} পট</span>
  if (v < 0) return <span className="badge badge-danger">দিবে {fmt(Math.abs(v))} পট</span>
  return <span className="badge badge-info">সমতা</span>
}

export default function MyChal() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchMyChal().then(d => d && d.month_total !== undefined && setData(d))
  }, [])

  if (!data) {
    return (
      <div className="page-header">
        <h2>চাল</h2>
      </div>
    )
  }

  const bal = data.balance || 0

  return (
    <div>
      <div className="page-header">
        <h2>আমার চাল</h2>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon green">🍚</div>
          <div className="stat-info">
            <h3>{fmt(data.month_total)}</h3>
            <p>এই মাসে জমা (পট)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🍛</div>
          <div className="stat-info">
            <h3>{fmt(data.month_meals)}</h3>
            <p>এই মাসে ভাত</p>
          </div>
        </div>
        <div className="stat-card">
          <div className={`stat-icon ${bal >= 0 ? 'green' : 'red'}`}>⚖️</div>
          <div className="stat-info">
            <h3>{fmt(data.month_total - data.month_meals)}</h3>
            <p>এই মাসের পট − ভাত</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>সর্বমোট চাল ব্যালেন্স</h3>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{balanceBadge(bal)}</div>
        <p className="helper-text" style={{ marginTop: 8 }}>
          {bal > 0
            ? `${fmt(bal)} পট চাল পাবেন (জমা বেশি)`
            : bal < 0
              ? `${fmt(Math.abs(bal))} পট চাল দিতে হবে`
              : 'চাল ব্যালেন্স সমতা'}
        </p>
      </div>
    </div>
  )
}