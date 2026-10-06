import { useEffect, useState } from 'react'
import { fetchMyDashboard, fetchMyReport, fetchMyMealsOnDate } from '../api'
import {
  PageHeader, StatCard, BalanceBadge, EmptyState, TableWrap,
  IconMeals, IconChal, IconScale, IconReport, IconPayments, IconInbox, money,
} from '../components/ui'
import { num, MONTHS_BN, toLocalDate } from '../utils'

const SLOTS = [
  { key: 'breakfast', label: 'সকাল' },
  { key: 'lunch', label: 'দুপুর' },
  { key: 'dinner', label: 'রাত' },
]

export default function MyDashboard() {
  const [data, setData] = useState(null)
  const [bill, setBill] = useState(null)
  const [dayMeals, setDayMeals] = useState(null)
  const [day, setDay] = useState(toLocalDate())

  const todayStr = toLocalDate()
  const now = new Date()
  const label = `${MONTHS_BN[now.getMonth()]} ${now.getFullYear()}`

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
    <div className="page">
      <PageHeader title="আমার ড্যাশবোর্ড" subtitle={label} />

      <div className="card">
        <div className="card-head">
          <h3>দৈনিক খাবার</h3>
          <input type="date" value={day} max={todayStr} onChange={e => setDay(e.target.value)} aria-label="তারিখ" style={{ width: 'auto' }} />
        </div>
        <div className="day-slots">
          {SLOTS.map(slot => (
            <div key={slot.key} className={`day-slot ${d[slot.key] > 0 ? 'yes' : 'no'}`}>
              <div className="day-slot-icon"><IconMeals size={22} /></div>
              <div className="day-slot-label">{slot.label}</div>
              <div className="day-slot-state">{d[slot.key] > 0 ? 'খেয়েছে' : 'খায়নি'}</div>
            </div>
          ))}
          <div className={`day-slot ${d.guest > 0 ? 'yes' : 'no'}`}>
            <div className="day-slot-icon"><IconInbox size={22} /></div>
            <div className="day-slot-label">অতিথি</div>
            <div className="day-slot-state">{d.guest > 0 ? `${num(d.guest)} জন` : 'নেই'}</div>
          </div>
        </div>
        <div className="day-meals-total">
          মোট খাবার: <strong>{num(d.total)}</strong>
        </div>
      </div>

      <div className="card-grid">
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="এই মাসের খাবার" value={num(data && data.monthMeals)} />
        <StatCard tone="yellow" icon={<IconChal size={19} />} label="এই মাসের চাল" value={`${num(data && data.monthChal)} পট`} />
        <StatCard tone="slate" icon={<IconReport size={19} />} label="এই মাসের বিল" value={money(bill && bill.bill)} />
        <StatCard tone="green" icon={<IconPayments size={19} />} label="এই মাসে জমা" value={money(bill && bill.monthDeposit)} />
        <StatCard
          tone={bill && bill.allTimeBalance >= 0 ? 'green' : 'red'}
          icon={<IconScale size={19} />}
          label="মোট ব্যালেন্স"
          value={<BalanceBadge value={bill && bill.allTimeBalance} />}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>চাল ব্যালেন্স</h3>
        </div>
        <p className="helper-text">
          {data && data.chalBalance > 0
            ? `${num(data.chalBalance)} পট চাল পাবেন`
            : data && data.chalBalance < 0
              ? `${num(Math.abs(data.chalBalance))} পট চাল দিতে হবে`
              : 'চাল ব্যালেন্স সমতা'}
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>এই মাসের হিসাব</h3>
          {bill && bill.prevBalance !== 0 ? (
            <span className="sub">
              আগের মাসের হিসাব {bill.prevBalance > 0 ? '+' : '−'}{money(Math.abs(bill.prevBalance))}
            </span>
          ) : null}
        </div>
        {bill ? (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>খাবার বিল</th>
                  <th className="num">অন্যান্য খরচ</th>
                  <th className="num">মোট বিল</th>
                  <th className="num">এই মাসে জমা</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="num">{money(bill.meal_bill)}</td>
                  <td className="num">{money(bill.add_expense_share)}</td>
                  <td className="num strong text-accent">{money(bill.bill)}</td>
                  <td className="num strong">{money(bill.monthDeposit)}</td>
                  <td className="num"><BalanceBadge value={bill.allTimeBalance} /></td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState icon={<IconReport size={22} />} title="এই মাসের জন্য এখনও তথ্য নেই" />
        )}
      </div>
    </div>
  )
}