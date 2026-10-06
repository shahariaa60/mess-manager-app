import { useState, useEffect } from 'react'
import { fetchExpenses, addExpense, deleteExpense } from '../api'
import { toLocalDate } from '../utils'

const CATEGORIES = ['বিদ্যুৎ', 'খালার বিল', 'ইয়ানত', 'ফ্রিজ ভারা', 'পেপার', 'গুড়া', 'WiFi বিল', 'অন্যান্য']

function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({
    category: 'বিদ্যুৎ',
    amount: '',
    description: '',
    date: toLocalDate(),
  })
  const [loading, setLoading] = useState(false)

  const loadExpenses = async () => {
    const data = await fetchExpenses()
    setExpenses(data)
  }

  useEffect(() => { loadExpenses() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return alert('Amount is required')
    setLoading(true)
    await addExpense({ ...form, amount: parseFloat(form.amount) })
    setForm({ category: 'বিদ্যুৎ', amount: '', description: '', date: toLocalDate() })
    await loadExpenses()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
    await loadExpenses()
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <div className="page-header">
        <h2>Expenses</h2>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Add Expense</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Amount (৳)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input
                type="text"
                placeholder="e.g. local market"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : '➕ Add Expense'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>All Expenses</h3>
          <span className="badge badge-warning">Total: ৳{totalAmount.toLocaleString()}</span>
        </div>
        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💰</div>
            <p>No expenses recorded yet</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td><span className="badge badge-info">{exp.category}</span></td>
                  <td>{exp.description || '-'}</td>
                  <td style={{ fontWeight: 600 }}>৳{Number(exp.amount).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp.id)}>
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

export default Expenses
