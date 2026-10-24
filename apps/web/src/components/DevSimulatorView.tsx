'use client';

import React, { useState } from 'react';
import {
  FlaskConical,
  BellRing,
  HandCoins,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Database,
  ArrowRight,
  Send,
  Zap,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { simulateTransferNotification } from '../lib/api';
import { processIncomingAndroidNotificationItems } from '../lib/bankNotificationService';

interface DevSimulatorViewProps {
  currentUser: any;
  onRefreshAllData: () => void;
  formatBRL: (val: number) => string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export function DevSimulatorView({
  currentUser,
  onRefreshAllData,
  formatBRL,
}: DevSimulatorViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type: 'info',
      message: 'Painel de Simulação iniciado para o perfil de Lucas.',
    },
  ]);

  // Bank simulation states
  const [bankType, setBankType] = useState<'Nubank' | 'BB' | 'Caixa' | 'Inter'>('Nubank');
  const [bankAmount, setBankAmount] = useState('85,50');
  const [bankSender, setBankSender] = useState('Letícia Lima');
  const [bankMethod, setBankMethod] = useState<'Pix' | 'Crédito'>('Pix');
  const [isBankIncoming, setIsBankIncoming] = useState(true);

  // Transfer simulation states
  const [transferDesc, setTransferDesc] = useState('Almoço de domingo no restaurante');
  const [transferAmount, setTransferAmount] = useState('65,00');
  const [transferLoading, setTransferLoading] = useState(false);

  const addLog = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setLogs((prev) => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        type,
        message,
      },
      ...prev.slice(0, 40),
    ]);
  };

  // 1. Simular Notificação Bancária Local / Android
  const handleSimulateBankNotification = (preset?: 'nubank_pix' | 'nubank_cartao' | 'bb_pix') => {
    try {
      let title = '';
      let text = '';
      let bank: any = bankType;

      if (preset === 'nubank_pix') {
        bank = 'Nubank';
        title = 'Transferência recebida';
        text = 'Você recebeu uma transferência de R$ 50,00 de Letícia Lima de Lucena Viana.';
      } else if (preset === 'nubank_cartao') {
        bank = 'Nubank';
        title = 'Compra aprovada';
        text = 'Compra de R$ 89,90 aprovada no cartão Nubank em Restaurante Sabor.';
      } else if (preset === 'bb_pix') {
        bank = 'BB';
        title = 'BB Notificações';
        text = 'BB: Você recebeu um Pix de R$ 120,00 de Allison Araújo no dia 24/10.';
      } else {
        const valStr = bankAmount.replace(',', '.');
        if (isBankIncoming) {
          text = `Você recebeu uma transferência de R$ ${bankAmount} de ${bankSender} no Pix.`;
          title = `${bank}: Pix Recebido`;
        } else {
          text = `Você transferiu R$ ${bankAmount} para ${bankSender} no Pix.`;
          title = `${bank}: Pix Enviado`;
        }
      }

      const item = {
        id: `sim_bank_${Date.now()}`,
        bank,
        title,
        text,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      processIncomingAndroidNotificationItems([item]);
      window.dispatchEvent(new CustomEvent('homemoney_queue_updated'));

      addLog(`Notificação bancária simulada: "${text}"`, 'success');
      onRefreshAllData();
    } catch (e: any) {
      addLog(`Erro ao simular notificação bancária: ${e.message}`, 'error');
    }
  };

  // 2. Simular Transferência / Reembolso no Banco de Dados
  const handleSimulateTransfer = async (direction: 'INCOMING' | 'OUTGOING') => {
    try {
      setTransferLoading(true);
      const numAmount = parseFloat(transferAmount.replace(/\./g, '').replace(',', '.')) || 50;

      const res = await simulateTransferNotification({
        direction,
        amount: numAmount,
        description: transferDesc.trim() || 'Simulação de Reembolso',
      });

      addLog(
        `Transferência simulada (${direction === 'INCOMING' ? 'Recebida de Letícia' : 'Enviada para Letícia'}): ${formatBRL(
          numAmount
        )} - "${transferDesc}"`,
        'success'
      );

      // Dispara evento para atualizar dados
      window.dispatchEvent(new CustomEvent('homemoney_open_transfer'));
      onRefreshAllData();
    } catch (err: any) {
      addLog(`Falha ao simular transferência: ${err.message}`, 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  // 3. Limpar Cache Local
  const handleClearCache = () => {
    try {
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith('homemoney_app_cache') || k.startsWith('homemoney_notified')
      );
      keys.forEach((k) => localStorage.removeItem(k));
      addLog(`Cache limpo com sucesso (${keys.length} chaves removidas). Recarregando dados frescos do banco...`, 'success');
      onRefreshAllData();
    } catch (e: any) {
      addLog(`Erro ao limpar cache: ${e.message}`, 'error');
    }
  };

  // 4. Testar Notificação Nativa Android
  const handleTestNativeNotification = () => {
    if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
      try {
        if (typeof (window as any).AndroidNotificationBridge.postTransferNotification === 'function') {
          (window as any).AndroidNotificationBridge.postTransferNotification(
            'Letícia Lima (Simulação)',
            formatBRL(parseFloat(transferAmount.replace(',', '.')) || 65),
            transferDesc,
            `test_${Date.now()}`
          );
          addLog('Notificação nativa do Android disparada via bridge!', 'success');
        } else {
          addLog('Bridge do Android conectada, mas método postTransferNotification não encontrado.', 'error');
        }
      } catch (e: any) {
        addLog(`Erro ao chamar bridge Android: ${e.message}`, 'error');
      }
    } else {
      addLog('Bridge Android não detectada (você está rodando no navegador web desktop). No APK Android físico esta chamada toca o som e exibe o banner nativo do sistema.', 'info');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/10 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
            <FlaskConical className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Simulador de Testes & Cenários
              </h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                EXCLUSIVO LUCAS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dispare eventos, simule transferências com Letícia, teste a fila bancária e gerencie o cache.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearCache}
          className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Cache & Forçar Atualização
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Simulação de Transferência entre Contatos Vinculados */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transferência / Reembolso Vinculado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gera um registro real no banco de dados para testar o modal de reconhecimento e notificações.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição da Transferência
              </label>
              <input
                type="text"
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                placeholder="Ex: Remédio gato, Supermercado..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor (R$)
              </label>
              <input
                type="text"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="65,00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => handleSimulateTransfer('INCOMING')}
                className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                Letícia Envia para Lucas (Receber)
              </button>

              <button
                type="button"
                disabled={transferLoading}
                onClick={() => handleSimulateTransfer('OUTGOING')}
                className="py-2.5 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Lucas Envia para Letícia (Cobrar)
              </button>
            </div>

            <button
              type="button"
              onClick={handleTestNativeNotification}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Testar Notificação Nativa no Celular (Android Bridge)
            </button>
          </div>
        </div>

        {/* Card 2: Simulação de Notificações Bancárias (Fila de Conciliação) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-500 border border-violet-500/20 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Notificação Bancária (Fila Inteligente)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Injeta notificações no formato dos bancos brasileiros para testar sugestões automáticas.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Atalhos rápidos:</span>
              <button
                type="button"
                onClick={() => handleSimulateBankNotification('nubank_pix')}
                className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-600 dark:text-violet-400 border border-violet-500/30 text-[11px] font-bold transition"
              >
                Nubank Pix (R$ 50 de Letícia)
              </button>
              <button
                type="button"
                onClick={() => handleSimulateBankNotification('nubank_cartao')}
                className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-600 dark:text-violet-400 border border-violet-500/30 text-[11px] font-bold transition"
              >
                Cartão (R$ 89,90 Restaurante)
              </button>
              <button
                type="button"
                onClick={() => handleSimulateBankNotification('bb_pix')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold transition"
              >
                BB Pix (R$ 120,00)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banco
                </label>
                <select
                  value={bankType}
                  onChange={(e: any) => setBankType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold"
                >
                  <option value="Nubank">Nubank</option>
                  <option value="BB">Banco do Brasil</option>
                  <option value="Caixa">Caixa</option>
                  <option value="Inter">Banco Inter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-violet-600 dark:text-violet-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Remetente ou Estabelecimento
              </label>
              <input
                type="text"
                value={bankSender}
                onChange={(e) => setBankSender(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSimulateBankNotification()}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <BellRing className="w-4 h-4" />
              Disparar Notificação Bancária Personalizada
            </button>
          </div>
        </div>
      </div>

      {/* Terminal / Log de Execuções */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950 border border-slate-800 text-slate-200 space-y-3 font-mono shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Terminal className="w-4 h-4" />
            <span>Console de Eventos de Simulação</span>
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition"
          >
            Limpar Console
          </button>
        </div>

        <div className="h-44 overflow-y-auto space-y-1.5 text-xs pr-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-slate-500 shrink-0 font-semibold select-none">
                [{log.timestamp}]
              </span>
              <span
                className={
                  log.type === 'success'
                    ? 'text-emerald-400'
                    : log.type === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
