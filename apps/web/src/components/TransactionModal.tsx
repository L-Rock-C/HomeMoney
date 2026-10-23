'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  DollarSign,
  CreditCard,
  Tag,
  User,
  Layers,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Repeat,
  Wallet,
  Edit3,
} from 'lucide-react';
import {
  createTransaction,
  updateTransaction,
  createCategory,
  createPerson,
  createAccount,
} from '../lib/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: any[];
  categories: any[];
  people: any[];
  paymentMethods?: any[];
  defaultMonth?: string;
  transactionToEdit?: any | null;
  onReloadAuxiliaryData?: () => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  people,
  paymentMethods = [],
  defaultMonth,
  transactionToEdit,
  onReloadAuxiliaryData,
}: TransactionModalProps) {
  const isEditing = Boolean(transactionToEdit);
  const today = new Date().toISOString().split('T')[0];
  const initialDueDate = defaultMonth ? `${defaultMonth}-05` : today;

  // Form states
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'REIMBURSEMENT'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Crédito');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [personId, setPersonId] = useState('');
  const [totalInstallments, setTotalInstallments] = useState<number | string>(1);
  const [notes, setNotes] = useState('');

  // Quick Add states
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showQuickPerson, setShowQuickPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [showQuickAccount, setShowQuickAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('CHECKING');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type || 'EXPENSE');
      setDescription(transactionToEdit.description || '');
      setAmount(String(transactionToEdit.amount || ''));
      setPurchaseDate(transactionToEdit.purchaseDate?.slice(0, 10) || today);
      setDueDate(transactionToEdit.dueDate?.slice(0, 10) || initialDueDate);
      setPaid(Boolean(transactionToEdit.paid));
      setPaymentMethod(transactionToEdit.paymentMethod || 'Crédito');
      setAccountId(transactionToEdit.accountId || accounts[0]?.id || '');
      setCategoryId(transactionToEdit.categoryId || categories[0]?.id || '');
      setPersonId(transactionToEdit.personId || '');
      setTotalInstallments(transactionToEdit.totalInstallments || 1);
      setNotes(transactionToEdit.notes || '');
    } else {
      setType('EXPENSE');
      setDescription('');
      setAmount('');
      setPurchaseDate(today);
      setDueDate(initialDueDate);
      setPaid(false);
      setPaymentMethod('Crédito');
      setAccountId(accounts[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setPersonId('');
      setTotalInstallments(1);
      setNotes('');
    }
    setError(null);
    setShowQuickCategory(false);
    setShowQuickPerson(false);
    setShowQuickAccount(false);
  }, [transactionToEdit, isOpen]);

  if (!isOpen) return null;

  // Inline Quick Add Handlers
  async function handleQuickAddCategory(e: React.MouseEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const created = await createCategory({ name: newCategoryName.trim() });
      if (onReloadAuxiliaryData) onReloadAuxiliaryData();
      setCategoryId(created.id);
      setNewCategoryName('');
      setShowQuickCategory(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao adicionar categoria rápida');
    }
  }

  async function handleQuickAddPerson(e: React.MouseEvent) {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    try {
      const created = await createPerson({ name: newPersonName.trim() });
      if (onReloadAuxiliaryData) onReloadAuxiliaryData();
      setPersonId(created.id);
      setNewPersonName('');
      setShowQuickPerson(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao adicionar contato rápido');
    }
  }

  async function handleQuickAddAccount(e: React.MouseEvent) {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      const created = await createAccount({ name: newAccountName.trim(), type: newAccountType });
      if (onReloadAuxiliaryData) onReloadAuxiliaryData();
      setAccountId(created.id);
      setNewAccountName('');
      setShowQuickAccount(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao adicionar carteira rápida');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero');
      }

      const installmentsNum = Math.max(1, parseInt(String(totalInstallments), 10) || 1);

      if (isEditing && transactionToEdit) {
        await updateTransaction(transactionToEdit.id, {
          description,
          amount: numAmount,
          type,
          purchaseDate,
          dueDate,
          paid,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          categoryId: categoryId || categories[0]?.id,
          personId: personId || null,
          notes: notes || null,
        });
      } else {
        await createTransaction({
          description,
          amount: numAmount,
          type,
          purchaseDate,
          dueDate,
          paid,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          categoryId: categoryId || categories[0]?.id,
          personId: personId || null,
          totalInstallments: installmentsNum,
          notes: notes || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  }

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const installmentsNum = Math.max(1, parseInt(String(totalInstallments), 10) || 1);
  const installmentPreview = installmentsNum > 1 && numAmount > 0 ? (numAmount / installmentsNum).toFixed(2).replace('.', ',') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Editar Transação' : 'Nova Transação'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  type === 'EXPENSE'
                    ? 'bg-white dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-slate-200 dark:border-rose-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  type === 'INCOME'
                    ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                Receita
              </button>
              <button
                type="button"
                onClick={() => setType('REIMBURSEMENT')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  type === 'REIMBURSEMENT'
                    ? 'bg-white dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-amber-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Repeat className="w-4 h-4 text-amber-500" />
                A Reembolsar
              </button>
            </div>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Descrição
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Almoço de Domingo, Revisão Moto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Valor Total (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Data da Compra
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Data de Vencimento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Category & Carteira/Conta with Quick Add */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Category with Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCategory(!showQuickCategory)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Nova
                </button>
              </div>

              {showQuickCategory ? (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white dark:text-slate-950 rounded-lg"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategory(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Carteira / Poupança with Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  Carteira / Poupança
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAccount(!showQuickAccount)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Nova
                </button>
              </div>

              {showQuickAccount ? (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Nome da carteira..."
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value)}
                    className="px-1.5 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    <option value="CHECKING">Principal</option>
                    <option value="SAVINGS">Poupança</option>
                    <option value="WALLET">Carteira</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleQuickAddAccount}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white dark:text-slate-950 rounded-lg"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickAccount(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type === 'SAVINGS' ? 'Poupança/Caixinha' : a.type === 'CHECKING' ? 'Principal' : 'Carteira'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Contact / Person (with Quick Add) & Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Person with Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Terceiro / Contato
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickPerson(!showQuickPerson)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Novo
                </button>
              </div>

              {showQuickPerson ? (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Nome do contato..."
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddPerson}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white dark:text-slate-950 rounded-lg"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickPerson(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="">Nenhum (Despesa própria de Lucas)</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                Método de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Crédito">Crédito</option>
                    <option value="Pix">Pix</option>
                    <option value="Débito">Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix Crédito">Pix Crédito</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Parcelamento Livre & Status Pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Número de Parcelas
                </span>
                {installmentPreview && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {installmentsNum}x de R$ {installmentPreview}
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                max="99"
                disabled={isEditing}
                placeholder="1 (À vista) ou qualquer valor (ex: 7, 18, 36)"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />
              {isEditing && (
                <p className="text-[10px] text-slate-400 mt-0.5">O parcelamento já foi gerado.</p>
              )}
            </div>
            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Já está liquidado/pago?
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Adiantamento para o Pai, comprado na promoção..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Transação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
