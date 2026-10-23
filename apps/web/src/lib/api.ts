const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// ==========================================
// Authentication
// ==========================================

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('homemoney_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('homemoney_token', token);
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('homemoney_token');
    localStorage.removeItem('homemoney_user');
  }
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('homemoney_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('homemoney_user', JSON.stringify(user));
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loginUser(data: { identifier: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao realizar login');
  }
  const result = await res.json();
  setAuthToken(result.token);
  setStoredUser(result.user);
  return result;
}

export async function registerUser(data: { name: string; email: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao cadastrar usuário');
  }
  const result = await res.json();
  setAuthToken(result.token);
  setStoredUser(result.user);
  return result;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    clearAuthToken();
    return null;
  }
  const data = await res.json();
  setStoredUser(data.user);
  return data.user;
}

// ==========================================
// Reports
// ==========================================

export async function fetchMonthlyReports() {
  const res = await fetch(`${API_BASE}/reports/monthly`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar relatório mensal');
  return res.json();
}

export async function fetchCategoryReports(month?: string) {
  const url = month ? `${API_BASE}/reports/by-category?month=${month}` : `${API_BASE}/reports/by-category`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar despesas por categoria');
  return res.json();
}

// ==========================================
// Accounts / Wallets (Carteiras & Poupanças)
// ==========================================

export async function fetchAccounts() {
  const res = await fetch(`${API_BASE}/accounts`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar contas/carteiras');
  return res.json();
}

export async function createAccount(data: { name: string; type?: string; color?: string; initialBalance?: number }) {
  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao criar carteira/poupança');
  }
  return res.json();
}

export async function updateAccount(id: string, data: any) {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar carteira');
  }
  return res.json();
}

export async function deleteAccount(id: string) {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao excluir carteira');
  }
  return true;
}

// ==========================================
// Categories
// ==========================================

export async function fetchCategories(includeArchived = false) {
  const url = includeArchived ? `${API_BASE}/categories?includeArchived=true` : `${API_BASE}/categories`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar categorias');
  return res.json();
}

export async function createCategory(data: { name: string; icon?: string | null; color?: string | null; isIncome?: boolean }) {
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao criar categoria');
  }
  return res.json();
}

export async function updateCategory(id: string, data: any) {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar categoria');
  }
  return res.json();
}

export async function deleteCategory(id: string) {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao excluir categoria');
  }
  return true;
}

// ==========================================
// People / Contacts
// ==========================================

export async function fetchPeople(includeArchived = false) {
  const url = includeArchived ? `${API_BASE}/people?includeArchived=true` : `${API_BASE}/people`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar contatos');
  return res.json();
}

export async function fetchPersonPendingTransactions(personId: string) {
  const res = await fetch(`${API_BASE}/people/${personId}/pending-transactions`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar transações pendentes do contato');
  return res.json();
}

export async function createPerson(data: { name: string; notes?: string | null }) {
  const res = await fetch(`${API_BASE}/people`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao criar contato');
  }
  return res.json();
}

export async function updatePerson(id: string, data: any) {
  const res = await fetch(`${API_BASE}/people/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar contato');
  }
  return res.json();
}

export async function deletePerson(id: string) {
  const res = await fetch(`${API_BASE}/people/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao excluir contato');
  }
  return true;
}

// ==========================================
// Payment Methods
// ==========================================

export async function fetchPaymentMethods(includeArchived = false) {
  const url = includeArchived ? `${API_BASE}/payment-methods?includeArchived=true` : `${API_BASE}/payment-methods`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar métodos de pagamento');
  return res.json();
}

export async function createPaymentMethod(data: { name: string; icon?: string | null }) {
  const res = await fetch(`${API_BASE}/payment-methods`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao criar método de pagamento');
  }
  return res.json();
}

export async function updatePaymentMethod(id: string, data: any) {
  const res = await fetch(`${API_BASE}/payment-methods/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar método de pagamento');
  }
  return res.json();
}

export async function deletePaymentMethod(id: string) {
  const res = await fetch(`${API_BASE}/payment-methods/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao excluir método de pagamento');
  }
  return true;
}

// ==========================================
// Transactions
// ==========================================

export async function fetchTransactions(params?: {
  month?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  personId?: string;
  paid?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.month) query.set('month', params.month);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.type) query.set('type', params.type);
  if (params?.accountId) query.set('accountId', params.accountId);
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.personId) query.set('personId', params.personId);
  if (params?.paid !== undefined) query.set('paid', String(params.paid));

  const res = await fetch(`${API_BASE}/transactions?${query.toString()}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar transações');
  return res.json();
}

export async function createTransaction(data: any) {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || 'Falha ao criar transação');
  }
  return res.json();
}

export async function updateTransaction(id: string, data: any) {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao atualizar transação');
  return res.json();
}

export async function toggleTransactionPaid(id: string) {
  const res = await fetch(`${API_BASE}/transactions/${id}/toggle-paid`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Falha ao alterar status da transação');
  return res.json();
}

export async function deleteTransaction(id: string) {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Falha ao excluir transação');
  return true;
}

export async function settleDebt(personId: string, data: { accountId: string; amount: number; date: string; description?: string }) {
  const res = await fetch(`${API_BASE}/people/${personId}/settle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao liquidar acerto');
  }
  return res.json();
}

// ==========================================
// Profile & Contact Linking
// ==========================================

export async function updateUserProfile(data: {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao atualizar perfil');
  }
  const result = await res.json();
  if (result.token) setAuthToken(result.token);
  if (result.user) setStoredUser(result.user);
  return result;
}

export async function linkPersonToUser(personId: string, email: string) {
  const res = await fetch(`${API_BASE}/people/${personId}/link`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao vincular usuário');
  }
  return res.json();
}

export async function unlinkPerson(personId: string) {
  const res = await fetch(`${API_BASE}/people/${personId}/unlink`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao desvincular usuário');
  }
  return res.json();
}

export async function fetchContactInvites() {
  const res = await fetch(`${API_BASE}/invites`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao buscar convites de conexão');
  return res.json();
}

export async function acceptContactInvite(inviteId: string) {
  const res = await fetch(`${API_BASE}/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao aceitar convite');
  }
  return res.json();
}

export async function rejectContactInvite(inviteId: string) {
  const res = await fetch(`${API_BASE}/invites/${inviteId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao recusar convite');
  }
  return res.json();
}
