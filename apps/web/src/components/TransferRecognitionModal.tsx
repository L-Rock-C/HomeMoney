'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
  User,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { TransferNotificationItem, respondToTransfer } from '../lib/api';
import { Checkbox, SelectDropdown } from './ui/FormControls';

interface TransferRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingTransfers: TransferNotificationItem[];
  accounts: any[];
  formatBRL: (val: number) => string;
}

export function TransferRecognitionModal({
  isOpen,
  onClose,
  onSuccess,
  pendingTransfers,
  accounts,
  formatBRL,
}: TransferRecognitionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoRegister, setAutoRegister] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [targetType, setTargetType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [loadingAction, setLoadingAction] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Set default account when accounts change
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAcc = accounts.find((a) => !a.isArchived) || accounts[0];
      if (defaultAcc) setSelectedAccountId(defaultAcc.id);
    }
  }, [accounts, selectedAccountId]);

  // Adjust index if out of bounds
  useEffect(() => {
    if (currentIndex >= pendingTransfers.length && pendingTransfers.length > 0) {
      setCurrentIndex(pendingTransfers.length - 1);
    }
  }, [pendingTransfers.length, currentIndex]);

  if (!isOpen || pendingTransfers.length === 0) return null;

  const currentItem = pendingTransfers[currentIndex] || pendingTransfers[0];
  if (!currentItem) return null;

  const totalItems = pendingTransfers.length;

  const handleResponse = async (action: 'ACCEPT' | 'REJECT') => {
    try {
      setLoadingAction(action);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        action,
        accountId: autoRegister && action === 'ACCEPT' ? selectedAccountId : undefined,
        targetType: autoRegister && action === 'ACCEPT' ? targetType : undefined,
      };

      await respondToTransfer(currentItem.id, payload);

      setSuccessMsg(
        action === 'ACCEPT'
          ? 'Transferência aceita e confirmada com sucesso!'
          : 'Transferência recusada.'
      );

      setTimeout(() => {
        setSuccessMsg(null);
        setLoadingAction(null);
        onSuccess();
        if (totalItems <= 1) {
          onClose();
        } else {
          setCurrentIndex((prev) => Math.min(prev, totalItems - 2));
        }
      }, 1000);
    } catch (err: any) {
      setLoadingAction(null);
      setErrorMsg(err.message || 'Erro ao processar resposta');
    }
  };

  const accountOptions = accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({
      value: a.id,
      label: `${a.name} (${formatBRL(a.balance ?? a.initialBalance ?? 0)})`,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header com gradiente */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <HandCoins className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Reconhecer Transferência
                {totalItems > 1 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {currentIndex + 1} de {totalItems}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Um contato vinculado registrou uma movimentação com você
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loadingAction !== null}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com detalhes */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Alertas */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Card Principal da Transferência */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
            {/* Quem enviou */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                  {(currentItem.sender?.name || 'C').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">De</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentItem.sender?.name || 'Contato Vinculado'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {currentItem.type === 'REIMBURSEMENT'
                    ? 'Reembolso'
                    : currentItem.type === 'SETTLEMENT'
                    ? 'Acerto de Contas'
                    : currentItem.type === 'INCOME'
                    ? 'Receita'
                    : 'Despesa'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {new Date(currentItem.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Destaque do Valor & Descrição */}
            <div className="text-center py-2 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Valor Informado
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatBRL(currentItem.amount)}
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 pt-1">
                &ldquo;{currentItem.description}&rdquo;
              </p>
              {currentItem.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Nota: {currentItem.notes}
                </p>
              )}
            </div>

            {/* Metadados adicionais */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Forma: {currentItem.paymentMethod || 'Pix'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data: {new Date(currentItem.date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Seção de Conciliação Automática no Extrato */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3.5">
            <Checkbox
              checked={autoRegister}
              onChange={setAutoRegister}
              label="Registrar automaticamente no meu extrato"
              description="Cria o lançamento confirmado na sua carteira escolhida ao aceitar."
            />

            {autoRegister && (
              <div className="space-y-3 pt-2 border-t border-emerald-500/20 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Carteira / Conta de Destino
                  </label>
                  <SelectDropdown
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    options={accountOptions}
                    placeholder="Selecione onde registrar..."
                    leftIcon={<Wallet className="w-4 h-4 text-emerald-500" />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tipo no seu extrato
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('INCOME')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        targetType === 'INCOME'
                          ? 'bg-emerald-500 text-white dark:text-slate-950 border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Receita (Recebido)
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('EXPENSE')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        targetType === 'EXPENSE'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-rose-500/50'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      Despesa (Gasto)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navegação entre itens se houver mais de um */}
          {totalItems > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
              <button
                type="button"
                disabled={currentIndex === 0 || loadingAction !== null}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span>
                {currentIndex + 1} de {totalItems}
              </span>
              <button
                type="button"
                disabled={currentIndex === totalItems - 1 || loadingAction !== null}
                onClick={() => setCurrentIndex((prev) => Math.min(totalItems - 1, prev + 1))}
                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé de Ações: Aceitar ou Negar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => handleResponse('REJECT')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'REJECT' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            <span>Negar Transferência</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
            >
              Depois
            </button>

            <button
              type="button"
              disabled={loadingAction !== null || (autoRegister && !selectedAccountId)}
              onClick={() => handleResponse('ACCEPT')}
              className="w-1/2 sm:w-auto flex-1 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingAction === 'ACCEPT' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Aceitar e Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
