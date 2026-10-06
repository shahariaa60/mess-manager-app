import { useState, useEffect } from 'react'
import { fetchDashboard } from '../api'
import {
  PageHeader, StatCard, EmptyState, TableWrap, MonthPicker,
  IconMembers, IconMeals, IconExpenses, IconBazaar, IconChal,
  IconPayments, IconReport, IconScale, IconDashboard,
  money, MONTHS_BN,
} from '../components/ui'
import { num } from '../utils'

function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [data, setData] = useState(null)
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  useEffect(() => {
    setData(null)
    fetchDashboard({ month, year }).then(setData)
  }, [month, year])

  if (!data) {
    return (
      <div className="page">
        <PageHeader title="ড্যাশবোর্ড" subtitle={label} />
        <EmptyState icon={<IconDashboard size={22} />} title="লোড হচ্ছে..." />
      </div>
    )
  }

  const b = data.isCurrentMonth ? data.todayMeals : data.monthMealTypes
  const totalCost = data.monthBazaarTotal + data.monthExpenses

  return (
    <div className="page">
      <PageHeader
        title="ড্যাশবোর্ড"
        subtitle={label}
        actions={<MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />}
      />

      <div className="card-grid">
        <StatCard tone="slate" icon={<IconMembers size={19} />} label="Active সদস্য" value={num(data.totalMembers)} />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label={data.isCurrentMonth ? 'আজকের খাবার' : 'মাসের খাবার'} value={`${num(b.breakfast)} / ${num(b.lunch)} / ${num(b.dinner)}`} sub="সকাল / দুপুর / রাত" />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="মাসের মোট meal" value={num(data.monthMeals)} />
        <StatCard tone="yellow" icon={<IconMeals size={19} />} label="মোট Meal Count" value={num(data.monthMealCount)} />
        <StatCard tone="yellow" icon={<IconChal size={19} />} label="চাল জমা" value={`${num(data.monthChal)} পট`} />
      </div>

      <div className="card-grid">
        <StatCard tone="green" icon={<IconBazaar size={19} />} label="মাসের বাজার" value={money(data.monthBazaarTotal)} />
        <StatCard tone="slate" icon={<IconExpenses size={19} />} label="মাসের খরচ" value={money(data.monthExpenses)} />
        <StatCard tone="green" icon={<IconExpenses size={19} />} label="মোট খরচ" value={money(totalCost)} />
        <StatCard tone="red" icon={<IconPayments size={19} />} label="Meal Rate" value={money(data.mealRate)} />
        <StatCard tone="slate" icon={<IconReport size={19} />} label="মোট বিল" value={money(data.totalBills)} />
      </div>

      <div className="card-grid">
        <StatCard tone="green" icon={<IconScale size={19} />} label="এই মাসে জমা" value={money(data.totalMonthDeposit)} />
        <StatCard tone="green" icon={<IconScale size={19} />} label="সব মিলিয়ে পাবে" value={money(data.willGet)} />
        <StatCard tone="red" icon={<IconScale size={19} />} label="সব মিলিয়ে দিবে" value={money(data.willGive)} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>সাম্প্রতিক খরচ</h3>
          <span className="sub">{label}</span>
        </div>
        {data.recentExpenses.length === 0 ? (
          <EmptyState icon={<IconExpenses size={22} />} title="এই মাসে কোনো খরচ লেখা হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ধরন</th>
                  <th>বিবরণ</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="muted">{exp.date}</td>
                    <td><span className="badge badge-info">{exp.category}</span></td>
                    <td className="muted">{exp.description || '—'}</td>
                    <td className="num strong">{money(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  )
}

export default Dashboard