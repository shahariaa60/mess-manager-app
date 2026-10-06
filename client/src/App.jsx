import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Meals from './pages/Meals'
import Expenses from './pages/Expenses'
import Members from './pages/Members'
import Report from './pages/Report'
import Chal from './pages/Chal'
import Bazaar from './pages/Bazaar'
import Payments from './pages/Payments'
import MyDashboard from './pages/MyDashboard'
import MyMeals from './pages/MyMeals'
import MyChal from './pages/MyChal'
import MyReport from './pages/MyReport'
import Settings from './pages/Settings'
import ErrorBoundary from './components/ErrorBoundary'
import { fetchMe, getToken, clearToken } from './api'

const ROLE_LABEL = {
  admin: 'মেস ম্যানেজার',
  manager: 'ম্যানেজার',
  co_manager: 'সহ-ম্যানেজার',
  member: 'সদস্য',
}

const managerNav = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/meals', label: 'Meals', icon: '🍛' },
  { path: '/chal', label: 'চাল জমা', icon: '🍚' },
  { path: '/bazaar', label: 'Bazaar', icon: '🛒' },
  { path: '/payments', label: 'টাকা জমা', icon: '💵' },
  { path: '/expenses', label: 'Expenses', icon: '💰' },
  { path: '/members', label: 'Members', icon: '👥' },
  { path: '/report', label: 'Monthly Report', icon: '📋' },
]

const memberNav = [
  { path: '/dashboard', label: 'আমার ড্যাশবোর্ড', icon: '📊' },
  { path: '/meals', label: 'আমার খাবার', icon: '🍛' },
  { path: '/chal', label: 'আমার চাল', icon: '🍚' },
  { path: '/report', label: 'আমার হিসাব', icon: '📋' },
]

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await fetchMe()
      if (me && me.id) setUser(me)
      else setUser(null)
    } catch {
      setUser(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshUser()
    const onLogout = () => {
      clearToken()
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [refreshUser])

  function handleLogin(u) {
    setUser(u)
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  if (loading) {
    return <div className="login-wrap"><div className="login-card"><p className="helper-text">লোড হচ্ছে...</p></div></div>
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const isManager = ['admin', 'manager', 'co_manager'].includes(user.role)
  const nav = isManager ? managerNav : memberNav

  return (
    <div className="app">
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">☰</button>
        <h1>Mess Manager{user.messName ? ` · ${user.messName}` : ''}</h1>
      </div>
      <div className={`overlay ${menuOpen ? 'show' : ''}`} onClick={closeMenu} />
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🏠 Mess Manager</h1>
          {user.messName ? <p>{user.messName}{user.messCode ? ` · ${user.messCode}` : ''}</p> : null}
          {!isManager && user.name ? <p>{user.name}</p> : null}
        </div>
        <nav>
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={closeMenu}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
            <span className="icon">⚙️</span> নিজের অ্যাকাউন্ট
          </NavLink>
          <button className="logout-btn" onClick={logout}>
            <span className="icon">🚪</span> Logout ({ROLE_LABEL[user.role] || ''})
          </button>
        </div>
      </aside>
      <main className="main-content">
        <ErrorBoundary>
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={<Settings user={user} onRefreshUser={refreshUser} />} />
          {isManager ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/meals" element={<Meals />} />
              <Route path="/chal" element={<Chal />} />
              <Route path="/bazaar" element={<Bazaar />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/members" element={<Members user={user} />} />
              <Route path="/report" element={<Report user={user} />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<MyDashboard />} />
              <Route path="/meals" element={<MyMeals />} />
              <Route path="/chal" element={<MyChal />} />
              <Route path="/report" element={<MyReport />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App