import { MONTHS, MONTHS_BN, YEARS, num, money, currentMonth, currentYear } from '../utils';

function Svg({ size = 18, children, width = 1.8, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconDashboard = p => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></Svg>;
export const IconMeals = p => <Svg {...p}><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M9.5 7.5c0-1.5 1-2 1-3.5" /><path d="M14.5 7.5c0-1.5 1-2 1-3.5" /></Svg>;
export const IconChal = p => <Svg {...p}><path d="M12 3v18" /><path d="M12 9c-3 0-5-1.8-5-3.8C10 5.2 12 7 12 9Z" /><path d="M12 9c3 0 5-1.8 5-3.8C14 5.2 12 7 12 9Z" /><path d="M12 15c-3 0-5-1.8-5-3.8C10 11.2 12 13 12 15Z" /><path d="M12 15c3 0 5-1.8 5-3.8C14 11.2 12 13 12 15Z" /></Svg>;
export const IconBazaar = p => <Svg {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="19" cy="20" r="1.4" /><path d="M2 3h3l2.4 12.1a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7H6" /></Svg>;
export const IconPayments = p => <Svg {...p}><path d="M20 8V6.5A1.5 1.5 0 0 0 18.5 5H5a2 2 0 0 0 0 4h15v9a1.5 1.5 0 0 1-1.5 1.5H5A2 2 0 0 1 3 17.5V7" /><path d="M16.5 13.5H21" /></Svg>;
export const IconExpenses = p => <Svg {...p}><path d="M5 3h14v18l-2.3-1.5L14.4 21 12 19.5 9.6 21l-2.3-1.5L5 21Z" /><path d="M9 8h6M9 12h6M9 16h4" /></Svg>;
export const IconMembers = p => <Svg {...p}><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M21 20v-1.5a4 4 0 0 0-3-3.87" /><path d="M15.5 4.2a3.5 3.5 0 0 1 0 6.6" /></Svg>;
export const IconReport = p => <Svg {...p}><path d="M15 3h2a2 2 0 0 1 2 2v15a1 1 0 0 1-1.5.87L15 20l-2.5.87L10 20l-2.5.87L5 20V5a2 2 0 0 1 2-2h2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h4" /></Svg>;
export const IconSettings = p => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" /></Svg>;
export const IconLogout = p => <Svg {...p}><path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" /><path d="m17 15 4-4-4-4" /><path d="M21 11H10" /></Svg>;
export const IconPlus = p => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconTrash = p => <Svg {...p}><path d="M3 6h18" /><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" /><path d="m18.5 6-.9 13.1A2 2 0 0 1 15.6 21H8.4a2 2 0 0 1-2-1.9L5.5 6" /></Svg>;
export const IconSearch = p => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.6-4.6" /></Svg>;
export const IconCheck = p => <Svg {...p}><path d="m20 6-11 11-5-5" /></Svg>;
export const IconAlert = p => <Svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4.5M12 17.2h.01" /></Svg>;
export const IconScale = p => <Svg {...p}><path d="M12 3v18M7 6h10M4 21h16" /><path d="m7 6-3.5 7h7Z" /><path d="m17 6-3.5 7h7Z" /></Svg>;
export const IconCalendar = p => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></Svg>;
export const IconHome = p => <Svg {...p}><path d="m3 10.5 9-7 9 7" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M10 21v-6h4v6" /></Svg>;
export const IconInbox = p => <Svg {...p}><path d="M21 12h-5l-1.5 3h-5L8 12H3" /><path d="M5.5 4.5h13l2.5 7.5v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z" /></Svg>;
export const IconMore = p => <Svg {...p}><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></Svg>;
export const IconKey = p => <Svg {...p}><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.8 12.2 8.2-8.2M17 6l2.5 2.5M14.5 8.5 17 11" /></Svg>;
export const IconMenu = p => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconClose = p => <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>;

export function Menu({ label = 'More', children }) {
  return (
    <details className="menu">
      <summary className="btn btn-ghost btn-icon" aria-label={label}><IconMore size={16} /></summary>
      <div className="menu-panel">{children}</div>
    </details>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function StatCard({ icon, label, value, tone = 'slate', sub }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      {icon ? <span className="stat-icon">{icon}</span> : null}
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {sub ? <span className="stat-sub">{sub}</span> : null}
      </div>
    </div>
  );
}

export function BalanceBadge({ value, label = true }) {
  const v = Number(value || 0);
  if (v > 0) return <span className="badge badge-success">{label ? 'পাবে ' : ''}+{money(v)}</span>;
  if (v < 0) return <span className="badge badge-danger">{label ? 'দিবে ' : ''}{money(Math.abs(v))}</span>;
  return <span className="badge badge-muted">সমতা</span>;
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty-state">
      {icon ? <span className="empty-icon">{icon}</span> : null}
      <p>{title}</p>
      {children ? <p className="empty-sub">{children}</p> : null}
    </div>
  );
}

export function TableWrap({ children }) {
  return <div className="table-wrap">{children}</div>;
}

export function MonthPicker({ month, year, onMonth, onYear, years = YEARS }) {
  return (
    <div className="month-picker">
      <select value={month} onChange={e => onMonth(e.target.value)} aria-label="মাস">
        {MONTHS_BN.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      <select value={year} onChange={e => onYear(e.target.value)} aria-label="বছর">
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

export function MonthSelect({ month, onChange }) {
  return (
    <select value={month} onChange={e => onChange(e.target.value)} aria-label="মাস">
      {MONTHS.map((m, i) => (
        <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
      ))}
    </select>
  );
}

export { num, money, MONTHS, MONTHS_BN, YEARS, currentMonth, currentYear };