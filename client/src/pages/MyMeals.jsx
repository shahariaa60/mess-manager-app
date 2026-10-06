import { useEffect, useState } from 'react'
import { fetchMyMeals } from '../api'
import {
  PageHeader, MonthPicker, StatCard, EmptyState,
  IconMeals, IconCheck, IconMembers, IconInbox, IconAlert, num, MONTHS_BN,
} from '../components/ui'

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
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  return (
    <div className="page">
      <PageHeader
        title="আমার খাবার"
        subtitle={label}
        actions={<MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />}
      />

      {error && <div className="alert alert-error"><IconAlert size={17} /><span>{error}</span></div>}

      <div className="card-grid">
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="নাস্তা" value={num(rows.breakfast)} />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="দুপুর" value={num(rows.lunch)} />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="রাত" value={num(rows.dinner)} />
        <StatCard tone="yellow" icon={<IconMembers size={19} />} label="অতিথি" value={num(rows.guest)} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>সর্বমোট</h3>
          <span className="sub">{label}</span>
        </div>
        {rows.total_meals > 0 ? (
          <div className="day-meals-total" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconCheck size={18} />
            <span style={{ fontSize: 26, fontWeight: 700 }}>{num(rows.total_meals)}</span>
            <span className="muted">টি খাবার</span>
          </div>
        ) : (
          <EmptyState icon={<IconInbox size={22} />} title="এই মাসে কোনো খাবার নেই" />
        )}
      </div>
    </div>
  )
}