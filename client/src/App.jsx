import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
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
import {
  IconDashboard, IconMeals, IconChal, IconBazaar, IconPayments,
  IconExpenses, IconMembers, IconReport, IconSettings, IconLogout, IconHome,
  IconMenu, IconClose,
} from './components/ui'
import { fetchMe, getToken, clearToken } from './api'

const managerNav = [
  { path: '/dashboard', label: 'ড্যাশবোর্ড', Icon: IconDashboard },
  { path: '/meals', label: 'খাবার', Icon: IconMeals },
  { path: '/chal', label: 'চাল জমা', Icon: IconChal },
  { path: '/bazaar', label: 'বাজার', Icon: IconBazaar },
  { path: '/payments', label: 'টাকা জমা', Icon: IconPayments },
  { path: '/expenses', label: 'খরচ', Icon: IconExpenses },
  { path: '/members', label: 'সদস্য', Icon: IconMembers },
  { path: '/report', label: 'মাসিক রিপোর্ট', Icon: IconReport },
]

const memberNav = [
  { path: '/dashboard', label: 'আমার ড্যাশবোর্ড', Icon: IconDashboard },
  { path: '/meals', label: 'আমার খাবার', Icon: IconMeals },
  { path: '/chal', label: 'আমার চাল', Icon: IconChal },
  { path: '/report', label: 'আমার হিসাব', Icon: IconReport },
]

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

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
        <button className="hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          {menuOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
        </button>
        <h1>{nav.find(n => n.path === location.pathname)?.label || 'Mess Manager'}{user.messName ? ` · ${user.messName}` : ''}</h1>
      </div>
      <div className={`overlay ${menuOpen ? 'show' : ''}`} onClick={closeMenu} />
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-mark"><IconHome size={17} /></span>
            Mess Manager
          </div>
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
              <span className="nav-icon"><item.Icon size={18} /></span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>
            <span className="nav-icon"><IconSettings size={18} /></span>
            নিজের অ্যাকাউন্ট
          </NavLink>
          <button className="logout-btn" onClick={logout}>
            <span className="nav-icon"><IconLogout size={18} /></span>
            লগআউট
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
                <Route path="/dashboard" element={<MyDashboard user={user} />} />
                <Route path="/meals" element={<MyMeals user={user} />} />
                <Route path="/chal" element={<MyChal user={user} />} />
                <Route path="/report" element={<MyReport user={user} />} />
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