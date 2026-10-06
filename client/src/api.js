// API base:
// - dev: '/api' (proxied to the backend by vite.config.js)
// - APK / production: the deployed backend, overridable via VITE_API_URL.
//   Defaults to the Render backend so a missing env var can't break login.
//   If VITE_API_URL is set without a trailing '/api', it is appended automatically.
const PROD_API = 'https://mess-manager-app-api.onrender.com/api';

const _envApi = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API = _envApi
  ? (_envApi.endsWith('/api') ? _envApi : _envApi + '/api')
  : (import.meta.env.PROD ? PROD_API : '/api');

const TOKEN_KEY = 'mess_manager_token';
const MESS_CODE_KEY = 'mess_manager_code';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getMessCode() {
  return localStorage.getItem(MESS_CODE_KEY) || '';
}

export function setMessCode(code) {
  if (code) localStorage.setItem(MESS_CODE_KEY, code);
  else localStorage.removeItem(MESS_CODE_KEY);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!options.public) {
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(API + path, { ...options, headers });

  // 401 = token missing/expired -> log the user out everywhere
  // (login/register/join attempts opt out via options.public)
  if (res.status === 401 && !options.public) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  let data = null;
  try { data = await res.json(); } catch {}
  return data || res;
}

// ========== AUTH ==========

export function registerMess(data) {
  return request('/auth/register', {
    method: 'POST',
    public: true,
    body: JSON.stringify(data),
  });
}

export function joinMess(data) {
  return request('/auth/join', {
    method: 'POST',
    public: true,
    body: JSON.stringify(data),
  });
}

export function loginUser(mess_code, username, password) {
  return request('/auth/login', {
    method: 'POST',
    public: true,
    body: JSON.stringify({ mess_code, username, password }),
  });
}

export function fetchMe() {
  return request('/auth/me');
}

export function changePassword(current_password, new_password) {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function changeNumber(new_phone) {
  return request('/auth/number', {
    method: 'PUT',
    body: JSON.stringify({ new_phone }),
  });
}

// ADMIN ONLY: erase all records of one month (meals, chal, bazaar, payments, expenses)
export function clearMonth(month, year) {
  return request('/admin/clear-month', {
    method: 'POST',
    body: JSON.stringify({ month, year }),
  });
}

// ========== ROLES ==========

export function assignManager(member_id) {
  return request('/admin/assign-manager', {
    method: 'POST',
    body: JSON.stringify({ member_id }),
  });
}

export function assignCoManager(member_id) {
  return request('/admin/assign-co-manager', {
    method: 'POST',
    body: JSON.stringify({ member_id }),
  });
}

// admin/manager: reset a member's login password (forgot-password recovery)
export function resetPassword(memberId, newPassword) {
  return request('/admin/reset-password', {
    method: 'PUT',
    body: JSON.stringify({ member_id: memberId, new_password: newPassword }),
  });
}

// admin/manager: reset any username's password (use for non-member accounts)
export function resetPasswordByUsername(username, newPassword) {
  return request('/admin/reset-password', {
    method: 'PUT',
    body: JSON.stringify({ username, new_password: newPassword }),
  });
}

// ========== MEMBERS ==========

export async function fetchMembers() {
  return request('/members', { cache: 'no-store' });
}

export async function addMember(data) {
  return request('/members', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteMember(id, data = {}) {
  return request(`/members/${id}`, { method: 'DELETE', body: JSON.stringify(data) });
}

export async function updateMember(id, data) {
  return request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function fetchMeals(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/meals?${query}`, { cache: 'no-store' });
}

export async function fetchMealCounts(date) {
  return request(`/meals/counts/${date}`, { cache: 'no-store' });
}

export async function addMeal(data) {
  return request('/meals', { method: 'POST', body: JSON.stringify(data) });
}

export async function bulkAddMeals(data) {
  return request('/meals/bulk', { method: 'POST', body: JSON.stringify(data) });
}

export async function toggleMeals(data) {
  return request('/meals/toggle', { method: 'POST', body: JSON.stringify(data) });
}

export async function unmarkMeals(data) {
  return request('/meals/unmark', { method: 'POST', body: JSON.stringify(data) });
}

export async function toggleGuestMeal(data) {
  return request('/meals/guest', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteMeal(id) {
  return request(`/meals/${id}`, { method: 'DELETE' });
}

export async function fetchExpenses(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/expenses?${query}`, { cache: 'no-store' });
}

export async function addExpense(data) {
  return request('/expenses', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: 'DELETE' });
}

export async function fetchDashboard(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/dashboard?${query}`, { cache: 'no-store' });
}

export async function fetchReport(month, year) {
  return request(`/report/${month}/${year}`, { cache: 'no-store' });
}

export async function setMealOverride(data) {
  return request('/report/meal-override', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchChal(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/chal?${query}`, { cache: 'no-store' });
}

export async function fetchChalAccount(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/chal/account?${query}`, { cache: 'no-store' });
}

export async function addChal(data) {
  return request('/chal', { method: 'POST', body: JSON.stringify(data) });
}

export async function bulkAddChal(data) {
  return request('/chal/bulk', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteChal(id) {
  return request(`/chal/${id}`, { method: 'DELETE' });
}

export async function fetchBazaar(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/bazaar?${query}`, { cache: 'no-store' });
}

export async function addBazaar(data) {
  return request('/bazaar', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBazaar(id, data) {
  return request(`/bazaar/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteBazaar(id) {
  return request(`/bazaar/${id}`, { method: 'DELETE' });
}

export async function fetchPayments(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/payments?${query}`, { cache: 'no-store' });
}

export async function addPayment(data) {
  return request('/payments', { method: 'POST', body: JSON.stringify(data) });
}

export async function deletePayment(id) {
  return request(`/payments/${id}`, { method: 'DELETE' });
}

// ========== MY (member self-service) ==========

export async function fetchMyMeals(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/my/meals?${query}`, { cache: 'no-store' });
}

export async function fetchMyMealsOnDate(date) {
  return request(`/my/meals/date/${date}`, { cache: 'no-store' });
}

export async function fetchMyChal(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/my/chal?${query}`, { cache: 'no-store' });
}

export async function fetchMyReport(month, year) {
  return request(`/my/report/${month}/${year}`, { cache: 'no-store' });
}

export async function fetchMyDashboard() {
  return request('/my/dashboard', { cache: 'no-store' });
}