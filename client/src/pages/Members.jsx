import { useState, useEffect } from 'react'
import { fetchMembers, addMember, deleteMember, updateMember, assignManager, assignCoManager, resetPassword } from '../api'
import {
  PageHeader, Menu, EmptyState, TableWrap,
  IconMembers, IconPlus, IconCheck, IconAlert, IconTrash,
  IconSettings, IconKey,
} from '../components/ui'

const ROLE_LABEL = {
  admin: 'মেস ম্যানেজার',
  manager: 'ম্যানেজার',
  co_manager: 'সহ-ম্যানেজার',
  member: 'সদস্য',
}

const roleBadge = role => {
  if (role === 'admin' || role === 'manager') return 'badge-danger'
  if (role === 'co_manager') return 'badge-warning'
  return 'badge-muted'
}

function Members({ user }) {
  const [members, setMembers] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const canAssign = user && ['admin', 'manager'].includes(user.role)

  const loadMembers = async () => {
    const data = await fetchMembers()
    if (Array.isArray(data)) setMembers(data)
    else if (data && data.error) setMsg({ ok: false, text: data.error })
  }

  useEffect(() => { loadMembers() }, [])

  const handleAdd = async e => {
    e.preventDefault()
    setMsg(null)
    if (!name.trim()) return
    if (phone.trim().length < 4) {
      return setMsg({ ok: false, text: 'নম্বর বাধ্যতামূলক — এটিই সদস্যের login ID (password-ও একই)।' })
    }
    setSaving(true)
    const res = await addMember({ name: name.trim(), phone: phone.trim() })
    setSaving(false)
    if (res && res.error) return setMsg({ ok: false, text: res.error })
    setName('')
    setPhone('')
    loadMembers()
  }

  const handleResetPassword = async m => {
    const pw = prompt(`"${m.name}" সদস্যের নতুন password দিন (কমপক্ষে ৪ অক্ষর):`)
    if (!pw) return
    if (pw.length < 4) return alert('কমপক্ষে ৪ অক্ষরের password দিন')
    setMsg(null)
    const res = await resetPassword(m.id, pw.trim())
    if (res && res.success) {
      setMsg({ ok: true, text: `${m.name}-এর password পরিবর্তন হয়েছে। User ID: ${m.phone || m.login_username || res.username}` })
    } else {
      setMsg({ ok: false, text: (res && res.error) || 'Password reset ব্যর্থ হয়েছে' })
    }
  }

  const handleDelete = async (id, name) => {
    const now = new Date()
    const defYear = String(now.getFullYear())
    const defMonth = String(now.getMonth() + 1).padStart(2, '0')

    const input = prompt(
      `${name} মেস থেকে বাদ পড়েছেন।\n\n` +
      `যে মাস থেকে হিসাব (meal / চাল / বাজার / টাকা) মুছতে চান সেই মাস — যেমন 09।\n` +
      `আগের মাসের হিসাব অক্ষত থাকবে।\n` +
      `সব হিসাব রাখতে চাইলে 'না' লিখুন (শুধু সদস্য নিষ্ক্রিয় হবে)।`,
      defMonth
    )
    if (input === null) return

    const raw = String(input).trim().toLowerCase()

    if (['না', 'na', 'n', '-'].includes(raw)) {
      if (!confirm(`${name} নিষ্ক্রিয় হবে, সব আগের হিসাব অক্ষত থাকবে। নিশ্চিত?`)) return
      await deleteMember(id, {})
      loadMembers()
      return
    }

    const mm = raw.padStart(2, '0')
    if (!/^\d{1,2}$/.test(raw) || Number(mm) < 1 || Number(mm) > 12) {
      return alert('মাস ০১ থেকে ১২ এর মধ্যে দিন, অথবা "না" লিখুন।')
    }
    if (!confirm(`${name}-এর ${mm}/${defYear} মাস থেকে সব হিসাব মুছে যাবে। আগের মাসগুলো অক্ষত থাকবে। নিশ্চিত?`)) return

    await deleteMember(id, { month: mm, year: defYear })
    loadMembers()
  }

  const handleAssign = async (kind, id) => {
    if (kind === 'manager') {
      if (!confirm('এটাই মেসের নতুন ম্যানেজার হবে (আগের ম্যানেজার ও সহ-ম্যানেজার সদস্য হয়ে যাবে)। নিশ্চিত?')) return
    }
    const res = kind === 'manager' ? await assignManager(id) : await assignCoManager(id)
    if (res && res.error) setMsg({ ok: false, text: res.error })
    else loadMembers()
  }

  const startEdit = m => {
    setEditingId(m.id)
    setEditName(m.name)
    setEditPhone(m.phone || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
  }

  const handleSaveEdit = async id => {
    setMsg(null)
    if (!editName.trim()) return alert('Name is required')
    setSaving(true)
    const res = await updateMember(id, { name: editName.trim(), phone: editPhone.trim(), is_active: 1 })
    setSaving(false)
    if (res && res.error) return setMsg({ ok: false, text: res.error })
    cancelEdit()
    loadMembers()
  }

  return (
    <div className="page">
      <PageHeader title="সদস্য" subtitle={`${members.length} জন`} />

      {msg && (
        <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>
          {msg.ok ? <IconCheck size={17} /> : <IconAlert size={17} />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>নতুন সদস্য</h3></div>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="m-name">নাম</label>
              <input id="m-name" type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="m-phone">মোবাইল নম্বর (User ID)</label>
              <input id="m-phone" type="text" placeholder="01712345678" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <IconPlus size={16} />
            {saving ? 'যোগ হচ্ছে...' : 'সদস্য যোগ করুন'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>সব সদস্য</h3>
          <span className="sub">{members.length} জন</span>
        </div>
        {members.length === 0 ? (
          <EmptyState icon={<IconMembers size={22} />} title="এখনও কোনো সদস্য যোগ হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>নাম</th>
                  <th>নম্বর</th>
                  <th>ভূমিকা</th>
                  <th>যোগদান</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id}>
                    <td className="muted">{i + 1}</td>
                    <td className="name">
                      {editingId === m.id ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
                      ) : m.name}
                    </td>
                    <td>
                      {editingId === m.id ? (
                        <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                      ) : (m.phone || '—')}
                    </td>
                    <td>
                      <span className={`badge ${roleBadge(m.role)}`}>{ROLE_LABEL[m.role] || 'সদস্য'}</span>
                    </td>
                    <td className="muted">{m.join_date}</td>
                    <td>
                      {editingId === m.id ? (
                        <div className="btn-group">
                          <button className="btn btn-success btn-sm" onClick={() => handleSaveEdit(m.id)} disabled={saving}>
                            <IconCheck size={14} /> সেভ
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={cancelEdit}>বাতিল</button>
                        </div>
                      ) : (
                        <div className="row-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => startEdit(m)}>Edit</button>
                          <Menu label={`${m.name} actions`}>
                            {canAssign && m.role !== 'admin' && (
                              <>
                                <button onClick={() => handleAssign('co_manager', m.id)}>
                                  <IconSettings size={15} /> সহ-ম্যানেজার করুন
                                </button>
                                <button onClick={() => handleAssign('manager', m.id)}>
                                  <IconSettings size={15} /> ম্যানেজার করুন
                                </button>
                                <button onClick={() => handleResetPassword(m)}>
                                  <IconKey size={15} /> Password বদলান
                                </button>
                              </>
                            )}
                            {m.role !== 'admin' && (
                              <button className="danger" onClick={() => handleDelete(m.id, m.name)}>
                                <IconTrash size={15} /> মেস থেকে বাদ
                              </button>
                            )}
                          </Menu>
                        </div>
                      )}
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

export default Members