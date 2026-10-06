import { useState } from 'react'
import { loginUser, registerMess, loginSiteAdmin, setToken, setMessCode, getMessCode } from '../api'
import { IconHome, IconKey } from '../components/ui'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'admin'
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({
    mess_code: getMessCode(),
    mess_name: '',
    name: '',
    username: '',
    password: '',
  })

  const set = key => e => setF({ ...f, [key]: e.target.value })

  function switchMode(m) {
    setMode(m)
    setError('')
    setMsg('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    setLoading(true)
    let res = null
    try {
      if (mode === 'admin') {
        res = await loginSiteAdmin(f.username.trim(), f.password)
      } else if (mode === 'login') {
        res = await loginUser(f.mess_code.trim(), f.username.trim(), f.password)
      } else {
        res = await registerMess({
          mess_name: f.mess_name.trim(),
          name: f.name.trim(),
          username: f.username.trim(),
          password: f.password,
        })
        if (res && res.token) {
          setMsg(`আপনার Mess Code:\n${res.user.messCode}\nএই code সদস্যদের দিয়ে দিলে তারাও login করতে পারবে।`)
        }
      }
    } catch (err) {
      res = { error: err.message || 'Network error. Please try again.' }
    }
    setLoading(false)
    if (res && res.token) {
      setToken(res.token)
      if (res.user.messCode) setMessCode(res.user.messCode)
      onLogin(res.user)
    } else {
      setError((res && res.error) || 'Something went wrong.')
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <span className="login-logo"><IconKey size={20} /></span>
          <h1>Mess Manager</h1>
          <p className="login-tagline">এক জায়গায় মেসের সব হিসাব</p>
        </div>

        <div className="login-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            মেস লগইন
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
            নতুন মেস
          </button>
          <button type="button" className={mode === 'admin' ? 'active' : ''} onClick={() => switchMode('admin')}>
            অ্যাডমিন
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'admin' && (
            <p className="login-note">
              সারা সাইটের অ্যাডমিন লগইন। সব মেসের তালিকা ও হিসাব দেখা যাবে।
            </p>
          )}

          {mode === 'register' && (
            <p className="login-note">
              যে প্রথম এই mess তৈরি করবে সে-ই হবে এর <strong>Manager</strong>।
            </p>
          )}

          {mode === 'login' && (
            <div className="form-group">
              <label>Mess Code</label>
              <input
                type="text"
                value={f.mess_code}
                onChange={set('mess_code')}
                placeholder="যেমন ABC123"
                required
                autoCapitalize="characters"
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label>Mess Name</label>
              <input
                type="text"
                value={f.mess_name}
                onChange={set('mess_name')}
                placeholder="যেমন Hostel Mess"
                required
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label>আপনার নাম</label>
              <input
                type="text"
                value={f.name}
                onChange={set('name')}
                placeholder="আপনার নাম লিখুন"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              value={f.username}
              onChange={set('username')}
              placeholder="যেমন 01712345678"
              required
              minLength={4}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={f.password}
              onChange={set('password')}
              placeholder="কমপক্ষে ৪ অক্ষর"
              required
              minLength={4}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {msg && <div className="login-success" style={{ whiteSpace: 'pre-line' }}>{msg}</div>}
          {error && <div className="login-error">{error}</div>}

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading
              ? 'প্রসেস হচ্ছে...'
              : mode === 'login' ? 'লগইন করুন'
                : mode === 'register' ? 'মেস তৈরি করুন'
                  : 'অ্যাডমিন লগইন'}
          </button>

          {mode === 'login' && (
            <p className="login-hint">
              নতুন সদস্য? Manager-এর দেওয়া <strong>Mess Code</strong> দিয়ে লগইন করুন।
            </p>
          )}
        </form>
      </div>
    </div>
  )
}