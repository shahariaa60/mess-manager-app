import { useEffect, useState } from 'react'
import { fetchMyReport } from '../api'
import {
  PageHeader, StatCard, BalanceBadge, EmptyState, TableWrap, MonthPicker,
  IconMeals, IconChal, IconPayments, IconScale, IconReport,
  money, MONTHS_BN,
} from '../components/ui'
import { num } from '../utils'

export default function MyReport() {
  const now = new Date()
  const years = []
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y)

  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  useEffect(() => {
    setError('')
    setData(null)
    fetchMyReport(month, year)
      .then(r => {
        if (r && r.memberBills) setData(r)
        else setError((r && r.error) || 'লোড করা যায়নি')
      })
      .catch(() => setError('লোড করা যায়নি'))
  }, [month, year])

  const row = data && data.memberBills && data.memberBills[0]
  const perMeal = data ? data.perMealCost || 0 : 0

  return (
    <div className="page">
      <PageHeader
        title="আমার হিসাব"
        subtitle={label}
        actions={<MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} years={years} />}
      />

      {error && <div className="alert alert-error">{error}</div>}

      {row ? (
        <>
          <div className="card-grid">
            <StatCard tone="slate" icon={<IconMeals size={19} />} label="অতিথিসহ খাবার" value={num(row.total_meals)} />
            <StatCard tone="yellow" icon={<IconChal size={19} />} label="চাল" value={`${num(row.chal)} পট`} />
            <StatCard tone="red" icon={<IconPayments size={19} />} label="প্রতি খাবারের দর" value={money(perMeal)} />
            <StatCard tone="green" icon={<IconScale size={19} />} label="এই মাসে জমা" value={money(row.monthDeposit)} />
          </div>

          <div className="card-grid">
            <StatCard
              tone={row.allTimeBalance >= 0 ? 'green' : 'red'}
              icon={<IconScale size={19} />}
              label="মোট ব্যালেন্স"
              value={<BalanceBadge value={row.allTimeBalance} />}
            />
          </div>

          <div className="card">
            <div className="card-head">
              <h3>আমার বিল</h3>
              <span className="sub">{label}</span>
            </div>
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
                    <td className="num">{money(row.meal_bill)}</td>
                    <td className="num">{money(row.add_expense_share)}</td>
                    <td className="num strong text-accent">{money(row.bill)}</td>
                    <td className="num strong">{money(row.monthDeposit)}</td>
                    <td className="num"><BalanceBadge value={row.allTimeBalance} /></td>
                  </tr>
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      ) : (
        !error && <div className="card"><EmptyState icon={<IconReport size={22} />} title="এই মাসের তথ্য নেই" /></div>
      )}
    </div>
  )
}