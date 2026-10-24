'use client';

import React, { useState, useEffect } from 'react';
import { X, HandCoins, CheckCircle2, Calendar, CheckSquare, Square, AlertCircle, ArrowRight } from 'lucide-react';
import { settleDebt, fetchPersonPendingTransactions } from '../lib/api';
import { SelectDropdown } from './ui/FormControls';

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  person: any | null;
  accounts: any[];
}

export function SettleModal({ isOpen, onClose, onSuccess, person, accounts }: SettleModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Editable settlement amount state
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);

  // Load itemized pending transactions when modal opens
  useEffect(() => {
    if (!person || !isOpen) {
      setPendingTransactions([]);
      setSelectedIds(new Set());
      setCustomAmount('');
      setIsManuallyEdited(false);
      return;
    }

    async function loadPending() {
      setLoadingTransactions(true);
      setError(null);
      try {
        const items = await fetchPersonPendingTransactions(person.id);
        setPendingTransactions(items);
        // Select all by default
        const allIds = new Set<string>(items.map((t: any) => t.id));
        setSelectedIds(allIds);

        // Set default editable amount to sum of all items
        const initialSum = items.reduce((sum: number, t: any) => sum + t.amount, 0);
        setCustomAmount(initialSum > 0 ? initialSum.toFixed(2).replace('.', ',') : '0,00');
        setIsManuallyEdited(false);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar transações pendentes');
      } finally {
        setLoadingTransactions(false);
      }
    }

    loadPending();
  }, [person, isOpen]);

  if (!isOpen || !person) return null;

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);

    // If user hasn't manually overridden the amount, update amount to reflect new selection
    if (!isManuallyEdited) {
      const newSum = pendingTransactions
        .filter((t) => next.has(t.id))
        .reduce((sum, t) => sum + t.amount, 0);
      setCustomAmount(newSum > 0 ? newSum.toFixed(2).replace('.', ',') : '0,00');
    }
  }

  function toggleSelectAll() {
    let next: Set<string>;
    if (selectedIds.size === pendingTransactions.length) {
      next = new Set();
    } else {
      next = new Set(pendingTransactions.map((t) => t.id));
    }
    setSelectedIds(next);

    if (!isManuallyEdited) {
      const newSum = pendingTransactions
        .filter((t) => next.has(t.id))
        .reduce((sum, t) => sum + t.amount, 0);
      setCustomAmount(newSum > 0 ? newSum.toFixed(2).replace('.', ',') : '0,00');
    }
  }

  // Calculate sum of selected items
  const selectedTotal = pendingTransactions
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  // Parse custom amount numeric value
  const parsedCustomAmount = parseFloat(customAmount.replace(/\./g, '').replace(',', '.')) || 0;

  const formatBRL = (val: number) =>
    val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  async function handleSettle(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('Selecione pelo menos uma transação para quitar');
      return;
    }

    if (parsedCustomAmount <= 0) {
      setError('Por favor, informe um valor de quitação válido maior que zero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await settleDebt(person.id, {
        accountId: accountId || accounts[0]?.id,
        amount: Math.round(parsedCustomAmount * 100) / 100,
        date,
        description: `Acerto de contas com ${person.name} (${selectedIds.size} itens quitados)`,
        transactionIds: Array.from(selectedIds),
      } as any);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar acerto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Acerto de Contas: {person.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione as despesas adiantadas por você (Lucas) que estão sendo quitadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSettle} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Itemized Transactions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Despesas Pendentes de Reembolso ({pendingTransactions.length})
              </span>
              {pendingTransactions.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  {selectedIds.size === pendingTransactions.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                </button>
              )}
            </div>

            {loadingTransactions ? (
              <div className="p-8 text-center text-xs text-slate-400">Carregando itens pendentes...</div>
            ) : pendingTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                Nenhuma despesa pendente encontrada para este contato.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 max-h-60 overflow-y-auto">
                {pendingTransactions.map((t) => {
                  const isChecked = selectedIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleSelect(t.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'bg-white dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-emerald-500">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {t.description}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Venc: {t.dueDate}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {t.category?.name}
                            </span>
                            <span>•</span>
                            <span>{t.account?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatBRL(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settlement Details */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            {/* Editable Amount and Sum Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor a Quitar / Recebido (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    required
                    value={customAmount}
                    onChange={(e) => {
                      setIsManuallyEdited(true);
                      setCustomAmount(e.target.value);
                    }}
                    placeholder="0,00"
                    className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Soma dos itens marcados:
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatBRL(selectedTotal)}
                  </span>
                  {isManuallyEdited && Math.abs(parsedCustomAmount - selectedTotal) > 0.009 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManuallyEdited(false);
                        setCustomAmount(selectedTotal.toFixed(2).replace('.', ','));
                      }}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Usar soma
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Difference Note */}
            {isManuallyEdited && Math.abs(parsedCustomAmount - selectedTotal) > 0.009 && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  O valor editado ({formatBRL(parsedCustomAmount)}) difere da soma das despesas marcadas ({formatBRL(selectedTotal)}).
                  {parsedCustomAmount < selectedTotal ? ' (Quitação parcial)' : ' (Valor com acréscimo)'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-800/80">
              <div>
                <SelectDropdown
                  label="Conta/Carteira que recebeu o dinheiro"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type === 'SAVINGS' ? 'Poupança' : a.type === 'CHECKING' ? 'Principal' : 'Carteira'})
                    </option>
                  ))}
                </SelectDropdown>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || selectedIds.size === 0 || parsedCustomAmount <= 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-40 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Liquidando...' : `Confirmar Quitação (${formatBRL(parsedCustomAmount)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
