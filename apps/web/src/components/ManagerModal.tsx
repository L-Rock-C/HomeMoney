'use client';

import React, { useState } from 'react';
import {
  X,
  Tag,
  Users,
  CreditCard,
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Check,
  PiggyBank,
  Sparkles,
} from 'lucide-react';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createPerson,
  updatePerson,
  deletePerson,
  createPaymentMethod,
  deletePaymentMethod,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../lib/api';

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  people: any[];
  paymentMethods: any[];
  accounts: any[];
  onRefreshData: () => void;
  initialSection?: 'CATEGORIES' | 'PEOPLE' | 'PAYMENTS' | 'WALLETS';
}

export function ManagerModal({
  isOpen,
  onClose,
  categories,
  people,
  paymentMethods,
  accounts,
  onRefreshData,
  initialSection = 'CATEGORIES',
}: ManagerModalProps) {
  const [activeSection, setActiveSection] = useState<'CATEGORIES' | 'PEOPLE' | 'PAYMENTS' | 'WALLETS'>(initialSection);

  // Refresh data when modal opens
  React.useEffect(() => {
    if (isOpen) {
      onRefreshData();
      setError(null);
      setSuccessMessage(null);
      if (initialSection) setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // Input states
  const [newCatName, setNewCatName] = useState('');
  const [newCatIsIncome, setNewCatIsIncome] = useState(false);
  
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');

  const [newMethodName, setNewMethodName] = useState('');

  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState('SAVINGS');
  const [newWalletBalance, setNewWalletBalance] = useState('0');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleSwitchSection(section: 'CATEGORIES' | 'PEOPLE' | 'PAYMENTS' | 'WALLETS') {
    setActiveSection(section);
    setError(null);
    setSuccessMessage(null);
  }

  // Category Actions
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await createCategory({ name: newCatName.trim(), isIncome: newCatIsIncome });
      setNewCatName('');
      setSuccessMessage('Categoria salva com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar categoria');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Deseja excluir esta categoria?')) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deleteCategory(id);
      setSuccessMessage('Categoria removida com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir categoria');
    }
  }

  // Person Actions
  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await createPerson({ name: newPersonName.trim(), notes: newPersonNotes || null });
      setNewPersonName('');
      setNewPersonNotes('');
      setSuccessMessage('Contato salvo com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar contato');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePerson(id: string) {
    if (!confirm('Deseja excluir este contato?')) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deletePerson(id);
      setSuccessMessage('Contato removido com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir contato');
    }
  }

  // Payment Method Actions
  async function handleAddPaymentMethod(e: React.FormEvent) {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await createPaymentMethod({ name: newMethodName.trim() });
      setNewMethodName('');
      setSuccessMessage('Método de pagamento salvo com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar método');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePaymentMethod(id: string) {
    if (!confirm('Deseja excluir este método de pagamento?')) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deletePaymentMethod(id);
      setSuccessMessage('Método de pagamento removido com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir método de pagamento');
    }
  }

  // Wallet Actions
  async function handleAddWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const initial = parseFloat(newWalletBalance.replace(',', '.')) || 0;
      await createAccount({ name: newWalletName.trim(), type: newWalletType, initialBalance: initial });
      setNewWalletName('');
      setNewWalletBalance('0');
      setSuccessMessage('Carteira salva com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar carteira');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWallet(id: string) {
    if (!confirm('Deseja excluir esta carteira/poupança? As transações associadas serão afetadas.')) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deleteAccount(id);
      setSuccessMessage('Carteira removida com sucesso!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir carteira');
    }
  }

  const formatBRL = (val: number) =>
    val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Gerenciador de Cadastros
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalize suas categorias, contatos, carteiras/poupanças e métodos de pagamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => handleSwitchSection('CATEGORIES')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'CATEGORIES'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            Categorias ({categories.length})
          </button>

          <button
            onClick={() => handleSwitchSection('WALLETS')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'WALLETS'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            Carteiras & Poupanças ({accounts.length})
          </button>

          <button
            onClick={() => handleSwitchSection('PEOPLE')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'PEOPLE'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Contatos / Terceiros ({people.length})
          </button>

          <button
            onClick={() => handleSwitchSection('PAYMENTS')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'PAYMENTS'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Métodos de Pagamento ({paymentMethods.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">✕</button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold hover:underline">✕</button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: CATEGORIES */}
          {/* ========================================================================= */}
          {activeSection === 'CATEGORIES' && (
            <div className="space-y-4">
              {/* Add Category Form */}
              <form onSubmit={handleAddCategory} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nova categoria (ex: Viagem, Saúde)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 min-w-[200px] px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />

                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCatIsIncome}
                    onChange={(e) => setNewCatIsIncome(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>É Receita?</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Categoria
                </button>
              </form>

              {/* Categories List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                      {c.isIncome && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                          Receita
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: CARTEIRAS & POUPANÇAS */}
          {/* ========================================================================= */}
          {activeSection === 'WALLETS' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                <strong>Carteiras & Poupanças:</strong> Crie quantas carteiras ou caixinhas de poupança quiser (ex: <em>Reserva de Emergência</em>, <em>Férias</em>, <em>IPVA</em>, <em>Nubank</em>). Ao registrar qualquer transação, você pode selecionar qual carteira/poupança foi utilizada para pagar ou receber.
              </div>

              {/* Add Wallet Form */}
              <form onSubmit={handleAddWallet} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nome da Carteira / Poupança</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Reserva de Emergência, Caixinha Nubank..."
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
                    <select
                      value={newWalletType}
                      onChange={(e) => setNewWalletType(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CHECKING">Conta Corrente / Principal</option>
                      <option value="SAVINGS">Poupança / Caixinha</option>
                      <option value="WALLET">Carteira Dinheiro</option>
                      <option value="INVESTMENT">Investimentos</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Saldo Inicial:</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={newWalletBalance}
                      onChange={(e) => setNewWalletBalance(e.target.value)}
                      className="w-24 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Criar Carteira / Poupança
                  </button>
                </div>
              </form>

              {/* Wallets List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <PiggyBank className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{a.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Tipo: <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {a.type === 'SAVINGS' ? 'Poupança / Caixinha' : a.type === 'CHECKING' ? 'Conta Principal' : 'Carteira'}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Saldo: {formatBRL(a.currentBalance)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteWallet(a.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: PEOPLE / CONTACTS */}
          {/* ========================================================================= */}
          {activeSection === 'PEOPLE' && (
            <div className="space-y-4">
              {/* Add Person Form */}
              <form onSubmit={handleAddPerson} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome do contato (ex: Pai, Lelê, Amigo)..."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="flex-1 min-w-[200px] px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />

                <input
                  type="text"
                  placeholder="Observação (opcional)..."
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  className="flex-1 min-w-[150px] px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Contato
                </button>
              </form>

              {/* People List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</span>
                      {p.notes && <p className="text-xs text-slate-400">{p.notes}</p>}
                    </div>

                    <button
                      onClick={() => handleDeletePerson(p.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: PAYMENT METHODS */}
          {/* ========================================================================= */}
          {activeSection === 'PAYMENTS' && (
            <div className="space-y-4">
              {/* Add Payment Method Form */}
              <form onSubmit={handleAddPaymentMethod} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="Novo método de pagamento (ex: Vale Alimentação, Cartão XP, NuPay)..."
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Método
                </button>
              </form>

              {/* Payment Methods List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {paymentMethods.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{m.name}</span>
                    </div>

                    <button
                      onClick={() => handleDeletePaymentMethod(m.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
