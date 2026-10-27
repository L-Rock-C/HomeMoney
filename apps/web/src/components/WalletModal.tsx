'use client';

import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  X,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import { createAccount, updateAccount, deleteAccount } from '../lib/api';
import { parseBRLAmount } from '../lib/bankNotificationService';
import { TextInput, CurrencyInput } from './ui/FormControls';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletToEdit?: any | null;
}

const WALLET_TYPES = [
  {
    type: 'SAVINGS',
    label: 'Poupança / Caixinha',
    icon: PiggyBank,
    description: 'Reservas, metas e rendimento',
    color: '#10B981',
  },
  {
    type: 'CHECKING',
    label: 'Conta Corrente',
    icon: CreditCard,
    description: 'Banco do dia a dia, movimentação',
    color: '#06B6D4',
  },
  {
    type: 'WALLET',
    label: 'Carteira Física',
    icon: Wallet,
    description: 'Dinheiro vivo em mãos',
    color: '#F59E0B',
  },
  {
    type: 'INVESTMENT',
    label: 'Investimentos',
    icon: TrendingUp,
    description: 'Ações, CDBs e fundos',
    color: '#8B5CF6',
  },
];

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#64748B', // Slate
];

export function WalletModal({
  isOpen,
  onClose,
  onSuccess,
  walletToEdit = null,
}: WalletModalProps) {
  const isEditing = !!walletToEdit;

  const [name, setName] = useState('');
  const [type, setType] = useState('SAVINGS');
  const [initialBalance, setInitialBalance] = useState('0,00');
  const [color, setColor] = useState('#10B981');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConfirmDelete(false);
      if (walletToEdit) {
        setName(walletToEdit.name || '');
        setType(walletToEdit.type || 'SAVINGS');
        setInitialBalance(
          walletToEdit.initialBalance !== undefined
            ? Number(walletToEdit.initialBalance).toFixed(2).replace('.', ',')
            : '0,00'
        );
        setColor(walletToEdit.color || '#10B981');
      } else {
        setName('');
        setType('SAVINGS');
        setInitialBalance('0,00');
        setColor('#10B981');
      }
    }
  }, [isOpen, walletToEdit]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome da carteira ou poupança.');
      return;
    }

    const cleanBalance = parseBRLAmount(initialBalance);

    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateAccount(walletToEdit.id, {
          name: name.trim(),
          type,
          color,
          initialBalance: cleanBalance,
        });
      } else {
        await createAccount({
          name: name.trim(),
          type,
          color,
          initialBalance: cleanBalance,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar carteira.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!walletToEdit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteAccount(walletToEdit.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir carteira.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Editar Carteira / Poupança' : 'Nova Carteira / Poupança'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure os detalhes da sua conta financeira
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Nome da Carteira */}
          <TextInput
            label="Nome da Carteira ou Poupança"
            required
            placeholder="Ex: Nubank, Caixinha Reserva, Carteira Dinheiro..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="Dê um nome claro para identificar facilmente nos lançamentos."
          />

          {/* Tipo de Carteira (Interactive Cards) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tipo de Conta / Destinação <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WALLET_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setType(t.type);
                      if (!isEditing) setColor(t.color);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: isSelected ? `${t.color}25` : undefined,
                        color: t.color,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {t.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saldo Inicial */}
          <CurrencyInput
            label="Saldo Inicial Cadastrado"
            currencyPrefix="R$"
            value={initialBalance}
            onChange={(val) => setInitialBalance(val)}
            helperText="Valor já existente nesta conta antes dos lançamentos do app."
          />

          {/* Seletor de Cores */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cor de Identificação
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    color === c ? 'scale-110 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                    : 'text-rose-500 hover:bg-rose-500/10 border border-rose-500/20'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {confirmDelete ? 'Confirmar Exclusão?' : 'Excluir'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Carteira'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
