'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Clock,
  History,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import {
  BankNotification,
  getStoredNotifications,
  restoreNotification,
  clearDismissedHistory,
  dismissNotification,
  getAndroidBridgeStatus,
  openAndroidNotificationSettings,
  AndroidBridgeStatus,
} from '../lib/bankNotificationService';

interface NotificationHistoryViewProps {
  onOpenReconciliation: () => void;
  onQueueUpdated: () => void;
}

export function NotificationHistoryView({
  onOpenReconciliation,
  onQueueUpdated,
}: NotificationHistoryViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'DISMISSED' | 'PENDING' | 'RECONCILED'>('DISMISSED');
  const [androidStatus, setAndroidStatus] = useState<AndroidBridgeStatus>({
    isAvailable: false,
    isPermissionGranted: false,
  });

  const allNotifications = getStoredNotifications();
  const pendingList = allNotifications.filter((n) => n.status === 'PENDING');
  const dismissedList = allNotifications.filter((n) => n.status === 'DISMISSED');
  const reconciledList = allNotifications.filter((n) => n.status === 'RECONCILED');

  useEffect(() => {
    const checkStatus = () => setAndroidStatus(getAndroidBridgeStatus());
    checkStatus();

    window.addEventListener('focus', checkStatus);
    window.addEventListener('visibilitychange', checkStatus);
    return () => {
      window.removeEventListener('focus', checkStatus);
      window.removeEventListener('visibilitychange', checkStatus);
    };
  }, []);

  const handleRestore = (id: string) => {
    restoreNotification(id);
    onQueueUpdated();
  };

  const handleDismiss = (id: string) => {
    dismissNotification(id);
    onQueueUpdated();
  };

  const handleClearDismissed = () => {
    if (confirm('Deseja limpar todo o histórico de notificações dispensadas?')) {
      clearDismissedHistory();
      onQueueUpdated();
    }
  };

  const currentList =
    activeSubTab === 'DISMISSED'
      ? dismissedList
      : activeSubTab === 'PENDING'
      ? pendingList
      : reconciledList;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header da Tela */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Histórico & Sugestões Bancárias
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie notificações capturadas pelo monitor de bancos, concilie registros ou restaure transferências dispensadas.
            </p>
          </div>
        </div>

        {pendingList.length > 0 && (
          <button
            onClick={onOpenReconciliation}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Conciliar Fila ({pendingList.length})
          </button>
        )}
      </div>

      {/* Android Bridge Status Banner */}
      {androidStatus.isAvailable && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            androidStatus.isPermissionGranted
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                androidStatus.isPermissionGranted
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              {androidStatus.isPermissionGranted ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold">
                {androidStatus.isPermissionGranted
                  ? 'Monitor de Notificações Bancárias Ativo'
                  : 'Acesso a Notificações Necessário'}
              </p>
              <p className="text-[11px] opacity-80">
                {androidStatus.isPermissionGranted
                  ? 'Nubank, BB, Caixa, Bradesco, Santander e Inter monitorados automaticamente.'
                  : 'Autorize o HomeMoney nas configurações do sistema para detectar Pix e transferências.'}
              </p>
            </div>
          </div>

          {!androidStatus.isPermissionGranted && (
            <button
              onClick={openAndroidNotificationSettings}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Autorizar Acesso
            </button>
          )}
        </div>
      )}

      {/* KPI Cards das Notificações */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          onClick={() => setActiveSubTab('DISMISSED')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            activeSubTab === 'DISMISSED'
              ? 'bg-violet-500/10 border-violet-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Dispensadas
            </span>
            <RotateCcw className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {dismissedList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sugestões ignoradas que podem ser restauradas
          </p>
        </button>

        <button
          onClick={() => setActiveSubTab('PENDING')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            activeSubTab === 'PENDING'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pendentes na Fila
            </span>
            <Bell className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {pendingList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Aguardando conciliação no app
          </p>
        </button>

        <button
          onClick={() => setActiveSubTab('RECONCILED')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            activeSubTab === 'RECONCILED'
              ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Conciliadas
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">
            {reconciledList.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Lançadas com sucesso no financeiro
          </p>
        </button>
      </div>

      {/* Lista Principal */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {activeSubTab === 'DISMISSED' && 'Notificações Dispensadas'}
              {activeSubTab === 'PENDING' && 'Fila de Sugestões Pendentes'}
              {activeSubTab === 'RECONCILED' && 'Histórico de Conciliações'}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {currentList.length}
            </span>
          </div>

          {activeSubTab === 'DISMISSED' && dismissedList.length > 0 && (
            <button
              onClick={handleClearDismissed}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Dispensadas
            </button>
          )}

          {activeSubTab === 'PENDING' && pendingList.length > 0 && (
            <button
              onClick={onOpenReconciliation}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Abrir Conciliação <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {currentList.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum registro encontrado
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {activeSubTab === 'DISMISSED' && 'Você não possui notificações dispensadas no momento.'}
                {activeSubTab === 'PENDING' && 'Não há sugestões pendentes na fila.'}
                {activeSubTab === 'RECONCILED' && 'Nenhuma transferência foi conciliada ainda.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: item.bankColor }}
                  >
                    {item.bank.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: item.bankColor }}
                      >
                        {item.bank}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.paymentMethod}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.date} às {item.time}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {item.targetOrSource}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 font-mono text-[11px]">
                      {item.rawText}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      {item.type === 'INCOME' ? 'Recebimento' : 'Pagamento'}
                    </span>
                    <span
                      className={`text-base font-bold flex items-center gap-0.5 sm:justify-end ${
                        item.type === 'INCOME'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.type === 'INCOME' ? (
                        <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-rose-500" />
                      )}
                      R$ {item.formattedAmount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSubTab === 'DISMISSED' && (
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="px-3 py-1.5 rounded-xl border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        title="Restaurar de volta para a fila pendente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar
                      </button>
                    )}

                    {activeSubTab === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleDismiss(item.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-medium transition cursor-pointer"
                          title="Dispensar sugestão"
                        >
                          Dispensar
                        </button>
                        <button
                          onClick={onOpenReconciliation}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Conciliar
                        </button>
                      </>
                    )}

                    {activeSubTab === 'RECONCILED' && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lançado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
