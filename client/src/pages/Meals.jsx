import { useState, useEffect } from 'react'
import { fetchMembers, fetchMeals, fetchMealCounts, toggleMeals, unmarkMeals, toggleGuestMeal, deleteMeal } from '../api'
import { toLocalDate } from '../utils'

function Meals() {
  const [members, setMembers] = useState([])
  const [meals, setMeals] = useState([])
  const [counts, setCounts] = useState({ breakfast: 0, lunch: 0, dinner: 0 })
  const [date, setDate] = useState(toLocalDate())
  const [activeType, setActiveType] = useState('breakfast')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [guestMember, setGuestMember] = useState('')
  const [guestName, setGuestName] = useState('')

  const mealTypes = [
    { key: 'breakfast', label: 'সকাল', emoji: '🌅' },
    { key: 'lunch', label: 'দুপুর', emoji: '☀️' },
    { key: 'dinner', label: 'রাত', emoji: '🌙' },
  ]

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

  // determine which members already ate a REGULAR meal for active type
  // (guest meals are tracked separately and should not mark a member as "ate")
  const alreadyAte = meals
    .filter(m => m.meal_type === activeType && !m.is_guest)
    .map(m => m.member_id)

  const handleSave = async () => {
    if (selected.length === 0) return alert('যাদের meal দিতে চান তাদের আগে select করুন')
    setLoading(true)
    await toggleMeals({ member_ids: selected, date, meal_type: activeType })
    setSelected([])
    await loadData()
    setLoading(false)
  }

  const handleUnmark = async () => {
    if (selected.length === 0) return alert('যাদের meal cancel করতে চান তাদের আগে select করুন')
    if (!confirm(`${selected.length} জন member-এর ${mealTypes.find(t => t.key === activeType)?.label} meal বাতিল হবে। নিশ্চিত?`)) return
    setLoading(true)
    await unmarkMeals({ member_ids: selected, date, meal_type: activeType })
    setSelected([])
    await loadData()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this meal entry?')) return
    await deleteMeal(id)
    await loadData()
  }

  const handleGuest = async () => {
    if (!guestMember) return alert('কোনো member বাছাই করুন যাকে guest-এর meal যোগ করতে হবে')
    setLoading(true)
    await toggleGuestMeal({ member_id: Number(guestMember), date, meal_type: activeType, guest_name: guestName || 'Guest' })
    setGuestMember('')
    setGuestName('')
    await loadData()
    setLoading(false)
  }

  // group meals by type for display
  const grouped = {
    breakfast: meals.filter(m => m.meal_type === 'breakfast'),
    lunch: meals.filter(m => m.meal_type === 'lunch'),
    dinner: meals.filter(m => m.meal_type === 'dinner'),
  }

  return (
    <div>
      <div className="page-header">
        <h2>Meals</h2>
      </div>

      <div className="date-picker">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Meal Entry - {date}</h3>

        <div className="meal-tabs">
          {mealTypes.map(t => (
            <button
              key={t.key}
              className={`meal-tab ${activeType === t.key ? 'active' : ''}`}
              onClick={() => {
                setActiveType(t.key)
                setSelected([])
              }}
            >
              {t.emoji} {t.label}
              <span className="meal-tab-count">
                {counts[t.key] || 0} জন
              </span>
            </button>
          ))}
        </div>

        <p className="helper-text" style={{ marginTop: 12, marginBottom: 12 }}>
          কার খাবার চিহ্নিত করবেন select করুন → <strong>✅ Save</strong>। বাদ দিতে select করে <strong>❌ Unmark</strong>।
        </p>

        <div className="checkbox-grid">
          {members.map(m => {
            const isMarked = selected.includes(m.id)
            const isAlready = alreadyAte.includes(m.id)
            const toggle = () => {
              setSelected(prev =>
                prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
              )
            }
            return (
              <div
                key={m.id}
                className={`checkbox-item ${isMarked ? 'selected' : ''} ${isAlready && !isMarked ? 'already-eaten' : ''}`}
                onClick={toggle}
              >
                <input
                  type="checkbox"
                  checked={isMarked}
                  onChange={toggle}
                  onClick={e => e.stopPropagation()}
                />
                <span>{m.name}</span>
                {isAlready && !isMarked && <span className="badge badge-success" style={{ marginLeft: 6 }}>marked</span>}
              </div>
            )
          })}
        </div>

        {members.length === 0 && (
          <p className="helper-text" style={{ marginTop: 12 }}>⚠️ প্রথমে Members পেজ থেকে members যোগ করুন</p>
        )}

        <div className="btn-group" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || members.length === 0}>
            {loading ? 'Processing...' : `✅ Save ${mealTypes.find(t => t.key === activeType)?.emoji}`}
          </button>
          <button className="btn btn-danger" onClick={handleUnmark} disabled={loading || selected.length === 0}>
            ❌ Unmark ({selected.length} জন)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>👥 Guest Meal</h3>
        <p className="helper-text" style={{ marginBottom: 12 }}>
          গেস্ট খেয়ে থাকলে member বাছাই করে যোগ করুন — meal +১ হবে।
        </p>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label>সদস্য (যে member-এর guest)</label>
            <select value={guestMember} onChange={e => setGuestMember(e.target.value)}>
              <option value="">-- বাছাই --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Guest-এর নাম (optional)</label>
            <input
              type="text"
              placeholder="যেমন: আব্দুল্লাহর বন্ধু"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-success" onClick={handleGuest} disabled={loading || members.length === 0}>
          {loading ? 'Saving...' : `👥 Guest Meal যোগ ${mealTypes.find(t => t.key === activeType)?.emoji}`}
        </button>
      </div>

      {mealTypes.map(t => {
        const list = grouped[t.key]
        return (
          <div className="card" key={t.key} style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>
              {t.emoji} {t.label} ({list.length} জন)
            </h3>
            {list.length === 0 ? (
              <p className="helper-text">কেউ পরেনি {date}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((meal, i) => (
                    <tr key={meal.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        {meal.member_name}
                        {meal.is_guest ? (
                          <div>
                            <span className="badge badge-warning">👥 Guest</span>
                            {meal.guest_name && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-light)' }}>({meal.guest_name})</span>}
                          </div>
                        ) : null}
                      </td>
                      <td>{meal.created_at}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(meal.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Meals
