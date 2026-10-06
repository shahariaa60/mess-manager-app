import { useState } from 'react'
import { loginUser, registerMess, setToken, setMessCode, getMessCode } from '../api'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
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
      if (mode === 'login') {
        res = await loginUser(f.mess_code.trim(), f.username.trim(), f.password)
      } else {
        res = await registerMess({
          mess_name: f.mess_name.trim(),
          name: f.name.trim(),
          username: f.username.trim(),
          password: f.password,
        })
        if (res && res.token) {
          setMsg(`\u2705 Your Mess Code: ${res.user.messCode}\nShare this code with your members so they can log in.`)
        }
      }
    } catch (err) {
      res = { error: err.message || 'Network error. Please try again.' }
    }
    setLoading(false)
    if (res && res.token) {
      setToken(res.token)
      setMessCode(res.user.messCode)
      onLogin(res.user)
    } else {
      setError((res && res.error) || 'Something went wrong.')
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">{mode === 'login' ? '🔑' : '🏠'}</div>
        <h1>Mess Manager</h1>
        <p className="login-sub">
          {mode === 'login' ? 'Mess accounting in one place' : 'Create a new mess'}
        </p>

        {mode === 'register' && (
          <p className="helper-text" style={{ marginBottom: 16 }}>
            The first person creating this mess with their ID becomes its <strong>Manager</strong>.
          </p>
        )}

        {mode === 'login' && (
          <div className="form-group">
            <label>Mess Code</label>
            <input
              type="text"
              value={f.mess_code}
              onChange={set('mess_code')}
              placeholder="e.g. ABC123"
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
              placeholder="e.g. Hostel Mess"
              required
            />
          </div>
        )}

        {mode === 'register' && (
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              value={f.name}
              onChange={set('name')}
              placeholder="Enter your name"
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
            placeholder="e.g. 01712345678"
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
            placeholder="At least 4 characters"
            required
            minLength={4}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {mode === 'login' && (
          <p className="helper-text">
            New member? Join by logging in with the Mess Code given by your manager.
          </p>
        )}

        {msg && <div className="login-success" style={{ whiteSpace: 'pre-line' }}>{msg}</div>}
        {error && <div className="login-error">{error}</div>}

        <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Mess'}
        </button>

        {mode === 'login' ? (
          <p className="auth-switch">
            No mess yet? <button type="button" onClick={() => switchMode('register')}>Create a New Mess</button>
          </p>
        ) : (
          <p className="auth-switch">
            Already have a mess? <button type="button" onClick={() => switchMode('login')}>Log In</button>
          </p>
        )}
      </form>
    </div>
  )
}