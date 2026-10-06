import { useState } from 'react'
import { changePassword, changeNumber, resetPasswordByUsername } from '../api'
import {
  PageHeader, TableWrap, IconCheck, IconAlert, IconSettings, IconKey,
} from '../components/ui'

const ROLE_LABEL = {
  admin: 'মেস ম্যানেজার',
  manager: 'ম্যানেজার',
  co_manager: 'সহ-ম্যানেজার',
  member: 'সদস্য',
}

export default function Settings({ user, onRefreshUser }) {
  const canChangeNumber = !!user.memberId
  const isManager = ['admin', 'manager'].includes(user.role)

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
      setMsg('Mess Code কপি হয়েছে')
    } catch {
      setErr('কপি করা যায়নি — নিজে মনে করে নিয়ে দেখান')
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
      setMsg(`"${res.username}" user-এর password পরিবর্তন হয়েছে।`)
      setUName('')
      setUPw('')
    } else {
      setErr((res && res.error) || 'Reset ব্যর্থ হয়েছে')
    }
  }

  return (
    <div className="page">
      <PageHeader title="নিজের অ্যাকাউন্ট" subtitle={user.name} />

      {msg && <div className="alert alert-success"><IconCheck size={17} /><span>{msg}</span></div>}
      {err && <div className="alert alert-error"><IconAlert size={17} /><span>{err}</span></div>}

      <div className="card">
        <div className="card-head">
          <h3>আমার তথ্য</h3>
        </div>
        <TableWrap>
          <table>
            <tbody>
              <tr><th style={{ width: 150 }}>নাম</th><td className="name">{user.name}</td></tr>
              <tr><th>User ID</th><td>{user.username}</td></tr>
              {user.phone ? <tr><th>নম্বর</th><td>{user.phone}</td></tr> : null}
              <tr><th>ভূমিকা</th><td><span className="badge badge-info">{ROLE_LABEL[user.role] || user.role}</span></td></tr>
              {user.messName ? <tr><th>মেস</th><td>{user.messName}</td></tr> : null}
            </tbody>
          </table>
        </TableWrap>
      </div>

      {user.messCode && (
        <div className="card">
          <div className="card-head">
            <h3>আপনার Mess Code</h3>
            <span className="sub">সদস্যরা এই code দিয়ে app-এ ঢুকবে</span>
          </div>
          <div className="mess-code-row">
            <div className="mess-code-box">{user.messCode}</div>
            <button className="btn btn-outline" type="button" onClick={copyCode}>
              <IconKey size={16} /> কপি করুন
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>Password পরিবর্তন</h3></div>
        <form onSubmit={handlePassword}>
          <div className="form-group">
            <label htmlFor="s-cur">বর্তমান Password</label>
            <input id="s-cur" type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="s-new">নতুন Password</label>
              <input id="s-new" type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label htmlFor="s-cnf">আবার নতুন Password</label>
              <input id="s-cnf" type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Password বদলান</button>
        </form>
      </div>

      {canChangeNumber && (
        <div className="card">
          <div className="card-head">
            <h3>User ID পরিবর্তন</h3>
            <span className="sub">নতুন User ID-ই আপনার login</span>
          </div>
          <form onSubmit={handleNumber}>
            <div className="form-group">
              <label htmlFor="s-phone">নতুন নম্বর</label>
              <input id="s-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01712345678" />
            </div>
            <button className="btn btn-success" type="submit">নম্বর বদলান</button>
          </form>
        </div>
      )}

      {isManager && (
        <div className="card">
          <div className="card-head">
            <h3>কারও Password Reset</h3>
            <span className="sub">User ID দিয়ে নতুন password দিন</span>
          </div>
          <form onSubmit={handleResetUser}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="s-uname">User ID</label>
                <input id="s-uname" type="text" value={uName} onChange={e => setUName(e.target.value)} placeholder="01712345678" />
              </div>
              <div className="form-group">
                <label htmlFor="s-upw">নতুন Password</label>
                <input id="s-upw" type="text" value={uPw} onChange={e => setUPw(e.target.value)} placeholder="কমপক্ষে ৪ অক্ষর" />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              <IconKey size={16} /> Password Reset
            </button>
          </form>
        </div>
      )}
    </div>
  )
}