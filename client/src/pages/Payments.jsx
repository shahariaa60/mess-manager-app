import { useState, useEffect } from 'react'
import { fetchMembers, fetchPayments, fetchReport, addPayment, deletePayment } from '../api'
import { toLocalDate } from '../utils'

function Payments() {
  const now = new Date()
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [report, setReport] = useState(null)
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [form, setForm] = useState({
    member_id: '',
    amount: '',
    date: toLocalDate(),
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ]

  const loadBase = async () => {
    const m = await fetchMembers()
    setMembers(m)
    if (!form.member_id && m.length > 0) setForm(f => ({ ...f, member_id: String(m[0].id) }))
  }

  const loadData = async () => {
    try {
      const [data, rep] = await Promise.all([
        fetchPayments({ month, year }),
        fetchReport(month, year),
      ])
      setPayments(data)
      setReport(rep)
    } catch {
      setReport(null)
    }
  }

  useEffect(() => { loadBase() }, [])
  useEffect(() => { loadData() }, [month, year])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.member_id || form.amount === '' || form.amount == null) {
      return alert('সদস্য ও amount দেওয়া লাগবে')
    }
    setSaving(true)
    try {
      await addPayment({
        member_id: Number(form.member_id),
        amount: Number(form.amount),
        date: form.date,
        notes: form.notes,
      })
      setForm(f => ({ ...f, amount: '', notes: '' }))
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('এই জমা delete করবেন?')) return
    await deletePayment(id)
    await loadData()
  }

  const rawByMember = {}
  payments.forEach(p => {
    rawByMember[p.member_id] = (rawByMember[p.member_id] || 0) + p.amount
  })

  const billMap = {}
  const depositMap = {}
  const balanceMap = {}
  ;(report && report.memberBills ? report.memberBills : []).forEach(m => {
    billMap[m.id] = m.bill
    depositMap[m.id] = m.monthDeposit
    balanceMap[m.id] = m.allTimeBalance
  })

  const rows = members.map(m => ({
    id: m.id,
    name: m.name,
    raw: rawByMember[m.id] || 0,
    deposit: depositMap[m.id] || 0,
    bill: billMap[m.id] || 0,
    balance: balanceMap[m.id] || 0,
  }))

  const totalDeposit = Math.round(rows.reduce((s, r) => s + r.deposit, 0) * 100) / 100
  const totalBills = Math.round(rows.reduce((s, r) => s + r.bill, 0) * 100) / 100
  const totalBalance = Math.round(rows.reduce((s, r) => s + r.balance, 0) * 100) / 100
  const willGet = rows.filter(r => r.balance > 0).reduce((s, r) => s + r.balance, 0)
  const willGive = rows.filter(r => r.balance < 0).reduce((s, r) => s - r.balance, 0)
  const rawTotal = Math.round(rows.reduce((s, r) => s + r.raw, 0) * 100) / 100

  const label = `${months[parseInt(month) - 1]} ${year}`

  const badge = v => {
    if (v > 0) return <span className="badge badge-success">পাবে +৳{v.toLocaleString()}</span>
    if (v < 0) return <span className="badge badge-danger">দিবে ৳{Math.abs(v).toLocaleString()}</span>
    return <span className="badge badge-info">সমতা</span>
  }

  return (
    <div>
      <div className="page-header">
        <h2>টাকা জমা</h2>
      </div>

      <div className="date-picker" style={{ marginBottom: 20 }}>
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {months.map((m, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="helper-text">{label} · জমায় আগের মাসের হিসাব যুক্ত</span>
      </div>

      <div className="card-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon green">💵</div>
          <div className="stat-info">
            <h3>৳{totalDeposit.toLocaleString()}</h3>
            <p>এই মাসে মোট জমা</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🧾</div>
          <div className="stat-info">
            <h3>৳{totalBills.toLocaleString()}</h3>
            <p>এই মাসের মোট বিল</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>৳{willGet.toLocaleString()}</h3>
            <p>সব মিলিয়ে পাবে</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div className="stat-info">
            <h3>৳{willGive.toLocaleString()}</h3>
            <p>সব মিলিয়ে দিবে</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>নতুন টাকা জমা</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>সদস্য</label>
              <select
                value={form.member_id}
                onChange={e => setForm({ ...form, member_id: e.target.value })}
                required
              >
                <option value="">-- বাছাই --</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>টাকার পরিমাণ (৳)</label>
              <input
                type="number"
                step="any"
                placeholder="কত টাকা"
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
              <label>নোট (optional)</label>
              <input
                type="text"
                placeholder="যেমন: ১ম কিস্তি"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : '💵 টাকা জমা যোগ করুন'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>সদস্য ভিত্তিক হিসাব ({label})</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Member</th>
              <th>এই মাসে মোট জমা</th>
              <th>এই মাসের বিল</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td><span className="badge badge-success">৳{r.deposit.toLocaleString()}</span></td>
                <td>৳{r.bill.toLocaleString()}</td>
                <td style={{ fontWeight: 700 }}>{badge(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan="2" style={{ textAlign: 'right' }}>মোট</td>
              <td>৳{totalDeposit.toLocaleString()}</td>
              <td>৳{totalBills.toLocaleString()}</td>
              <td>{badge(totalBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>সব জমার তালিকা ({label})</h3>
        {payments.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💵</div>
            <p>{label} মাসে এখনো টাকা জমা হয়নি</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Amount</th>
                <th>নোট</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td style={{ fontWeight: 600 }}>{p.member_name}</td>
                  <td style={{ fontWeight: 700 }}>৳{p.amount.toLocaleString()}</td>
                  <td>{p.notes || '-'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
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

export default Payments