import { useState, useEffect } from 'react'
import { fetchMembers, fetchPayments, fetchReport, addPayment, deletePayment } from '../api'
import {
  PageHeader, StatCard, BalanceBadge, EmptyState, TableWrap, MonthPicker,
  IconPayments, IconPlus, IconTrash, IconScale, IconInbox,
  money, MONTHS_BN,
} from '../components/ui'
import { toLocalDate } from '../utils'

function Payments() {
  const now = new Date()
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [report, setReport] = useState(null)
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [form, setForm] = useState({ member_id: '', amount: '', date: toLocalDate(), notes: '' })
  const [saving, setSaving] = useState(false)
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  useEffect(() => {
    fetchMembers().then(m => {
      setMembers(m)
      setForm(f => (f.member_id || !m.length ? { ...f, member_id: String(m[0]?.id || '') } : f))
    })
  }, [])

  useEffect(() => {
    setReport(null)
    Promise.all([fetchPayments({ month, year }), fetchReport(month, year)])
      .then(([data, rep]) => {
        setPayments(data)
        setReport(rep)
      })
      .catch(() => setReport(null))
  }, [month, year])

  const handleSubmit = async e => {
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
      const [data, rep] = await Promise.all([fetchPayments({ month, year }), fetchReport(month, year)])
      setPayments(data)
      setReport(rep)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('এই জমা delete করবেন?')) return
    await deletePayment(id)
    const [data, rep] = await Promise.all([fetchPayments({ month, year }), fetchReport(month, year)])
    setPayments(data)
    setReport(rep)
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

  return (
    <div className="page">
      <PageHeader
        title="টাকা জমা"
        subtitle={label}
        actions={<MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />}
      />

      <div className="card-grid">
        <StatCard tone="green" icon={<IconPayments size={19} />} label="এই মাসে মোট জমা" value={money(totalDeposit)} />
        <StatCard tone="slate" icon={<IconScale size={19} />} label="এই মাসের মোট বিল" value={money(totalBills)} />
        <StatCard tone="green" icon={<IconScale size={19} />} label="সব মিলিয়ে পাবে" value={money(willGet)} />
        <StatCard tone="red" icon={<IconScale size={19} />} label="সব মিলিয়ে দিবে" value={money(willGive)} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>জমা যোগ করুন</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="p-member">সদস্য</label>
              <select id="p-member" value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}>
                <option value="">নির্বাচন করুন</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="p-amount">Amount</label>
              <input
                id="p-amount"
                type="number"
                step="any"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-date">Date</label>
              <input id="p-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="p-notes">নোট</label>
              <input id="p-notes" type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ঐচ্ছিক" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <IconPlus size={16} />
            {saving ? 'সেভ হচ্ছে...' : 'জমা যোগ করুন'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>সদস্যভিত্তিক হিসাব</h3>
          <span className="sub">জমায় আগের মাসের হিসাব যুক্ত</span>
        </div>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>সদস্য</th>
                <th className="num">এই মাসে মোট জমা</th>
                <th className="num">এই মাসের বিল</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="muted">{i + 1}</td>
                  <td className="name">{r.name}</td>
                  <td className="num strong">{money(r.deposit)}</td>
                  <td className="num">{money(r.bill)}</td>
                  <td className="num"><BalanceBadge value={r.balance} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" style={{ textAlign: 'right' }}>মোট</td>
                <td className="num">{money(totalDeposit)}</td>
                <td className="num">{money(totalBills)}</td>
                <td className="num">
                  <BalanceBadge value={totalBalance} />
                </td>
              </tr>
            </tfoot>
          </table>
        </TableWrap>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>জমার তালিকা</h3>
          <span className="sub">{label} · মোট {money(rawTotal)}</span>
        </div>
        {payments.length === 0 ? (
          <EmptyState icon={<IconInbox size={22} />} title="এই মাসে এখনো কোনো জমা হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>সদস্য</th>
                  <th className="num">Amount</th>
                  <th>নোট</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="muted">{p.date}</td>
                    <td className="name">{p.member_name}</td>
                    <td className="num strong">{money(p.amount)}</td>
                    <td className="muted">{p.notes || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(p.id)} aria-label="Delete">
                        <IconTrash size={16} />
                      </button>
                    </td>
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

export default Payments