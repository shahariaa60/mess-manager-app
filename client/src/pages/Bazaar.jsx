import { useState, useEffect } from 'react'
import { fetchMembers, fetchBazaar, addBazaar, deleteBazaar } from '../api'
import { toLocalDate } from '../utils'

function Bazaar() {
  const now = new Date()
  const [members, setMembers] = useState([])
  const [list, setList] = useState([])
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))

  const [form, setForm] = useState({
    member_id: '',
    date: toLocalDate(),
    total_amount: '',
    notes: '',
    items: [{ item_name: '', quantity: '', amount: '' }],
  })
  const [loading, setLoading] = useState(false)

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ]

  const loadData = async () => {
    const [m] = await Promise.all([fetchMembers()])
    setMembers(m)
    if (!form.member_id && m.length > 0) setForm(f => ({ ...f, member_id: String(m[0].id) }))
  }

  const loadBazaar = async () => {
    const data = await fetchBazaar({ month, year })
    setList(data)
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadBazaar() }, [month, year])

  const updateItem = (index, field, value) => {
    const items = [...form.items]
    items[index][field] = value
    setForm({ ...form, items })
  }

  const addItemRow = () => {
    setForm({ ...form, items: [...form.items, { item_name: '', quantity: '', amount: '' }] })
  }

  const removeItemRow = (index) => {
    const items = form.items.filter((_, i) => i !== index)
    setForm({ ...form, items })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.member_id) return alert('কে বাজার করেছে বাছুন')
    setLoading(true)

    const validItems = form.items.filter(i => i.item_name.trim())
    const totalFromItems = validItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    // if no explicit total given, sum from items
    const totalAmount = form.total_amount ? Number(form.total_amount) : totalFromItems

    await addBazaar({
      member_id: Number(form.member_id),
      date: form.date,
      total_amount: totalAmount,
      notes: form.notes,
      items: validItems.map(i => ({
        item_name: i.item_name.trim(),
        quantity: i.quantity.trim(),
        amount: Number(i.amount) || 0,
      })),
    })

    setForm({
      member_id: form.member_id,
      date: form.date,
      total_amount: '',
      notes: '',
      items: [{ item_name: '', quantity: '', amount: '' }],
    })
    await loadBazaar()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this bazaar record?')) return
    await deleteBazaar(id)
    await loadBazaar()
  }

  const monthTotal = list.reduce((sum, b) => sum + Number(b.total_amount), 0)
  const bazaarCount = list.length

  return (
    <div>
      <div className="page-header">
        <h2>Bazaar</h2>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>নতুন বাজার যোগ করুন</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>কে বাজার করেছে</label>
              <select
                value={form.member_id}
                onChange={e => setForm({ ...form, member_id: e.target.value })}
                required
              >
                <option value="">-- বাছাই করুন --</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>মোট টাকার বাজার (৳)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="মোট amount"
                value={form.total_amount}
                onChange={e => setForm({ ...form, total_amount: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>নোট (optional)</label>
              <input
                type="text"
                placeholder="যেমন: ৩ দিনের বাজার"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              কি কি কিনলেন (optional)
            </label>
            {form.items.map((item, index) => (
              <div key={index} className="form-row" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="জিনিস"
                  value={item.item_name}
                  onChange={e => updateItem(index, 'item_name', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="পরিমাণ (যেমন ৫kg)"
                  value={item.quantity}
                  onChange={e => updateItem(index, 'quantity', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="টাকা"
                  value={item.amount}
                  onChange={e => updateItem(index, 'amount', e.target.value)}
                  style={{ maxWidth: 120 }}
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeItemRow(index)}
                  style={{ justifySelf: 'start' }}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addItemRow}>
              ➕ আরেকটা জিনিস
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ বাজার সংরক্ষণ করুন'}
          </button>
        </form>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon yellow">🛒</div>
          <div className="stat-info">
            <h3>{bazaarCount}</h3>
            <p>বাজারের সংখ্যা (এই মাস)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-info">
            <h3>৳{monthTotal.toLocaleString()}</h3>
            <p>মোট বাজার খরচ</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📅</div>
          <div className="stat-info">
            <h3>{bazaarCount} / 10</h3>
            <p>মাসের টার্গেট (১০টা)</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3>বাজারের তালিকা</h3>
          <div className="month-selector">
            <select value={month} onChange={e => setMonth(e.target.value)}>
              {months.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🛒</div>
            <p>এই মাসে বাজারের রেকর্ড নেই</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>কে</th>
                <th>মোট টাকা</th>
                <th>কি কিনল</th>
                <th>নোট</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id}>
                  <td>{b.date}</td>
                  <td style={{ fontWeight: 600 }}>{b.member_name}</td>
                  <td style={{ fontWeight: 700 }}>৳{Number(b.total_amount).toLocaleString()}</td>
                  <td>
                    {b.items.length > 0 ? (
                      <div>
                        {b.items.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--text-light)' }}>
                            {item.item_name}{item.quantity ? ` (${item.quantity})` : ''}{item.amount ? ` - ৳${item.amount}` : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>-</span>
                    )}
                  </td>
                  <td>{b.notes || '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Bazaar
