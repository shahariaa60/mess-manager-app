import { useEffect, useState } from 'react'
import { fetchMyChal } from '../api'
import {
  PageHeader, StatCard, BalanceBadge, EmptyState,
  IconChal, IconMeals, IconScale, IconInbox, num,
} from '../components/ui'

export default function MyChal() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchMyChal().then(d => d && d.month_total !== undefined && setData(d))
  }, [])

  if (!data) {
    return (
      <div className="page">
        <PageHeader title="চাল" />
        <div className="card"><EmptyState icon={<IconInbox size={22} />} title="লোড হচ্ছে..." /></div>
      </div>
    )
  }

  const bal = data.balance || 0

  return (
    <div className="page">
      <PageHeader title="আমার চাল" subtitle="এই মাসের হিসাব" />

      <div className="card-grid">
        <StatCard tone="green" icon={<IconChal size={19} />} label="এই মাসে জমা (পট)" value={num(data.month_total)} />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="এই মাসে ভাত" value={num(data.month_meals)} />
        <StatCard tone={bal > 0 ? 'green' : bal < 0 ? 'red' : 'slate'} icon={<IconScale size={19} />} label="ব্যালেন্স" value={<BalanceBadge value={bal} />} />
      </div>
    </div>
  )
}