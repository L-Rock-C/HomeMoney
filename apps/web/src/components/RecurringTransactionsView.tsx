'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Tag,
  Wallet,
  Play,
  Pause,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Clock,
  Check,
} from 'lucide-react';
import {
  fetchRecurringTransactions,
  toggleRecurringTransaction,
  deleteRecurringTransaction,
  generateRecurringForMonth,
  RecurringMetrics,
} from '../lib/api';

const MONTH_NAMES_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

const formatMonthYearLabel = (monthKey: string) => {
  if (!monthKey) return '';
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTH_NAMES_SHORT[monthIdx]}/${year}`;
    }
  }
  return monthKey;
};

interface RecurringTransactionsViewProps {
  selectedMonth: string;
  formatBRL: (val: number) => string;
  accounts: any[];
  categories: any[];
  transactions?: any[];
  onOpenCreateModal: () => void;
  onOpenEditModal: (item: any) => void;
  onSyncCompleted?: () => void;
}

export function RecurringTransactionsView({
  selectedMonth,
  formatBRL,
  accounts,
  categories,
  transactions = [],
  onOpenCreateModal,
  onOpenEditModal,
  onSyncCompleted,
}: RecurringTransactionsViewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<RecurringMetrics>({
    totalFixedIncomes: 0,
    totalFixedExpenses: 0,
    totalSubscriptions: 0,
    netFreeBalance: 0,
    activeCount: 0,
    pausedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchRecurringTransactions();
      setItems(res.items || []);
      setMetrics(res.metrics);
    } catch (err) {
      console.error('Erro ao carregar assinaturas e fixos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await toggleRecurringTransaction(id);
      loadData();
    } catch (err) {
      console.error('Erro ao alternar status da recorrência:', err);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!window.confirm(`Tem certeza que deseja remover a recorrência "${description}"?`)) {
      return;
    }
    try {
      await deleteRecurringTransaction(id);
      loadData();
    } catch (err) {
      console.error('Erro ao excluir recorrência:', err);
    }
  };

  const handleSyncMonth = async () => {
    try {
      setSyncing(true);
      setSyncFeedback(null);
      const res = await generateRecurringForMonth(selectedMonth);
      setSyncFeedback(
        res.createdCount > 0
          ? `${res.createdCount} lançamentos gerados no mês ${selectedMonth}!`
          : `Todos os lançamentos ativos já existem em ${selectedMonth}.`
      );
      if (onSyncCompleted) {
        onSyncCompleted();
      }
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback(err.message || 'Erro ao sincronizar recorrências');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCat = item.category?.name?.toLowerCase().includes(q);
        const matchesAcc = item.account?.name?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesAcc) return false;
      }
      return true;
    });
  }, [items, statusFilter, typeFilter, search]);

  // Taxa de comprometimento da renda fixa
  const commitmentRate = useMemo(() => {
    if (metrics.totalFixedIncomes <= 0) return 0;
    return Math.min(100, Math.round((metrics.totalFixedExpenses / metrics.totalFixedIncomes) * 100));
  }, [metrics]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. Header & KPI Metrics Cards */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Receitas Fixas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Receitas Fixas (Salário/Renda)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatBRL(metrics.totalFixedIncomes)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Garantidos todo mês
          </p>
        </div>

        {/* Despesas Fixas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Despesas Fixas Comprometidas
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-500">
            {formatBRL(metrics.totalFixedExpenses)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  commitmentRate > 70 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${commitmentRate}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              {commitmentRate}% da renda
            </span>
          </div>
        </div>

        {/* Assinaturas & Streaming */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Assinaturas & Serviços
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatBRL(metrics.totalSubscriptions)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Streaming, software, academia
          </p>
        </div>

        {/* Saldo Livre Estimado */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-white dark:from-slate-900/90 to-purple-500/5 dark:to-purple-500/10 border border-purple-500/30 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Saldo Livre Projetado
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              metrics.netFreeBalance >= 0
                ? 'text-purple-600 dark:text-purple-300'
                : 'text-rose-500'
            }`}
          >
            {formatBRL(metrics.netFreeBalance)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Disponível após despesas fixas
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Action & Filter Bar */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar assinatura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas ({metrics.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ativas ({metrics.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PAUSED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'PAUSED'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pausadas ({metrics.pausedCount})
            </button>
          </div>

          {/* Type Toggle: Despesas vs Receitas */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos Tipos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                typeFilter === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Despesas
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('INCOME')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                typeFilter === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Receitas
            </button>
          </div>
        </div>

        {/* Right Actions: Sincronizar Mês & Novo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncMonth}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            title={`Gera lançamentos pendentes no mês selecionado (${selectedMonth})`}
          >
            <Repeat className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : `Lançar em ${formatMonthYearLabel(selectedMonth)}`}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Recorrência</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-500" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Items List / Table */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Repeat className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-2" />
          <p className="text-xs">Carregando assinaturas e recorrências...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 bg-white dark:bg-slate-900/30">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Nenhuma assinatura ou fixo encontrado
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Cadastre seu salário, assinaturas de streaming (Netflix, Spotify), internet ou aluguel para ter previsão automática todo mês.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeira Recorrência
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Dia do Mês</th>
                  <th className="py-3 px-4">Descrição & Categoria</th>
                  <th className="py-3 px-4">Carteira & Pagamento</th>
                  <th className="py-3 px-4 text-center">No Mês ({formatMonthYearLabel(selectedMonth)})</th>
                  <th className="py-3 px-4 text-right">Valor Mensal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((item) => {
                  const isIncome = item.type === 'INCOME';
                  const isPaused = item.status === 'PAUSED';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group ${
                        isPaused ? 'opacity-60 bg-slate-50/50 dark:bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Dia do Mês */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          <span>Dia {item.recurrenceDay}</span>
                        </div>
                      </td>

                      {/* Descrição & Categoria */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{item.description}</span>
                              {isPaused && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                                  Pausada
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {item.category?.name || 'Geral'}
                              </span>
                              {item.notes && (
                                <span className="truncate max-w-xs text-slate-500 dark:text-slate-400">
                                  • {item.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Carteira & Pagamento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-slate-400" />
                            {item.account?.name || 'Carteira Padrão'}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {item.paymentMethod || 'Crédito'}
                          </span>
                        </div>
                      </td>

                      {/* Situação no Mês Selecionado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {(() => {
                          const monthTx = transactions.find((t: any) => t.recurringId === item.id);
                          if (monthTx) {
                            if (monthTx.paid) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-3 h-3 stroke-[2.5]" /> Liquidada
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" /> Lançada (Pendente)
                              </span>
                            );
                          }
                          if (item.status === 'ACTIVE') {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                <Calendar className="w-3 h-3" /> Prevista
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400">
                              Pausada
                            </span>
                          );
                        })()}
                      </td>

                      {/* Valor Mensal */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                        <span
                          className={`text-sm ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatBRL(item.amount)}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggle(item.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-500'
                          }`}
                          title={item.status === 'ACTIVE' ? 'Clique para pausar' : 'Clique para reativar'}
                        >
                          {item.status === 'ACTIVE' ? (
                            <>
                              <Play className="w-3 h-3 fill-current" /> Ativa
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 fill-current" /> Pausada
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Editar recorrência"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.description)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Excluir recorrência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
