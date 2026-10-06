import { useState, useEffect } from 'react'
import { fetchExpenses, addExpense, deleteExpense } from '../api'
import { toLocalDate, num } from '../utils'
import {
  PageHeader, StatCard, EmptyState, TableWrap, MonthPicker,
  IconExpenses, IconPlus, IconTrash, IconInbox, money, MONTHS_BN,
} from '../components/ui'

const CATEGORIES = ['বিদ্যুৎ', 'খালার বিল', 'ইয়ানত', 'ফ্রিজ ভারা', 'পেপার', 'গুড়া', 'WiFi বিল', 'অন্যান্য']

function Expenses() {
  const now = new Date()
  const [expenses, setExpenses] = useState([])
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [form, setForm] = useState({ category: CATEGORIES[0], amount: '', description: '', date: toLocalDate() })
  const [saving, setSaving] = useState(false)
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  const loadExpenses = async () => {
    setExpenses(await fetchExpenses({ month, year }))
  }

  useEffect(() => { loadExpenses() }, [month, year])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.amount) return alert('Amount is required')
    setSaving(true)
    await addExpense({ ...form, amount: parseFloat(form.amount) })
    setForm({ category: CATEGORIES[0], amount: '', description: '', date: toLocalDate() })
    await loadExpenses()
    setSaving(false)
  }

  const handleDelete = async id => {
    if (!confirm('এই খরচটি মুছে ফেলবেন?')) return
    await deleteExpense(id)
    await loadExpenses()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const max = expenses.reduce((m, e) => Math.max(m, Number(e.amount || 0)), 0)

  return (
    <div className="page">
      <PageHeader
        title="খরচ"
        subtitle={label}
        actions={<MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />}
      />

      <div className="card-grid">
        <StatCard tone="slate" icon={<IconExpenses size={19} />} label="মোট খরচ" value={money(total)} />
        <StatCard tone="slate" icon={<IconExpenses size={19} />} label="এন্ট্রি" value={num(expenses.length)} />
        <StatCard tone="yellow" icon={<IconExpenses size={19} />} label="সবচেয়ে বেশি" value={money(max)} />
      </div>

      <div className="card">
        <div className="card-head"><h3>খরচ যোগ করুন</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="e-cat">ধরন</label>
              <select id="e-cat" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="e-amt">Amount</label>
              <input id="e-amt" type="number" step="0.01" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="e-date">Date</label>
              <input id="e-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="e-desc">বিবরণ</label>
              <input id="e-desc" type="text" placeholder="ঐচ্ছিক" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <IconPlus size={16} />
            {saving ? 'যোগ হচ্ছে...' : 'খরচ যোগ করুন'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>খরচের তালিকা</h3>
          <span className="sub">{label} · মোট {money(total)}</span>
        </div>
        {expenses.length === 0 ? (
          <EmptyState icon={<IconInbox size={22} />} title="এই মাসে কোনো খরচ লেখা হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ধরন</th>
                  <th>বিবরণ</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="muted">{exp.date}</td>
                    <td><span className="badge badge-info">{exp.category}</span></td>
                    <td className="muted">{exp.description || '—'}</td>
                    <td className="num strong">{money(exp.amount)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(exp.id)} aria-label="Delete">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right' }}>মোট</td>
                  <td className="num">{money(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  )
}

export default Expenses