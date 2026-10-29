'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  CreditCard,
  Tag,
  Wallet,
  Repeat,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Tv,
  Music,
  ShoppingBag,
  Bot,
  Dumbbell,
  Wifi,
  Briefcase,
  Home,
} from 'lucide-react';
import { createRecurringTransaction, updateRecurringTransaction } from '../lib/api';
import { parseBRLAmount } from '../lib/bankNotificationService';
import { TextInput, CurrencyInput, Checkbox, SelectDropdown } from './ui/FormControls';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: any[];
  categories: any[];
  paymentMethods?: any[];
  recurringToEdit?: any | null;
}

const PRESETS = [
  {
    name: 'Netflix',
    type: 'EXPENSE',
    amount: '55,90',
    icon: Tv,
    day: 15,
    method: 'Crédito',
    categoryMatch: ['streaming', 'assinatura', 'lazer'],
  },
  {
    name: 'Spotify',
    type: 'EXPENSE',
    amount: '21,90',
    icon: Music,
    day: 10,
    method: 'Crédito',
    categoryMatch: ['streaming', 'música', 'assinatura', 'lazer'],
  },
  {
    name: 'Amazon Prime',
    type: 'EXPENSE',
    amount: '19,90',
    icon: ShoppingBag,
    day: 12,
    method: 'Crédito',
    categoryMatch: ['streaming', 'assinatura', 'lazer'],
  },
  {
    name: 'ChatGPT Plus',
    type: 'EXPENSE',
    amount: '115,00',
    icon: Bot,
    day: 20,
    method: 'Crédito',
    categoryMatch: ['software', 'tecnologia', 'assinatura'],
  },
  {
    name: 'Academia',
    type: 'EXPENSE',
    amount: '119,90',
    icon: Dumbbell,
    day: 5,
    method: 'Crédito',
    categoryMatch: ['saúde', 'academia', 'exercício', 'lazer'],
  },
  {
    name: 'Internet Fibra',
    type: 'EXPENSE',
    amount: '129,90',
    icon: Wifi,
    day: 10,
    method: 'Débito Automático',
    categoryMatch: ['moradia', 'contas', 'internet'],
  },
  {
    name: 'Salário',
    type: 'INCOME',
    amount: '',
    icon: Briefcase,
    day: 5,
    method: 'Pix',
    categoryMatch: ['salário', 'renda', 'receita', 'bolsa'],
  },
  {
    name: 'Aluguel / Condomínio',
    type: 'EXPENSE',
    amount: '',
    icon: Home,
    day: 10,
    method: 'Pix',
    categoryMatch: ['moradia', 'habitação', 'contas'],
  },
];

export function RecurringModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  paymentMethods = [],
  recurringToEdit,
}: RecurringModalProps) {
  const isEditing = Boolean(recurringToEdit);

  // Form states
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState('Crédito');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form on edit
  useEffect(() => {
    if (recurringToEdit) {
      setType(recurringToEdit.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setDescription(recurringToEdit.description || '');
      setAmount(
        recurringToEdit.amount
          ? recurringToEdit.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          : ''
      );
      setRecurrenceDay(recurringToEdit.recurrenceDay || 5);
      setPaymentMethod(recurringToEdit.paymentMethod || 'Crédito');
      setAccountId(recurringToEdit.accountId || accounts[0]?.id || '');
      setCategoryId(recurringToEdit.categoryId || categories[0]?.id || '');
      setAutoGenerate(recurringToEdit.autoGenerate !== false);
      setNotes(recurringToEdit.notes || '');
    } else {
      // Default reset
      setType('EXPENSE');
      setDescription('');
      setAmount('');
      setRecurrenceDay(5);
      setPaymentMethod('Crédito');
      setAccountId(accounts[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setAutoGenerate(true);
      setNotes('');
    }
    setError(null);
  }, [recurringToEdit, isOpen, accounts, categories]);

  if (!isOpen) return null;

  // Filtra categorias apropriadas para o tipo
  const filteredCategories = categories.filter((c) => {
    if (type === 'INCOME') return c.isIncome;
    return !c.isIncome;
  });

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setType(preset.type as 'EXPENSE' | 'INCOME');
    setDescription(preset.name);
    if (preset.amount) {
      setAmount(preset.amount);
    }
    setRecurrenceDay(preset.day);
    setPaymentMethod(preset.method);

    // Tenta encontrar uma categoria compatível
    const matchingCat = categories.find((c) => {
      const cName = c.name.toLowerCase();
      return preset.categoryMatch.some((m) => cName.includes(m));
    });
    if (matchingCat) {
      setCategoryId(matchingCat.id);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numAmount = parseBRLAmount(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero');
      }

      const day = Math.min(31, Math.max(1, recurrenceDay || 1));

      if (isEditing && recurringToEdit) {
        await updateRecurringTransaction(recurringToEdit.id, {
          description,
          amount: numAmount,
          type,
          frequency: 'MONTHLY',
          recurrenceDay: day,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          categoryId: categoryId || filteredCategories[0]?.id || categories[0]?.id,
          autoGenerate,
          notes: notes || null,
        });
      } else {
        await createRecurringTransaction({
          description,
          amount: numAmount,
          type,
          frequency: 'MONTHLY',
          recurrenceDay: day,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          categoryId: categoryId || filteredCategories[0]?.id || categories[0]?.id,
          autoGenerate,
          notes: notes || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar recorrência');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Repeat className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Editar Recorrência / Assinatura' : 'Nova Assinatura ou Fixo'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lançamento automático todo mês (Salário, Streaming, Contas)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets (Apenas ao criar) */}
        {!isEditing && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets Rápidos
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-purple-500/50 hover:bg-purple-500/10 text-xs font-semibold text-slate-700 dark:text-slate-300 transition shrink-0 cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-purple-500" />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Toggle Type: Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                const firstExp = categories.find((c) => !c.isIncome);
                if (firstExp) setCategoryId(firstExp.id);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                type === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" /> Despesa / Assinatura
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                const firstInc = categories.find((c) => c.isIncome);
                if (firstInc) setCategoryId(firstInc.id);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Receita Fixa (Salário)
            </button>
          </div>

          {/* Descrição & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Nome do Serviço / Receita"
              placeholder="ex: Netflix, Salário, Internet"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <CurrencyInput
              label="Valor Mensal"
              placeholder="0,00"
              value={amount}
              onChange={(val) => setAmount(val)}
              required
            />
          </div>

          {/* Dia de Vencimento & Carteira */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Dia de Cobrança / Recebimento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={recurrenceDay}
                  onChange={(e) => setRecurrenceDay(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-2 text-sm font-bold text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Todo dia <strong>{recurrenceDay}</strong> de cada mês
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {type === 'INCOME' ? 'Carteira de Destino' : 'Carteira / Cartão de Débito'}
              </label>
              <SelectDropdown
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                leftIcon={<Wallet className="w-4 h-4 text-slate-400" />}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </SelectDropdown>
            </div>
          </div>

          {/* Categoria & Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoria
              </label>
              <SelectDropdown
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                leftIcon={<Tag className="w-4 h-4 text-slate-400" />}
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </SelectDropdown>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Forma de Pagamento
              </label>
              <SelectDropdown
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
              >
                <option value="Crédito">Cartão de Crédito</option>
                <option value="Débito Automático">Débito Automático / Conta</option>
                <option value="Pix">Pix</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Outro">Outro</option>
              </SelectDropdown>
            </div>
          </div>

          {/* Auto generate checkbox */}
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <Checkbox
              label="Projetar e gerar automaticamente nos meses"
              checked={autoGenerate}
              onChange={(val) => setAutoGenerate(val)}
              description="Cria o lançamento como pendente no mês para você confirmar com 1 toque."
            />
          </div>

          {/* Notas */}
          <TextInput
            label="Observações (Opcional)"
            placeholder="ex: Plano Família, contrato de 12 meses..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Atualizar Recorrência' : 'Cadastrar Recorrência'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
