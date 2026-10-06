import { useState, useEffect } from 'react'
import { fetchMembers, fetchChal, fetchChalAccount, bulkAddChal, deleteChal } from '../api'
import { toLocalDate, num } from '../utils'
import {
  PageHeader, StatCard, EmptyState, TableWrap, MonthPicker,
  IconChal, IconPlus, IconTrash, IconInbox, IconAlert,
  MONTHS_BN,
} from '../components/ui'

const monthOf = date => String(Number(date.slice(5, 7))).padStart(2, '0')
const yearOf = date => date.slice(0, 4)
const EMPTY_ACCOUNT = { rows: [], totalPots: 0, totalMeals: 0, totalGuest: 0 }
const asArray = v => (Array.isArray(v) ? v : [])
const errorText = v => (v && !Array.isArray(v) && v.error ? v.error : '')

function Chal() {
  const now = new Date()
  const [members, setMembers] = useState([])
  const [listChal, setListChal] = useState([])
  const [dateEntries, setDateEntries] = useState([])
  const [account, setAccount] = useState(EMPTY_ACCOUNT)
  const [date, setDate] = useState(toLocalDate())
  const [listMonth, setListMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [listYear, setListYear] = useState(String(now.getFullYear()))
  const [thisTime, setThisTime] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const listLabel = `${MONTHS_BN[parseInt(listMonth) - 1]} ${listYear}`

  const loadAccount = async (month, year) => {
    const a = await fetchChalAccount({ month, year })
    if (a && Array.isArray(a.rows)) setAccount(a)
    else {
      setAccount(EMPTY_ACCOUNT)
      setError(errorText(a) || 'চালের হিসাব লোড করা যায়নি')
    }
  }

  const loadList = async () => {
    const res = await fetchChal({ month: listMonth, year: listYear })
    if (Array.isArray(res)) setListChal(res)
    else { setListChal([]); setError(errorText(res) || 'চালের তালিকা লোড করা যায়নি') }
  }

  const loadDateEntries = async () => {
    const c = await fetchChal({ date })
    setDateEntries(asArray(c).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')))
  }

  const loadMembers = async () => {
    const m = await fetchMembers()
    if (Array.isArray(m)) setMembers(m)
    else { setMembers([]); setError(errorText(m) || 'সদস্য লোড করা যায়নি') }
  }

  const refreshAll = async () => {
    await Promise.all([loadList(), loadDateEntries(), loadAccount(monthOf(date), yearOf(date))])
  }

  useEffect(() => {
    loadMembers()
    loadAccount(monthOf(date), yearOf(date))
  }, [])

  useEffect(() => { loadList() }, [listMonth, listYear])
  useEffect(() => { loadDateEntries() }, [date])

  const setPots = (memberId, value) => {
    setThisTime(prev => ({ ...prev, [memberId]: Number(value) || 0 }))
  }

  const handleSave = async () => {
    const validEntries = Object.entries(thisTime)
      .filter(([, pots]) => Number(pots) > 0)
      .map(([memberId, pots]) => ({ member_id: Number(memberId), pots: Number(pots) }))

    if (validEntries.length === 0) return alert('অন্তত একজনের পট সংখ্যা লিখুন')

    setSaving(true)
    await bulkAddChal({ entries: validEntries, date })
    setThisTime({})
    await refreshAll()
    setSaving(false)
  }

  const handleDelete = async id => {
    if (!confirm('এই চাল জমার এন্ট্রিটি মুছে ফেলবেন?')) return
    await deleteChal(id)
    await refreshAll()
  }

  const accountMap = {}
  account.rows.forEach(r => { accountMap[r.id] = r })

  const listMonthTotal = listChal.reduce((s, c) => s + Number(c.pots || 0), 0)
  const pendingCount = Object.values(thisTime).filter(v => Number(v) > 0).length

  return (
    <div className="page">
      <PageHeader title="চাল জমা" subtitle={`${MONTHS_BN[parseInt(monthOf(date)) - 1]} ${yearOf(date)}`} />

      {error ? (
        <div className="alert alert-error">
          <IconAlert size={17} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="card-grid">
        <StatCard tone="yellow" icon={<IconChal size={19} />} label="এই মাসে জমা" value={`${num(account.totalPots)} পট`} />
        <StatCard tone="slate" icon={<IconInbox size={19} />} label="এই মাসে meal" value={num(account.totalMeals)} />
        <StatCard tone="green" icon={<IconChal size={19} />} label={`${listLabel} জমা`} value={`${num(listMonthTotal)} পট`} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>নতুন চাল জমা</h3>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="তারিখ" style={{ width: 'auto' }} />
        </div>

        {members.length === 0 ? (
          <EmptyState icon={<IconAlert size={22} />} title="আগে সদস্য যোগ করুন" />
        ) : (
          <>
            <TableWrap>
              <table>
                <thead>
                  <tr>
                    <th>সদস্য</th>
                    <th className="num">কত পট</th>
                    <th className="num">এই মাসে জমা</th>
                    <th className="num">এই মাসে meal</th>
                    <th className="num">ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const a = accountMap[m.id] || { month_pots: 0, month_meals: 0, balance: 0 }
                    const bal = Number(a.balance || 0)
                    return (
                      <tr key={m.id}>
                        <td className="name">{m.name}</td>
                        <td className="num">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="0"
                            value={thisTime[m.id] ?? ''}
                            onChange={e => setPots(m.id, e.target.value)}
                            aria-label={`${m.name} পট`}
                            style={{ width: 96, textAlign: 'right' }}
                          />
                        </td>
                        <td className="num">{num(a.month_pots)}</td>
                        <td className="num">{num(a.month_meals)}</td>
                        <td className="num">
                          {bal > 0
                            ? <span className="badge badge-success">পাবে +{num(bal)}</span>
                            : bal < 0
                              ? <span className="badge badge-danger">দিবে {num(Math.abs(bal))}</span>
                              : <span className="badge badge-muted">সমতা</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableWrap>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || pendingCount === 0}>
                <IconPlus size={16} />
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
              <button className="btn btn-outline" onClick={() => setThisTime({})}>খালি করুন</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>এই তারিখের জমা</h3>
          <span className="sub">{date}</span>
        </div>
        {dateEntries.length === 0 ? (
          <EmptyState icon={<IconInbox size={22} />} title="এই তারিখে কোনো চাল জমা হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>সদস্য</th>
                  <th className="num">পট</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dateEntries.map(ch => (
                  <tr key={ch.id}>
                    <td className="name">{ch.member_name}</td>
                    <td className="num strong">{num(ch.pots)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(ch.id)} aria-label="Delete">
                          <IconTrash size={16} />
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

      <div className="card">
        <div className="card-head">
          <h3>সব জমার তালিকা</h3>
          <MonthPicker month={listMonth} year={listYear} onMonth={setListMonth} onYear={setListYear} />
        </div>
        {listChal.length === 0 ? (
          <EmptyState icon={<IconChal size={22} />} title="এই মাসে কোনো চাল জমা হয়নি" />
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>সদস্য</th>
                  <th className="num">পট</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...listChal].sort((a, b) => b.date.localeCompare(a.date)).map(ch => (
                  <tr key={ch.id}>
                    <td className="muted">{ch.date}</td>
                    <td className="name">{ch.member_name}</td>
                    <td className="num strong">{num(ch.pots)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(ch.id)} aria-label="Delete">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ textAlign: 'right' }}>মোট</td>
                  <td className="num">{num(listMonthTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  )
}

export default Chal