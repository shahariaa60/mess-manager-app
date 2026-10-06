import { useState, useEffect } from 'react'
import { fetchDashboard } from '../api'

function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [data, setData] = useState(null)

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ]

  useEffect(() => {
    fetchDashboard({ month, year }).then(setData)
  }, [month, year])

  if (!data) return <p>Loading...</p>

  const b = data.isCurrentMonth ? data.todayMeals : data.monthMealTypes
  const totalCost = data.monthBazaarTotal + data.monthExpenses

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="date-picker" style={{ marginBottom: 20 }}>
        <select value={month} onChange={e => setMonth(e.target.value)}>
          {months.map((m, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="helper-text">{months[parseInt(month) - 1]} {year}-এর হিসাব</span>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-info">
            <h3>{data.totalMembers}</h3>
            <p>Active Members</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🍛</div>
          <div className="stat-info">
            <h3>{b.breakfast} / {b.lunch} / {b.dinner}</h3>
            <p>{data.isCurrentMonth ? 'আজ' : 'মাসে'} : সকাল / দুপুর / রাত</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">🍽️</div>
          <div className="stat-info">
            <h3>{data.monthMeals}</h3>
            <p>মাসের মোট meal</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">📊</div>
          <div className="stat-info">
            <h3>{data.monthMealCount} count</h3>
            <p>মাসের মোট Meal Count (বিল হিসাবে)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">🍚</div>
          <div className="stat-info">
            <h3>{data.monthChal} পট</h3>
            <p>চাল জমা হইচে</p>
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon green">🛒</div>
          <div className="stat-info">
            <h3>৳{data.monthBazaarTotal.toLocaleString()}</h3>
            <p>মাসের বাজার খরচ</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div className="stat-info">
            <h3>৳{data.monthExpenses.toLocaleString()}</h3>
            <p>মাসের খরচ</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">💸</div>
          <div className="stat-info">
            <h3>৳{totalCost.toLocaleString()}</h3>
            <p>মোট খরচ (বাজার + Expense)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📊</div>
          <div className="stat-info">
            <h3 style={{ fontSize: 32, fontWeight: 800 }}>৳{data.mealRate}</h3>
            <p>Meal Rate</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🧾</div>
          <div className="stat-info">
            <h3>৳{data.totalBills.toLocaleString()}</h3>
            <p>মোট বিল</p>
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-info">
            <h3>৳{data.totalMonthDeposit.toLocaleString()}</h3>
            <p>এই মাসে জমা (আগের হিসাবসহ)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>৳{data.willGet.toLocaleString()}</h3>
            <p>সব মিলিয়ে পাবে</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div className="stat-info">
            <h3>৳{data.willGive.toLocaleString()}</h3>
            <p>সব মিলিয়ে দিবে</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Recent Expenses</h3>
        {data.recentExpenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses recorded yet</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentExpenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td><span className="badge badge-info">{exp.category}</span></td>
                  <td>{exp.description || '-'}</td>
                  <td style={{ fontWeight: 600 }}>৳{exp.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Dashboard