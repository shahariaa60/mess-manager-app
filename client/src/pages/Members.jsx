import { useState, useEffect } from 'react'
import { fetchMembers, addMember, deleteMember, updateMember, assignManager, assignCoManager, resetPassword } from '../api'

const ROLE_LABEL = {
  admin: 'Manager (admin)',
  manager: 'Manager',
  co_manager: 'Co-manager',
  member: 'Member',
}

function Members({ user }) {
  const [members, setMembers] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const canAssign = user && ['admin', 'manager'].includes(user.role)

  const handleResetPassword = async (m) => {
    const pw = prompt(
      `"${m.name}" (${m.phone || m.login_username || ''}) সদস্যের নতুন password দিন (কমপক্ষে ৪ অক্ষর):`
    )
    if (!pw) return
    if (pw.length < 4) return alert('কমপক্ষে ৪ অক্ষরের password দিন')
    setError('')
    const res = await resetPassword(m.id, pw.trim())
    if (res && res.success) {
      alert(`✅ ${m.name}-এর password পরিবর্তন হয়েছে।\nUser ID: ${m.phone || m.login_username || res.username}\nনতুন password: ${pw.trim()}`)
    } else {
      setError((res && res.error) || 'Password reset ব্যর্থ হয়েছে')
    }
  }

  const loadMembers = async () => {
    const data = await fetchMembers()
    if (Array.isArray(data)) setMembers(data)
    else if (data && data.error) setError(data.error)
  }

  useEffect(() => { loadMembers() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return alert('Name is required')
    if (phone.trim().length < 4) {
      return setError('নম্বর বাধ্যতামূলক — এই User ID-ই সদস্যের login (password-ও একই)।')
    }
    setLoading(true)
    const res = await addMember({ name: name.trim(), phone: phone.trim() })
    setLoading(false)
    if (res && res.error) {
      setError(res.error)
      return
    }
    setName('')
    setPhone('')
    await loadMembers()
  }

  const handleDelete = async (id, name) => {
    const now = new Date()
    const defMonth = String(now.getMonth() + 1).padStart(2, '0')
    const defYear = String(now.getFullYear())

    const input = prompt(
      `${name} মেস থেকে বাদ পড়েছেন।\n\n` +
      `যে মাস থেকে তার হিসাব (meal / চাল / বাজার / টাকা) মুছে দিতে চান সেই মাসটি লিখুন — যেমন 09।\n` +
      `আগের মাসের হিসাব অক্ষত থাকবে।\n` +
      `সব হিসাব রাখতে চাইলে শুধু 'না' লিখে দিন (শুধু member নিষ্ক্রিয় হবে)।`,
      defMonth
    )
    if (input === null) return

    const raw = String(input).trim().toLowerCase()

    if (raw === 'না' || raw === 'na' || raw === 'n' || raw === '-') {
      if (!confirm(`নিশ্চিত? ${name} নিষ্ক্রিয় হবে, সব আগের হিসাব অক্ষত থাকবে।`)) return
      await deleteMember(id, {})
      await loadMembers()
      return
    }

    const mm = raw.padStart(2, '0')
    if (!/^\d{1,2}$/.test(raw) || Number(mm) < 1 || Number(mm) > 12) {
      alert('মাস ০১ থেকে ১২ এর মধ্যে দিন, অথবা "না" লিখুন।')
      return
    }
    if (!confirm(
      `নিশ্চিত? ${name}-এর ${mm}/${defYear} মাস থেকে সব হিসাব মুছে যাবে।\n` +
      `এর আগের মাসগুলোর হিসাব অক্ষত থাকবে।`
    )) return

    await deleteMember(id, { month: mm, year: defYear })
    await loadMembers()
  }

  const handleAssign = async (kind, id) => {
    if (kind === 'manager') {
      if (!confirm('এটাই মেসের নতুন ম্যানেজার হবে (আগের ম্যানেজার ও সহ-ম্যানেজার সদস্য হয়ে যাবে)। নিশ্চিত?')) return
    }
    const res = kind === 'manager' ? await assignManager(id) : await assignCoManager(id)
    if (res && res.error) setError(res.error)
    else await loadMembers()
  }

  const startEdit = (m) => {
    setEditingId(m.id)
    setEditName(m.name)
    setEditPhone(m.phone || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
  }

  const handleSaveEdit = async (id) => {
    setError('')
    if (!editName.trim()) return alert('Name is required')
    setLoading(true)
    const res = await updateMember(id, { name: editName.trim(), phone: editPhone.trim(), is_active: 1 })
    setLoading(false)
    if (res && res.error) {
      setError(res.error)
      return
    }
    setEditingId(null)
    setEditName('')
    setEditPhone('')
    await loadMembers()
  }

  return (
    <div>
      <div className="page-header">
        <h2>Members</h2>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>New Member</h3>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label>নাম</label>
              <input
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>মোবাইল নম্বর (User ID)</label>
              <input
                type="text"
                placeholder="যেমন: 01712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : '➕ Add Member'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>All Members ({members.length})</h3>
        {members.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👥</div>
            <p>No members added yet</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>
                    {editingId === m.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ width: '100%', minWidth: 120 }}
                      />
                    ) : m.name}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        style={{ width: 120 }}
                        placeholder="Phone"
                      />
                    ) : (m.phone || '-')}
                  </td>
                  <td>
                    <span className={`badge ${m.role === 'admin' || m.role === 'manager' ? 'badge-danger' : m.role === 'co_manager' ? 'badge-warning' : 'badge-info'}`}>
                      {m.role ? (ROLE_LABEL[m.role] || m.role) : 'Member'}
                    </span>
                  </td>
                  <td>{m.join_date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {editingId === m.id ? (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleSaveEdit(m.id)} disabled={loading}>
                            Save
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => startEdit(m)}>
                            ✏️ Edit
                          </button>
                          {canAssign && m.role !== 'admin' && (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--warning)', color: 'white' }}
                                onClick={() => handleAssign('co_manager', m.id)}
                              >
                                Co-manager
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleAssign('manager', m.id)}
                              >
                                Make Manager
                              </button>
                            </>
                          )}
                          {canAssign && m.role !== 'admin' && (
                            <button className="btn btn-outline btn-sm" onClick={() => handleResetPassword(m)}>
                              🔑 Password
                            </button>
                          )}
                          {m.role !== 'admin' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.name)}>Remove</button>
                          )}
                        </>
                      )}
                    </div>
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

export default Members