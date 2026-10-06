import { useState, useEffect } from 'react'
import { fetchMembers, fetchMeals, fetchMealCounts, toggleMeals, unmarkMeals, toggleGuestMeal, deleteMeal } from '../api'
import { toLocalDate } from '../utils'
import {
  PageHeader, StatCard, EmptyState, TableWrap,
  IconMeals, IconCheck, IconTrash, IconPlus, IconInbox, IconAlert, num,
} from '../components/ui'

const MEAL_TYPES = [
  { key: 'breakfast', label: 'সকাল' },
  { key: 'lunch', label: 'দুপুর' },
  { key: 'dinner', label: 'রাত' },
]

function Meals() {
  const [members, setMembers] = useState([])
  const [meals, setMeals] = useState([])
  const [counts, setCounts] = useState({ breakfast: 0, lunch: 0, dinner: 0 })
  const [date, setDate] = useState(toLocalDate())
  const [activeType, setActiveType] = useState('breakfast')
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [guestMember, setGuestMember] = useState('')
  const [guestName, setGuestName] = useState('')

  const activeLabel = MEAL_TYPES.find(t => t.key === activeType)?.label || ''

  const loadData = async () => {
    const [m, ml, c] = await Promise.all([fetchMembers(), fetchMeals({ date }), fetchMealCounts(date)])
    setMembers(m)
    setMeals(ml)
    setCounts(c)
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    setSelected([])
    fetchMeals({ date }).then(setMeals)
    fetchMealCounts(date).then(setCounts)
  }, [date])

  const alreadyAte = meals
    .filter(m => m.meal_type === activeType && !m.is_guest)
    .map(m => m.member_id)

  const handleSave = async () => {
    if (selected.length === 0) return alert('যাদের খাবার চিহ্নিত করবেন তাদের select করুন')
    setSaving(true)
    await toggleMeals({ member_ids: selected, date, meal_type: activeType })
    setSelected([])
    await loadData()
    setSaving(false)
  }

  const handleUnmark = async () => {
    if (selected.length === 0) return alert('যাদের meal বাতিল করতে চান তাদের select করুন')
    if (!confirm(`${selected.length} জন সদস্যের ${activeLabel} meal বাতিল হবে। নিশ্চিত?`)) return
    setSaving(true)
    await unmarkMeals({ member_ids: selected, date, meal_type: activeType })
    setSelected([])
    await loadData()
    setSaving(false)
  }

  const handleDelete = async id => {
    if (!confirm('এই meal entry মুছে ফেলবেন?')) return
    await deleteMeal(id)
    await loadData()
  }

  const handleGuest = async () => {
    if (!guestMember) return alert('কোনো সদস্য বাছুন')
    setSaving(true)
    await toggleGuestMeal({ member_id: Number(guestMember), date, meal_type: activeType, guest_name: guestName || 'Guest' })
    setGuestMember('')
    setGuestName('')
    await loadData()
    setSaving(false)
  }

  const grouped = Object.fromEntries(
    MEAL_TYPES.map(t => [t.key, meals.filter(m => m.meal_type === t.key)])
  )

  return (
    <div className="page">
      <PageHeader
        title="খাবার"
        subtitle={date}
        actions={<input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="তারিখ" style={{ width: 'auto' }} />}
      />

      <div className="card-grid">
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="সকাল" value={num(counts.breakfast || 0)} />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="দুপুর" value={num(counts.lunch || 0)} />
        <StatCard tone="slate" icon={<IconMeals size={19} />} label="রাত" value={num(counts.dinner || 0)} />
        <StatCard tone="yellow" icon={<IconMeals size={19} />} label="মোট entry" value={num(meals.length)} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Meal Entry</h3>
          <div className="meal-tabs">
            {MEAL_TYPES.map(t => (
              <button
                key={t.key}
                className={`meal-tab ${activeType === t.key ? 'active' : ''}`}
                onClick={() => { setActiveType(t.key); setSelected([]) }}
              >
                {t.label}
                <span className="meal-tab-count">{num(counts[t.key] || 0)}</span>
              </button>
            ))}
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyState icon={<IconAlert size={22} />} title="আগে সদস্য পেজ থেকে সদস্য যোগ করুন" />
        ) : (
          <>
            <div className="checkbox-grid">
              {members.map(m => {
                const isMarked = selected.includes(m.id)
                const isAlready = alreadyAte.includes(m.id)
                const toggle = () => setSelected(prev =>
                  prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                )
                return (
                  <label
                    key={m.id}
                    className={`checkbox-item ${isMarked ? 'selected' : ''} ${isAlready && !isMarked ? 'already-eaten' : ''}`}
                  >
                    <input type="checkbox" checked={isMarked} onChange={toggle} />
                    <span>{m.name}</span>
                    {isAlready && !isMarked ? <span className="badge badge-success">খেয়েছে</span> : null}
                  </label>
                )
              })}
            </div>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || selected.length === 0}>
                <IconCheck size={16} />
                {saving ? 'প্রসেস হচ্ছে...' : `সেভ করুন (${selected.length})`}
              </button>
              <button className="btn btn-danger-quiet" onClick={handleUnmark} disabled={saving || selected.length === 0}>
                বাতিল করুন ({selected.length})
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Guest Meal</h3>
          <span className="sub">meal +১ হবে</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="g-member">সদস্য</label>
            <select id="g-member" value={guestMember} onChange={e => setGuestMember(e.target.value)}>
              <option value="">বাছুন</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="g-name">Guest-এর নাম</label>
            <input id="g-name" type="text" placeholder="ঐচ্ছিক" value={guestName} onChange={e => setGuestName(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-success" onClick={handleGuest} disabled={saving || !guestMember}>
          <IconPlus size={16} />
          {saving ? 'যোগ হচ্ছে...' : 'Guest Meal যোগ করুন'}
        </button>
      </div>

      {MEAL_TYPES.map(t => {
        const list = grouped[t.key]
        return (
          <div className="card" key={t.key}>
            <div className="card-head">
              <h3>{t.label}</h3>
              <span className="sub">{list.length} জন</span>
            </div>
            {list.length === 0 ? (
              <EmptyState icon={<IconInbox size={22} />} title={`${date} তারিখে কেউ খায়নি`} />
            ) : (
              <TableWrap>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>সদস্য</th>
                      <th>সময়</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((meal, i) => (
                      <tr key={meal.id}>
                        <td className="muted">{i + 1}</td>
                        <td className="name">
                          {meal.member_name}
                          {meal.is_guest ? (
                            <span className="badge badge-warning">
                              Guest{meal.guest_name ? ` · ${meal.guest_name}` : ''}
                            </span>
                          ) : null}
                        </td>
                        <td className="muted">{meal.created_at}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(meal.id)} aria-label="Delete">
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Meals