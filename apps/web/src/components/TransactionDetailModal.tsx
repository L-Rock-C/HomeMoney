'use client';

import React from 'react';
import {
  X,
  Calendar,
  CreditCard,
  Wallet,
  Tag,
  User,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Repeat,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
  formatBRL: (val: number) => string;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
  onTogglePaid,
  formatBRL,
}: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'INCOME';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isIncome ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Detalhes da Transação
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Card de Valor & Status */}
          <div
            className={`p-5 rounded-2xl border text-center space-y-2.5 ${
              isIncome
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isIncome ? 'Receita' : transaction.type === 'REIMBURSEMENT' ? 'Reembolso' : 'Despesa'}
              </span>
              <button
                type="button"
                onClick={() => onTogglePaid(transaction.id)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer ${
                  transaction.paid
                    ? 'bg-emerald-500 text-white dark:text-slate-950'
                    : 'bg-amber-500 text-white dark:text-slate-950'
                }`}
                title="Clique para alternar status"
              >
                {transaction.paid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" /> Pendente
                  </>
                )}
              </button>
            </div>

            <div
              className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {isIncome ? '+' : '-'} {formatBRL(transaction.amount)}
            </div>

            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {transaction.description}
            </h4>

            {transaction.totalInstallments && transaction.totalInstallments > 1 && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                <Repeat className="w-3 h-3" />
                Parcela {transaction.currentInstallment} de {transaction.totalInstallments}
              </span>
            )}
          </div>

          {/* Grid de Metadados */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Categoria */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Tag className="w-3.5 h-3.5" /> Categoria
              </span>
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {transaction.category?.name || 'Geral'}
              </p>
            </div>

            {/* Carteira */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Wallet className="w-3.5 h-3.5" /> Conta / Carteira
              </span>
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {transaction.account?.name || 'Principal'}
              </p>
            </div>

            {/* Vencimento */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" /> Data de Vencimento
              </span>
              <p className="font-bold text-slate-900 dark:text-white">
                {transaction.dueDate}
              </p>
            </div>

            {/* Forma de Pagamento */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <CreditCard className="w-3.5 h-3.5" /> Método
              </span>
              <p className="font-bold text-slate-900 dark:text-white">
                {transaction.paymentMethod || 'Pix'}
              </p>
            </div>

            {/* Terceiro / Contato (se houver) */}
            {transaction.person && (
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5" /> Contato Vinculado
                </span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {transaction.person.name}
                </p>
              </div>
            )}

            {/* Observações */}
            {transaction.notes && (
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <FileText className="w-3.5 h-3.5" /> Observações
                </span>
                <p className="font-medium text-slate-700 dark:text-slate-300 italic">
                  {transaction.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(transaction.id);
            }}
            className="px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
