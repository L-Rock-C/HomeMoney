'use client';

import React, { useState } from 'react';
import {
  Tag,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Settings,
  Palette,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '../lib/api';
import { TextInput, Checkbox } from './ui/FormControls';

interface ManagerViewProps {
  categories: any[];
  paymentMethods: any[];
  onRefreshData: () => void;
  initialSection?: 'CATEGORIES' | 'PAYMENTS' | 'THEMES';
  currentTheme?: 'light' | 'dark' | 'aero';
  onThemeChange?: (theme: 'light' | 'dark' | 'aero') => void;
}

export function ManagerView({
  categories,
  paymentMethods,
  onRefreshData,
  initialSection = 'CATEGORIES',
  currentTheme = 'light',
  onThemeChange,
}: ManagerViewProps) {
  const [activeSection, setActiveSection] = useState<'CATEGORIES' | 'PAYMENTS' | 'THEMES'>(initialSection);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Input states
  const [newCatName, setNewCatName] = useState('');
  const [newCatIsIncome, setNewCatIsIncome] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSwitchSection(section: 'CATEGORIES' | 'PAYMENTS' | 'THEMES') {
    setActiveSection(section);
    setError(null);
    setSuccessMessage(null);
    setEditingId(null);
    setSearchQuery('');
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
      setNewCatIsIncome(false);
      setSuccessMessage('Categoria cadastrada com sucesso!');
      onRefreshData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar categoria');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEditCategory(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await updateCategory(id, { name: editName.trim() });
      setEditingId(null);
      setSuccessMessage('Categoria atualizada com sucesso!');
      onRefreshData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar categoria');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Deseja realmente excluir a categoria "${name}"?`)) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deleteCategory(id);
      setSuccessMessage(`Categoria "${name}" removida com sucesso!`);
      onRefreshData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir categoria');
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
      setSuccessMessage('Método de pagamento adicionado com sucesso!');
      onRefreshData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar método');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEditMethod(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await updatePaymentMethod(id, { name: editName.trim() });
      setEditingId(null);
      setSuccessMessage('Método de pagamento atualizado com sucesso!');
      onRefreshData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar método');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePaymentMethod(id: string, name: string) {
    if (!confirm(`Deseja realmente excluir o método "${name}"?`)) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deletePaymentMethod(id);
      setSuccessMessage(`Método "${name}" removido com sucesso!`);
      onRefreshData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir método de pagamento');
    }
  }

  // Filtragem
  const filteredCategories = categories.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (categoryTypeFilter === 'INCOME') return matchesSearch && c.isIncome;
    if (categoryTypeFilter === 'EXPENSE') return matchesSearch && !c.isIncome;
    return matchesSearch;
  });

  const filteredPaymentMethods = paymentMethods.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-500" />
            Gerenciador de Cadastros
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personalize as categorias de receitas e despesas e configure os métodos de pagamento aceitos.
          </p>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => handleSwitchSection('CATEGORIES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSection === 'CATEGORIES'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categorias</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => handleSwitchSection('PAYMENTS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSection === 'PAYMENTS'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Métodos de Pagamento</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              {paymentMethods.length}
            </span>
          </button>

          <button
            onClick={() => handleSwitchSection('THEMES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSection === 'THEMES'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Temas & Estilos</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold hover:underline cursor-pointer">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold hover:underline cursor-pointer">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: CATEGORIES */}
      {/* ========================================================================= */}
      {activeSection === 'CATEGORIES' && (
        <div className="space-y-6">
          {/* Add Category Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Adicionar Nova Categoria</span>
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5">
              <div className="flex-1">
                <TextInput
                  label="Nome da Categoria"
                  required
                  placeholder="Ex: Supermercado, Salário, Freelance, Lazer, Saúde..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-4 pb-0.5">
                <div className="p-2 sm:px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <Checkbox
                    label="É Receita?"
                    description="Marque se for entrada de dinheiro"
                    checked={newCatIsIncome}
                    onChange={(val) => setNewCatIsIncome(val)}
                    align="center"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newCatName.trim()}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap self-stretch sm:self-auto justify-center"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Cadastrar Categoria</span>
                </button>
              </div>
            </form>
          </div>

          {/* Filters Bar: Search & Type */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Sub-Filters: Todas / Receitas / Despesas */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
              <button
                onClick={() => setCategoryTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  categoryTypeFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas ({categories.length})
              </button>
              <button
                onClick={() => setCategoryTypeFilter('INCOME')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  categoryTypeFilter === 'INCOME'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Receitas ({categories.filter((c) => c.isIncome).length})
              </button>
              <button
                onClick={() => setCategoryTypeFilter('EXPENSE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  categoryTypeFilter === 'EXPENSE'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Despesas ({categories.filter((c) => !c.isIncome).length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Grid */}
          {filteredCategories.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhuma categoria encontrada
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'Tente buscar com outro termo ou limpe o filtro.'
                  : 'Cadastre sua primeira categoria no formulário acima.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCategories.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-500/40 transition shadow-sm"
                >
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-emerald-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(c.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 cursor-pointer"
                        title="Salvar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            c.isIncome
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {c.isIncome ? (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {c.name}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md inline-block mt-0.5 ${
                              c.isIncome
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {c.isIncome ? 'Receita' : 'Despesa'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Editar nome"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PAYMENT METHODS */}
      {/* ========================================================================= */}
      {activeSection === 'PAYMENTS' && (
        <div className="space-y-6">
          {/* Add Payment Method Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Adicionar Método de Pagamento</span>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5">
              <div className="flex-1">
                <TextInput
                  label="Nome do Método de Pagamento"
                  required
                  placeholder="Ex: Cartão Nubank, VR Refeição, Débito Inter, Dinheiro em Espécie..."
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newMethodName.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap self-stretch sm:self-auto justify-center"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar Método</span>
              </button>
            </form>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredPaymentMethods.length} {filteredPaymentMethods.length === 1 ? 'método disponível' : 'métodos disponíveis'}
            </span>

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar método..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Payment Methods Grid */}
          {filteredPaymentMethods.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum método de pagamento encontrado
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'Tente buscar com outro termo ou limpe o filtro.'
                  : 'Cadastre seu primeiro método no formulário acima.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPaymentMethods.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-500/40 transition shadow-sm"
                >
                  {editingId === m.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-emerald-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditMethod(m.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 cursor-pointer"
                        title="Salvar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {m.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditName(m.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Editar nome"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentMethod(m.id, m.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Excluir método"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: Temas & Estilos (Claro, Escuro, Windows 7 Frutiger Aero)       */}
      {/* ========================================================================= */}
      {activeSection === 'THEMES' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-emerald-500" />
              <span>Aparência & Identidade Visual</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Escolha a identidade visual do HomeMoney. A seleção é salva imediatamente e sincronizada no seu dispositivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Tema 1: Claro */}
            <div
              onClick={() => onThemeChange && onThemeChange('light')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                currentTheme === 'light'
                  ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {currentTheme === 'light' && (
                <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Ativo</span>
                </div>
              )}

              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
                  <Sun className="w-6 h-6 text-amber-500" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Tema Claro (Padrão)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Design limpo, minimalista e com alta legibilidade em ambientes iluminados.
                </p>

                {/* Visual Preview */}
                <div className="mt-4 p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-2">
                  <div className="h-3 w-2/3 bg-slate-300 rounded-sm"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-1/2 bg-white rounded-md border border-slate-200 shadow-2xs"></div>
                    <div className="h-6 w-1/2 bg-emerald-500 rounded-md"></div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    currentTheme === 'light'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {currentTheme === 'light' ? 'Tema Ativo' : 'Ativar Tema Claro'}
                </button>
              </div>
            </div>

            {/* Tema 2: Escuro */}
            <div
              onClick={() => onThemeChange && onThemeChange('dark')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                currentTheme === 'dark'
                  ? 'border-emerald-500 bg-slate-900 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {currentTheme === 'dark' && (
                <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Ativo</span>
                </div>
              )}

              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
                  <Moon className="w-6 h-6 text-indigo-400" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Tema Escuro (Dark Mode)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Cores escuras confortáveis para uso noturno com alto contraste em tons esmeralda.
                </p>

                {/* Visual Preview */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="h-3 w-2/3 bg-slate-800 rounded-sm"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-1/2 bg-slate-900 rounded-md border border-slate-800"></div>
                    <div className="h-6 w-1/2 bg-emerald-500 rounded-md"></div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {currentTheme === 'dark' ? 'Tema Ativo' : 'Ativar Tema Escuro'}
                </button>
              </div>
            </div>

            {/* Tema 3: Windows 7 / Frutiger Aero */}
            <div
              onClick={() => onThemeChange && onThemeChange('aero')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between relative group overflow-hidden ${
                currentTheme === 'aero'
                  ? 'border-sky-400 bg-gradient-to-br from-sky-100/90 via-emerald-100/70 to-blue-200/90 shadow-xl shadow-sky-500/20 ring-2 ring-sky-400/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 hover:border-sky-300 dark:hover:border-sky-700'
              }`}
            >
              {/* Glossy shine highlight overlay */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-3xl"></div>

              {currentTheme === 'aero' && (
                <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-b from-sky-400 to-sky-600 text-white text-[10px] font-bold shadow-md border border-sky-300">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Ativo</span>
                </div>
              )}

              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2a7acc] to-[#0d3870] flex items-center justify-center text-white mb-4 shadow-md border border-sky-300/60">
                  <Sparkles className="w-6 h-6 text-sky-200 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Windows 7 (Frutiger Aero)</h4>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                    AERO
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Estética fiel ao Windows 7: desktop azul royal Harmony com auroras, molduras Aero Glass em vidro ciano translúcido e janelas brancas nítidas.
                </p>

                {/* Visual Preview: Miniature Windows 7 Desktop with Aero Window & Taskbar */}
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-b from-[#1b5fa8] via-[#104380] to-[#082650] border border-sky-300/40 shadow-inner space-y-2 relative overflow-hidden">
                  {/* Subtle Aurora light glow */}
                  <div className="absolute inset-0 bg-radial from-sky-400/20 via-transparent to-transparent pointer-events-none"></div>

                  {/* Miniature Aero Glass Window */}
                  <div className="rounded-lg border border-white/80 bg-sky-200/50 backdrop-blur-md shadow-lg p-1 space-y-1 relative z-10">
                    {/* Window Titlebar */}
                    <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-sky-300/60">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-400 border border-white"></span>
                        <span className="text-[9px] font-bold text-slate-900 drop-shadow-xs">Painel de Controle</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-2.5 h-1.5 rounded-2xs bg-white/60"></span>
                        <span className="w-2.5 h-1.5 rounded-2xs bg-white/60"></span>
                        <span className="w-3 h-1.5 rounded-2xs bg-red-600 text-[6px] text-white flex items-center justify-center font-bold">✕</span>
                      </div>
                    </div>
                    {/* Window Content Body (White like reference image) */}
                    <div className="bg-white rounded-xs p-1.5 shadow-2xs space-y-1">
                      <div className="h-1.5 w-1/2 bg-sky-100 rounded-xs"></div>
                      <div className="flex gap-1.5">
                        <div className="h-4 w-1/3 bg-slate-50 border border-slate-200 rounded-xs"></div>
                        <div className="h-4 w-1/3 bg-slate-50 border border-slate-200 rounded-xs"></div>
                        <div className="h-4 w-1/3 bg-slate-50 border border-slate-200 rounded-xs"></div>
                      </div>
                    </div>
                  </div>

                  {/* Miniature Windows 7 Taskbar */}
                  <div className="h-4 rounded-md bg-gradient-to-b from-[#1c4d85]/90 to-[#0c2a52]/95 border border-white/30 backdrop-blur-sm flex items-center justify-between px-1.5 z-10 relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-300 border border-white shadow-xs"></div>
                    <div className="flex gap-1">
                      <div className="w-3 h-2 rounded-2xs bg-white/30"></div>
                      <div className="w-3 h-2 rounded-2xs bg-sky-400/60"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-sky-200/80 dark:border-slate-800">
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    currentTheme === 'aero'
                      ? 'bg-gradient-to-b from-sky-400 to-sky-600 text-white border border-sky-300 shadow-md'
                      : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border border-sky-500/30'
                  }`}
                >
                  {currentTheme === 'aero' ? 'Tema Ativo' : 'Ativar Windows 7 Aero'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
