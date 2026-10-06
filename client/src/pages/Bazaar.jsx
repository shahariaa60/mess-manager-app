import { useState, useEffect } from 'react'
import { fetchMembers, fetchBazaar, addBazaar, deleteBazaar } from '../api'
import { toLocalDate, num } from '../utils'
import {
  PageHeader, StatCard, EmptyState, TableWrap, MonthPicker,
  IconBazaar, IconPlus, IconTrash, IconInbox, IconCalendar, money, MONTHS_BN,
} from '../components/ui'

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
  const [saving, setSaving] = useState(false)
  const label = `${MONTHS_BN[parseInt(month) - 1]} ${year}`

  useEffect(() => {
    fetchMembers().then(m => {
      setMembers(m)
      setForm(f => (f.member_id || !m.length ? { ...f, member_id: String(m[0]?.id || '') } : f))
    })
  }, [])

  useEffect(() => { fetchBazaar({ month, year }).then(setList) }, [month, year])

  const updateItem = (index, field, value) => {
    const items = [...form.items]
    items[index][field] = value
    setForm({ ...form, items })
  }

  const addItemRow = () => {
    setForm({ ...form, items: [...form.items, { item_name: '', quantity: '', amount: '' }] })
  }

  const removeItemRow = index => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.member_id) return alert('কে বাজার করেছে বাছুন')
    setSaving(true)

    const validItems = form.items.filter(i => i.item_name.trim())
    const totalFromItems = validItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
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

    setForm(f => ({
      ...f,
      total_amount: '',
      notes: '',
      items: [{ item_name: '', quantity: '', amount: '' }],
    }))
    await fetchBazaar({ month, year }).then(setList)
    setSaving(false)
  }

  const handleDelete = async id => {
    if (!confirm('এই বাজারের রেকর্ড মুছে ফেলবেন?')) return
    await deleteBazaar(id)
    await fetchBazaar({ month, year }).then(setList)
  }

  const monthTotal = list.reduce((sum, b) => sum + Number(b.total_amount || 0), 0)

  return (
    <div className="page">
      <PageHeader
        title="বাজার"
        subtitle={label}
        actions={<MonthPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />}
      />

      <div className="card-grid">
        <StatCard tone="green" icon={<IconBazaar size={19} />} label="মোট বাজার খরচ" value={money(monthTotal)} />
        <StatCard tone="slate" icon={<IconBazaar size={19} />} label="বাজারের সংখ্যা" value={num(list.length)} />
        <StatCard tone="yellow" icon={<IconCalendar size={19} />} label="মাসের টার্গেট" value={`${num(list.length)} / 10`} />
      </div>

      <div className="card">
        <div className="card-head"><h3>নতুন বাজার যোগ করুন</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="b-member">কে বাজার করেছে</label>
              <select id="b-member" value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} required>
                <option value="">বাছাই করুন</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="b-date">Date</label>
              <input id="b-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="b-total">মোট টাকা</label>
              <input id="b-total" type="number" step="0.01" placeholder="0" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="b-notes">নোট</label>
              <input id="b-notes" type="text" placeholder="ঐচ্ছিক" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="field-label">কি কি কিনলেন</div>
          <div className="bazaar-items">
            {form.items.map((item, index) => (
              <div key={index} className="bazaar-item-row">
                <input
                  type="text"
                  placeholder="জিনিস"
                  value={item.item_name}
                  onChange={e => updateItem(index, 'item_name', e.target.value)}
                  aria-label="জিনিসের নাম"
                />
                <input
                  type="text"
                  placeholder="পরিমাণ"
                  value={item.quantity}
                  onChange={e => updateItem(index, 'quantity', e.target.value)}
                  aria-label="পরিমাণ"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="টাকা"
                  value={item.amount}
                  onChange={e => updateItem(index, 'amount', e.target.value)}
                  aria-label="টাকা"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => removeItemRow(index)}
                  aria-label="বাদ দিন"
                  disabled={form.items.length === 1}
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addItemRow}>
              <IconPlus size={14} /> আরেকটা জিনিস
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 16 }}>
            <IconPlus size={16} />
            {saving ? 'সেভ হচ্ছে...' : 'বাজার সংরক্ষণ করুন'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>বাজারের তালিকা</h3>
          <span className="sub">{label} · মোট {money(monthTotal)}</span>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={<IconInbox size={22} />} title="এই মাসে বাজারের রেকর্ড নেই" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>কে</th>
                  <th className="num">মোট টাকা</th>
                  <th>কি কিনল</th>
                  <th>নোট</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.id}>
                    <td className="muted">{b.date}</td>
                    <td className="name">{b.member_name}</td>
                    <td className="num strong">{money(b.total_amount)}</td>
                    <td className="muted">
                      {b.items.length > 0
                        ? b.items.map((item, i) => (
                          <div key={i} className="bazaar-item-line">
                            {item.item_name}{item.quantity ? ` (${item.quantity})` : ''}{item.amount ? ` — ${money(item.amount)}` : ''}
                          </div>
                        ))
                        : '—'}
                    </td>
                    <td className="muted">{b.notes || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(b.id)} aria-label="Delete">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ textAlign: 'right' }}>মোট</td>
                  <td className="num">{money(monthTotal)}</td>
                  <td colSpan="3" />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  )
}

export default Bazaar