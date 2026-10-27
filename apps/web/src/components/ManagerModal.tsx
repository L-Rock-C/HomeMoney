'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  CreditCard,
  Plus,
  Trash2,
  X,
  Edit2,
  Check,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
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

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  paymentMethods: any[];
  onRefreshData: () => void;
  initialSection?: 'CATEGORIES' | 'PAYMENTS';
}

export function ManagerModal({
  isOpen,
  onClose,
  categories,
  paymentMethods,
  onRefreshData,
  initialSection = 'CATEGORIES',
}: ManagerModalProps) {
  const [activeSection, setActiveSection] = useState<'CATEGORIES' | 'PAYMENTS'>(initialSection);

  // Refresh data when modal opens
  useEffect(() => {
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
  const [newMethodName, setNewMethodName] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleSwitchSection(section: 'CATEGORIES' | 'PAYMENTS') {
    setActiveSection(section);
    setError(null);
    setSuccessMessage(null);
    setEditingId(null);
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
      setSuccessMessage('Categoria criada com sucesso!');
      onRefreshData();
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
      setSuccessMessage('Categoria atualizada!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar categoria');
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
      setSuccessMessage('Método de pagamento adicionado!');
      onRefreshData();
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
      setSuccessMessage('Método de pagamento atualizado!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar método');
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
      setSuccessMessage('Método de pagamento removido!');
      onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir método de pagamento');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              Gerenciador de Cadastros
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalize categorias de receitas/despesas e métodos de pagamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs (only Categories & Payment Methods) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 px-3 sm:px-6 gap-2">
          <button
            onClick={() => handleSwitchSection('CATEGORIES')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeSection === 'CATEGORIES'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            Categorias ({categories.length})
          </button>

          <button
            onClick={() => handleSwitchSection('PAYMENTS')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeSection === 'PAYMENTS'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Métodos de Pagamento ({paymentMethods.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: CATEGORIES */}
          {/* ========================================================================= */}
          {activeSection === 'CATEGORIES' && (
            <div className="space-y-4">
              {/* Add Category Form */}
              <form onSubmit={handleAddCategory} className="p-4 bg-slate-50/80 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1">
                    <TextInput
                      label="Nome da Categoria"
                      required
                      placeholder="Ex: Supermercado, Lazer, Salário, Saúde..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-4 pb-1 sm:pb-0">
                    <Checkbox
                      label="É Receita?"
                      checked={newCatIsIncome}
                      onChange={(val) => setNewCatIsIncome(val)}
                      className="whitespace-nowrap"
                    />

                    <button
                      type="submit"
                      disabled={loading || !newCatName.trim()}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" /> Adicionar
                    </button>
                  </div>
                </div>
              </form>

              {/* Categories List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    {editingId === c.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-emerald-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(c.id)}
                          className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-400"
                          title="Salvar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              c.isIncome
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {c.isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
                          {c.isIncome && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              Receita
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(c.id);
                              setEditName(c.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Editar nome"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: PAYMENT METHODS */}
          {/* ========================================================================= */}
          {activeSection === 'PAYMENTS' && (
            <div className="space-y-4">
              {/* Add Payment Method Form */}
              <form onSubmit={handleAddPaymentMethod} className="p-4 bg-slate-50/80 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-end gap-3">
                <div className="flex-1">
                  <TextInput
                    label="Novo Método de Pagamento"
                    required
                    placeholder="Ex: Cartão Nubank, VR Refeição, Pix..."
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newMethodName.trim()}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Adicionar
                </button>
              </form>

              {/* Payment Methods List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {paymentMethods.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-emerald-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditMethod(m.id)}
                          className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-400"
                          title="Salvar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(m.id);
                              setEditName(m.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Editar nome"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePaymentMethod(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
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
