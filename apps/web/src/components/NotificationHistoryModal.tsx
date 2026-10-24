'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Trash2,
  RotateCcw,
  Sparkles,
  X,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Send,
  Building2,
  Clock,
  History,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  BankNotification,
  getStoredNotifications,
  restoreNotification,
  clearDismissedHistory,
  addIncomingNotification,
  parseBankNotificationText,
  BANK_RULES,
  getAndroidBridgeStatus,
  openAndroidNotificationSettings,
  AndroidBridgeStatus,
} from '../lib/bankNotificationService';

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQueueUpdated: () => void;
}

export function NotificationHistoryModal({
  isOpen,
  onClose,
  onQueueUpdated,
}: NotificationHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'DISMISSED' | 'RECONCILED' | 'SIMULATOR'>('DISMISSED');
  const [simText, setSimText] = useState('');
  const [simFeedback, setSimFeedback] = useState<string | null>(null);
  const [androidStatus, setAndroidStatus] = useState<AndroidBridgeStatus>({
    isAvailable: false,
    isPermissionGranted: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    const checkStatus = () => setAndroidStatus(getAndroidBridgeStatus());
    checkStatus();

    window.addEventListener('focus', checkStatus);
    window.addEventListener('visibilitychange', checkStatus);
    return () => {
      window.removeEventListener('focus', checkStatus);
      window.removeEventListener('visibilitychange', checkStatus);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const allNotifications = getStoredNotifications();
  const dismissedList = allNotifications.filter((n) => n.status === 'DISMISSED');
  const reconciledList = allNotifications.filter((n) => n.status === 'RECONCILED');

  const handleRestore = (id: string) => {
    restoreNotification(id);
    onQueueUpdated();
  };

  const handleClearDismissed = () => {
    if (confirm('Deseja limpar todo o histórico de notificações dispensadas?')) {
      clearDismissedHistory();
      onQueueUpdated();
    }
  };

  const handleSimulateQuick = (sampleText: string, bank: BankNotification['bank']) => {
    const parsed = parseBankNotificationText(sampleText, bank);
    if (parsed) {
      addIncomingNotification(parsed);
      onQueueUpdated();
      setSimFeedback(`✅ Notificação do ${bank} adicionada à fila de conciliação com sucesso!`);
      setTimeout(() => setSimFeedback(null), 3000);
    } else {
      setSimFeedback(`❌ Não foi possível extrair dados desta mensagem.`);
      setTimeout(() => setSimFeedback(null), 3000);
    }
  };

  const handleSimulateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    const parsed = parseBankNotificationText(simText.trim());
    if (parsed) {
      addIncomingNotification(parsed);
      onQueueUpdated();
      setSimText('');
      setSimFeedback(`✅ Notificação reconhecida do ${parsed.bank} (R$ ${parsed.formattedAmount}) adicionada à fila!`);
      setTimeout(() => setSimFeedback(null), 4000);
    } else {
      setSimFeedback(`❌ Nenhum padrão dos 6 bancos foi reconhecido no texto informado.`);
      setTimeout(() => setSimFeedback(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/65 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Histórico & Notificações Bancárias
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie sugestões dispensadas e status do monitor de bancos
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

        {/* Android Native Permission Status Banner */}
        {androidStatus.isAvailable ? (
          androidStatus.isPermissionGranted ? (
            <div className="mx-4 sm:mx-6 mt-3.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    Acesso a Notificações Ativo no Celular
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Nubank, BB, Caixa, Bradesco, Santander e Inter monitorados automaticamente.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0">
                Autorizado
              </span>
            </div>
          ) : (
            <div className="mx-4 sm:mx-6 mt-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Permissão Necessária no Celular
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    O Android requer que você autorize o HomeMoney nas configurações do sistema para interceptar transferências bancárias.
                  </p>
                </div>
              </div>
              <button
                onClick={() => openAndroidNotificationSettings()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer transition hover:scale-105"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Autorizar no Android
              </button>
            </div>
          )
        ) : (
          <div className="mx-4 sm:mx-6 mt-3.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-white">Dica para o Celular (APK):</span> No Android, autorize em{' '}
              <span className="font-medium underline">Configurações &gt; Apps &gt; Acesso especial &gt; Acesso a notificações &gt; HomeMoney</span>. No navegador/PC, teste abaixo no <span className="font-semibold text-emerald-600 dark:text-emerald-400">Simulador de Bancos</span>.
            </p>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 px-4 sm:px-6 gap-2 mt-2">
          <button
            onClick={() => setActiveTab('DISMISSED')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'DISMISSED'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Dispensadas ({dismissedList.length})
          </button>

          <button
            onClick={() => setActiveTab('RECONCILED')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'RECONCILED'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conciliadas ({reconciledList.length})
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SIMULATOR'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simulador de Bancos
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: NOTIFICAÇÕES DISPENSADAS */}
          {activeTab === 'DISMISSED' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Notificações que você optou por ignorar. Você pode restaurá-las para a fila a qualquer momento.
                </span>
                {dismissedList.length > 0 && (
                  <button
                    onClick={handleClearDismissed}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
                  </button>
                )}
              </div>

              {dismissedList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhuma notificação dispensada no histórico.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dismissedList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: item.bankColor }}
                          >
                            {item.bank}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.targetOrSource} • R$ {item.formattedAmount}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.date} {item.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic truncate">
                          "{item.rawText}"
                        </p>
                      </div>

                      <button
                        onClick={() => handleRestore(item.id)}
                        className="self-end sm:self-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar para a Fila
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NOTIFICAÇÕES CONCILIADAS */}
          {activeTab === 'RECONCILED' && (
            <div className="space-y-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Histórico de notificações que já foram transformadas em lançamentos efetivos no livro-caixa.
              </span>

              {reconciledList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhuma notificação conciliada ainda.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reconciledList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: item.bankColor }}
                          >
                            {item.bank}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.targetOrSource} • R$ {item.formattedAmount}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Lançamento Registrado
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          "{item.rawText}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SIMULADOR DE BANCOS */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-5">
              {simFeedback && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold animate-in fade-in">
                  {simFeedback}
                </div>
              )}

              {/* Botões Rápidos dos 6 Bancos Suportados */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Simulação Rápida (Clique para injetar na fila de conciliação):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateQuick(
                        'Você transferiu R$ 80,00 para Allison Araújo no Pix.',
                        'Nubank'
                      )
                    }
                    className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                      <span>Nubank (Pix Enviado)</span>
                      <span>R$ 80,00</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      "Você transferiu R$ 80,00 para Allison Araújo no Pix."
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateQuick(
                        'BB: Compra com Ourocard aprovada R$ 54,90 em Padaria São José.',
                        'BB'
                      )
                    }
                    className="p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-yellow-700 dark:text-yellow-400 flex items-center justify-between">
                      <span>Banco do Brasil (Cartão)</span>
                      <span>R$ 54,90</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      "BB: Compra com Ourocard aprovada R$ 54,90 em Padaria..."
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateQuick(
                        'CAIXA: Transferencia Pix de R$ 50,00 realizada com sucesso para Drogaria Pacheco.',
                        'Caixa'
                      )
                    }
                    className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <span>Caixa Econômica (Pix)</span>
                      <span>R$ 50,00</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      "CAIXA: Transferencia Pix de R$ 50,00 realizada..."
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateQuick(
                        'Bradesco: Pix enviado no valor de R$ 75,00 para Marcos Silva.',
                        'Bradesco'
                      )
                    }
                    className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center justify-between">
                      <span>Bradesco (Pix)</span>
                      <span>R$ 75,00</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      "Bradesco: Pix enviado no valor de R$ 75,00 para Marcos..."
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateQuick(
                        'Santander Way: Compra aprovada de R$ 62,00 no cartao em Farmacia Drogasil.',
                        'Santander'
                      )
                    }
                    className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between">
                      <span>Santander (Cartão)</span>
                      <span>R$ 62,00</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      "Santander Way: Compra aprovada de R$ 62,00 em..."
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateQuick(
                        'Inter: Voce recebeu um Pix de R$ 180,00 de Paula Oliveira.',
                        'Inter'
                      )
                    }
                    className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center justify-between">
                      <span>Banco Inter (Pix Recebido)</span>
                      <span>R$ 180,00</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      "Inter: Voce recebeu um Pix de R$ 180,00 de Paula..."
                    </p>
                  </button>
                </div>
              </div>

              {/* Caixa Livre de Texto para Testar Regex */}
              <form onSubmit={handleSimulateCustom} className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ou Cole o Texto Exato de Qualquer Notificação Push / SMS:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Ex: Você transferiu R$ 120,00 para João pelo Pix..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> Testar Parser
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
