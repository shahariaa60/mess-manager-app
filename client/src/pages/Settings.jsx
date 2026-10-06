import { useState } from 'react'
import { changePassword, changeNumber, resetPasswordByUsername } from '../api'

const ROLE_LABEL = {
  admin: 'মেস ম্যানেজার',
  manager: 'ম্যানেজার',
  co_manager: 'সহ-ম্যানেজার',
  member: 'সদস্য',
}

export default function Settings({ user, onRefreshUser }) {
  const canChangeNumber = !!user.memberId

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [phone, setPhone] = useState('')
  const [uName, setUName] = useState('')
  const [uPw, setUPw] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState('')

  async function handlePassword(e) {
    e.preventDefault()
    setMsg(null)
    setErr('')
    if (pw.next !== pw.confirm) return setErr('নতুন password দুবার একই দিন')
    if (pw.next.length < 4) return setErr('নতুন password কমপক্ষে ৪ অক্ষরের হতে হবে')
    const res = await changePassword(pw.current, pw.next)
    if (res && res.success) {
      setMsg('Password পরিবর্তন হয়েছে।')
      setPw({ current: '', next: '', confirm: '' })
    } else {
      setErr((res && res.error) || 'Password পরিবর্তন করা যায়নি')
    }
  }

  async function handleNumber(e) {
    e.preventDefault()
    setMsg(null)
    setErr('')
    if (phone.trim().length < 4) return setErr('নতুন নম্বর দিন')
    const res = await changeNumber(phone.trim())
    if (res && res.success) {
      setMsg('User ID পরিবর্তন হয়েছে। নতুন User ID: ' + res.username)
      setPhone('')
      if (onRefreshUser) onRefreshUser()
    } else {
      setErr((res && res.error) || 'নম্বর পরিবর্তন করা যায়নি')
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(user.messCode)
      setMsg('Mess Code কপি হয়েছে ✅')
    } catch {
      setErr('কপি করা যায়নি - নিজে মনে করে নিয়ে দেখান')
    }
  }

  async function handleResetUser(e) {
    e.preventDefault()
    setMsg(null)
    setErr('')
    if (!uName.trim()) return setErr('username দিন')
    if (uPw.length < 4) return setErr('নতুন password কমপক্ষে ৪ অক্ষরের হতে হবে')
    const res = await resetPasswordByUsername(uName.trim(), uPw)
    if (res && res.success) {
      setMsg(`✅ "${res.username}" user-এর password পরিবর্তন হয়েছে।`)
      setUName('')
      setUPw('')
    } else {
      setErr((res && res.error) || 'Reset ব্যর্থ হয়েছে')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <table>
          <tbody>
            <tr><th style={{ width: 140 }}>নাম</th><td>{user.name}</td></tr>
            <tr><th>User ID</th><td>{user.username}</td></tr>
            {user.phone ? <tr><th>নম্বর</th><td>{user.phone}</td></tr> : null}
            <tr><th>ভূমিকা</th><td><span className="badge badge-info">{ROLE_LABEL[user.role] || user.role}</span></td></tr>
            {user.messName ? <tr><th>মেস</th><td>{user.messName}</td></tr> : null}
          </tbody>
        </table>
      </div>

      {user.messCode && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4 }}>আপনার Mess Code</h3>
          <p className="helper-text" style={{ marginBottom: 12 }}>
            সদস্যরা এই code দিয়ে app-এ "মেসে যোগ দিন" করবে।
          </p>
          <div className="mess-code-box">{user.messCode}</div>
          <button className="btn btn-primary btn-sm" type="button" onClick={copyCode} style={{ marginTop: 12 }}>
            📋 কপি করুন
          </button>
        </div>
      )}

      {msg && <div className="login-success" style={{ marginBottom: 16 }}>{msg}</div>}
      {err && <div className="login-error" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Password পরিবর্তন</h3>
        <form onSubmit={handlePassword}>
          <div className="form-group">
            <label>বর্তমান Password</label>
            <input type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>নতুন Password</label>
              <input type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label>আবার নতুন Password</label>
              <input type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Password বদলান</button>
        </form>
      </div>

      {canChangeNumber && (
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>User ID (নম্বর) পরিবর্তন</h3>
          <p className="helper-text" style={{ marginBottom: 16 }}>
            নতুন User ID-ই আপনার login নম্বর।
          </p>
          <form onSubmit={handleNumber}>
            <div className="form-group">
              <label>নতুন নম্বর</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="যেমন: 01712345678" />
            </div>
            <button className="btn btn-success" type="submit">নম্বর বদলান</button>
          </form>
        </div>
      )}

      {['admin', 'manager'].includes(user.role) && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 4 }}>Reset someone&apos;s password (Manager)</h3>
          <p className="helper-text" style={{ marginBottom: 16 }}>
            কেউ password ভুলে গেলে User ID দিয়ে নতুন password দিন।
          </p>
          <form onSubmit={handleResetUser} className="form-row">
            <div className="form-group">
              <label>User ID</label>
              <input type="text" value={uName} onChange={e => setUName(e.target.value)} placeholder="যেমন: 01712345678" />
            </div>
            <div className="form-group">
              <label>নতুন Password</label>
              <input type="text" value={uPw} onChange={e => setUPw(e.target.value)} placeholder="কমপক্ষে ৪ অক্ষর" />
            </div>
            <button className="btn btn-danger" type="submit" style={{ alignSelf: 'flex-end' }}>Password Reset</button>
          </form>
        </div>
      )}
    </div>
  )
}