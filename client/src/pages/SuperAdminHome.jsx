import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getToken, setToken, setMessCode, setSuperMode, setSuperAdminToken,
  fetchSuperMesses, updateSuperMess, updateSuperManagerAccount, enterSuperMess,
} from '../api'
import { PageHeader, StatCard, TableWrap, EmptyState, IconInbox, IconCheck, IconClose, IconSettings } from '../components/ui'

export default function SuperAdminHome({ onLogin }) {
  const navigate = useNavigate()
  const [messes, setMesses] = useState(null)
  const [error, setError] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', mgr_id: '', mgr_pass: '' })

  const load = useCallback(async () => {
    setError('')
    const res = await fetchSuperMesses()
    if (Array.isArray(res)) setMesses(res)
    else setError((res && res.error) || 'তালিকা লোড করা যায়নি')
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(m) {
    setEditId(m.id)
    setForm({ name: m.name, code: m.code, mgr_id: m.manager_username, mgr_pass: '' })
    setSaveMsg('')
  }

  const set = key => e => setForm({ ...form, [key]: e.target.value })

  async function handleSave(m) {
    setBusy(true)
    setError('')
    setSaveMsg('')
    const name = form.name.trim()
    const code = form.code.trim().toUpperCase()
    const mgrId = form.mgr_id.trim()
    const mgrPass = form.mgr_pass

    let r = await updateSuperMess(m.id, { name: name || m.name, code: code || m.code })
    if (!r || r.error) {
      setError((r && r.error) || 'Mess আপডেট ব্যর্থ')
      setBusy(false)
      return
    }
    if ((mgrId && mgrId.toLowerCase() !== (m.manager_username || '').toLowerCase()) || mgrPass) {
      r = await updateSuperManagerAccount(m.id, {
        username: mgrId || undefined,
        password: mgrPass || undefined,
      })
      if (!r || r.error) {
        setError((r && r.error) || 'Manager আপডেট ব্যর্থ')
        setBusy(false)
        return
      }
    }
    setSaveMsg('সেভ হয়েছে')
    setBusy(false)
    setEditId(null)
    await load()
  }

  async function enterMess(m) {
    setError('')
    setSaveMsg('')
    const adminTok = getToken()
    const res = await enterSuperMess(m.id)
    if (res && res.token) {
      setSuperAdminToken(adminTok)
      setToken(res.token)
      if (res.user.messCode) setMessCode(res.user.messCode)
      setSuperMode()
      onLogin(res.user)
      navigate('/dashboard', { replace: true })
    } else {
      setError((res && res.error) || 'মেসে ঢোকা যায়নি')
    }
  }

  const totalMembers = messes ? messes.reduce((s, m) => s + m.member_count, 0) : 0
  const totalManagers = messes ? messes.filter(m => m.manager_username).length : 0
  const editTarget = messes ? messes.find(m => m.id === editId) : null

  return (
    <div className="page">
      <PageHeader
        title="সব মেস"
        subtitle="রেজিস্টার করা মেসের তালিকা — নামে ক্লিক করলে সেই মেসের পুরো হিসাব দেখা ও edit করা যাবে।"
      />

      <div className="card-grid">
        <StatCard icon={<IconInbox size={18} />} label="মোট মেস" value={messes ? messes.length : '…'} />
        <StatCard icon={<IconCheck size={18} />} label="মোট সদস্য" value={totalMembers} />
        <StatCard icon={<IconSettings size={18} />} label="Manager অ্যাকাউন্ট" value={totalManagers} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saveMsg && <div className="alert alert-success">{saveMsg}</div>}

      <div className="card">
        <div className="card-head">
          <h3>মেসের তালিকা</h3>
          <button className="btn btn-outline btn-sm" onClick={load}>রিফ্রেশ</button>
        </div>
        {!messes ? (
          <p className="helper-text" style={{ padding: 16 }}>লোড হচ্ছে...</p>
        ) : messes.length === 0 ? (
          <EmptyState icon={<IconInbox size={22} />} title="এখনো কোনো মেস register হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>মেস</th>
                  <th>Mess Code</th>
                  <th>Manager User ID</th>
                  <th className="num">সদস্য</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {messes.map(m => (
                  <tr key={m.id}>
                    <td className="name">
                      <button className="btn btn-primary btn-sm" onClick={() => enterMess(m)}>
                        {m.name} — ঢোকেন
                      </button>
                    </td>
                    <td className="muted">{m.code}</td>
                    <td>{m.manager_username || '—'}</td>
                    <td className="num">{m.member_count}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(m)} aria-label="Edit">
                          <IconSettings size={16} />
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

      {editTarget && (
        <div className="card">
          <div className="card-head">
            <h3>সম্পাদনা — {editTarget.name}</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setEditId(null)} aria-label="Close">
              <IconClose size={16} />
            </button>
          </div>
          <form onSubmit={e => { e.preventDefault(); handleSave(editTarget) }}>
            <div className="form-row">
              <div className="form-group">
                <label>মেসের নাম</label>
                <input type="text" value={form.name} onChange={set('name')} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Mess Code (নতুন code সদস্যদের দিতে হবে)</label>
                <input type="text" value={form.code} onChange={set('code')} required autoCapitalize="characters" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Manager User ID</label>
                <input type="text" value={form.mgr_id} onChange={set('mgr_id')} placeholder="Manager-এর login user id" />
              </div>
              <div className="form-group">
                <label>Manager নতুন Password (খালি রাখলে বদলায় না)</label>
                <input type="text" value={form.mgr_pass} onChange={set('mgr_pass')} placeholder="কমপক্ষে ৪ অক্ষর" />
              </div>
            </div>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setEditId(null)}>বাতিল</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}