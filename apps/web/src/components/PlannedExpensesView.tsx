'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Tag,
  Wallet,
  User,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  Sparkles,
  TrendingDown,
  Layers,
  ChevronRight,
  ShieldAlert,
  Coins,
  Check,
} from 'lucide-react';

interface PlannedExpensesViewProps {
  transactions: any[];
  selectedMonth: string;
  formatBRL: (val: number) => string;
  onTogglePaid: (id: string) => Promise<void>;
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => Promise<void>;
  onCreate?: () => void;
  onSelectDetail: (transaction: any) => void;
  accounts: any[];
  categories: any[];
  people: any[];
  onSelectMonth?: (month: string) => void;
}

export function PlannedExpensesView({
  transactions,
  selectedMonth,
  formatBRL,
  onTogglePaid,
  onEdit,
  onDelete,
  onCreate,
  onSelectDetail,
  accounts,
  categories,
  people,
}: PlannedExpensesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('EXPENSE');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [payingId, setPayingId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper para cálculo do status do vencimento
  const getDueStatus = (dueDateStr?: string) => {
    if (!dueDateStr) return { label: 'Sem data', color: 'slate', isOverdue: false, isToday: false, diffDays: 0 };
    const dateOnly = dueDateStr.slice(0, 10);
    const dDate = new Date(`${dateOnly}T00:00:00`);
    const tDate = new Date(`${todayStr}T00:00:00`);
    const diffDays = Math.round((dDate.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return {
        label: daysAgo === 1 ? 'Venceu ontem' : `Venceu há ${daysAgo} dias`,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        dotColor: 'bg-rose-500',
        isOverdue: true,
        isToday: false,
        diffDays,
      };
    }
    if (diffDays === 0) {
      return {
        label: 'Vence hoje',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse',
        dotColor: 'bg-amber-500',
        isOverdue: false,
        isToday: true,
        diffDays: 0,
      };
    }
    if (diffDays === 1) {
      return {
        label: 'Vence amanhã',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        dotColor: 'bg-blue-500',
        isOverdue: false,
        isToday: false,
        diffDays: 1,
      };
    }
    return {
      label: `Em ${diffDays} dias`,
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dotColor: 'bg-emerald-500',
      isOverdue: false,
      isToday: false,
      diffDays,
    };
  };

  // Filtra apenas transações pendentes (paid === false)
  const allPendingTransactions = useMemo(() => {
    return transactions.filter((t) => !t.paid);
  }, [transactions]);

  // Cálculos de KPIs dos Gastos Previstos
  const metrics = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let overdueExpense = 0;
    let overdueCount = 0;
    let todayExpense = 0;
    let next7DaysExpense = 0;

    for (const t of allPendingTransactions) {
      const status = getDueStatus(t.dueDate);
      if (t.type === 'EXPENSE' || t.type === 'REIMBURSEMENT') {
        totalExpense += t.amount;
        if (status.isOverdue) {
          overdueExpense += t.amount;
          overdueCount++;
        }
        if (status.isToday) {
          todayExpense += t.amount;
        }
        if (status.diffDays >= 0 && status.diffDays <= 7) {
          next7DaysExpense += t.amount;
        }
      } else if (t.type === 'INCOME') {
        totalIncome += t.amount;
      }
    }

    return {
      totalExpense,
      totalIncome,
      netImpact: totalIncome - totalExpense,
      overdueExpense,
      overdueCount,
      todayExpense,
      next7DaysExpense,
      totalCount: allPendingTransactions.length,
      expenseCount: allPendingTransactions.filter((t) => t.type !== 'INCOME').length,
    };
  }, [allPendingTransactions, todayStr]);

  // Transações filtradas para a tabela e cards
  const filteredList = useMemo(() => {
    return allPendingTransactions.filter((t) => {
      // 1. Tipo
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;

      // 2. Categoria
      if (categoryFilter !== 'ALL' && t.categoryId !== categoryFilter) return false;

      // 3. Carteira
      if (accountFilter !== 'ALL' && t.accountId !== accountFilter) return false;

      // 4. Status de Vencimento
      const due = getDueStatus(t.dueDate);
      if (statusFilter === 'OVERDUE' && !due.isOverdue) return false;
      if (statusFilter === 'TODAY' && !due.isToday) return false;
      if (statusFilter === 'UPCOMING' && (due.isOverdue || due.isToday)) return false;

      // 5. Pesquisa Textual
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesCat = t.category?.name?.toLowerCase().includes(q);
        const matchesAcc = t.account?.name?.toLowerCase().includes(q);
        const matchesPerson = t.person?.name?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesAcc && !matchesPerson && !matchesNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Ordenação: primeiro os mais urgentes (menor data de vencimento)
      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';
      return dateA.localeCompare(dateB);
    });
  }, [allPendingTransactions, search, statusFilter, typeFilter, categoryFilter, accountFilter]);

  // Agrupamento por Categoria para o resumo lateral
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const t of allPendingTransactions) {
      if (t.type === 'EXPENSE' || t.type === 'REIMBURSEMENT') {
        const catName = t.category?.name || 'Geral';
        const current = map.get(catName) || { name: catName, total: 0, count: 0 };
        current.total += t.amount;
        current.count++;
        map.set(catName, current);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allPendingTransactions]);

  // Maiores compromissos previstos do mês
  const topPendingExpenses = useMemo(() => {
    return allPendingTransactions
      .filter((t) => t.type === 'EXPENSE' || t.type === 'REIMBURSEMENT')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [allPendingTransactions]);

  const handleQuickPay = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setPayingId(id);
      await onTogglePaid(id);
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ========================================================================= */}
      {/* 2. KPI Cards de Compromissos Futuros */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Pagar no Mês */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total a Pagar (Previsto)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatBRL(metrics.totalExpense)}
          </div>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
            <span>{metrics.expenseCount} contas a quitar neste mês</span>
          </p>
        </div>

        {/* Contas Vencidas (Atrasadas) */}
        <div
          className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group transition ${
            metrics.overdueCount > 0
              ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Contas Vencidas
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                metrics.overdueCount > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {metrics.overdueCount > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              metrics.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {formatBRL(metrics.overdueExpense)}
          </div>
          <div className="mt-2 text-xs font-medium">
            {metrics.overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {metrics.overdueCount} {metrics.overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Nenhuma conta atrasada</span>
              </span>
            )}
          </div>
        </div>

        {/* Próximos 7 Dias / Vencendo Hoje */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Próximos 7 Dias
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatBRL(metrics.next7DaysExpense)}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics.todayExpense > 0 ? (
              <span className="font-semibold text-amber-500">
                {formatBRL(metrics.todayExpense)} vence hoje!
              </span>
            ) : (
              'Desembolso previsto para a semana'
            )}
          </p>
        </div>

        {/* Receitas Previstas (Se houver) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Entradas Previstas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatBRL(metrics.totalIncome)}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Receitas pendentes a confirmar
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Barra de Filtros Rápidos & Pesquisa */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Pesquisar por gasto, categoria, carteira, terceiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Filtros de Vencimento (Pílulas) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({allPendingTransactions.length})
            </button>
            <button
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'OVERDUE'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              Vencidos ({metrics.overdueCount})
            </button>
            <button
              onClick={() => setStatusFilter('TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'TODAY'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              Vencem Hoje
            </button>
            <button
              onClick={() => setStatusFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'UPCOMING'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              No Prazo
            </button>
          </div>
        </div>

        {/* Segunda Linha: Tipo de Transação */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tipo:</span>
          <button
            onClick={() => setTypeFilter('EXPENSE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              typeFilter === 'EXPENSE'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Apenas Despesas
          </button>
          <button
            onClick={() => setTypeFilter('INCOME')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              typeFilter === 'INCOME'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Apenas Receitas
          </button>
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos os Tipos
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Lista Principal de Transações e Resumo Lateral */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Principal: Tabela & Lista de Gastos (Maior Proporção: ~75% em Desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
            {/* Header da Seção */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Contas e Compromissos Pendentes ({filteredList.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Ordenado por data de vencimento
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Prazo / Vencimento</th>
                    <th className="py-3 px-4 min-w-[200px]">Gasto Previsto</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Carteira</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Liquidar</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredList.map((t) => {
                    const status = getDueStatus(t.dueDate);
                    const isIncome = t.type === 'INCOME';
                    return (
                      <tr
                        key={t.id}
                        onClick={() => onSelectDetail(t)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                      >
                        {/* Vencimento e Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                              {t.dueDate || 'Sem data'}
                            </span>
                            <span
                              className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.badgeClass}`}
                            >
                              {status.label}
                            </span>
                          </div>
                        </td>

                        {/* Descrição e Parcelas */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {t.description}
                            </span>
                            {t.totalInstallments && t.totalInstallments > 1 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold shrink-0">
                                {t.currentInstallment}/{t.totalInstallments}
                              </span>
                            )}
                          </div>
                          {t.notes && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {t.notes}
                            </p>
                          )}
                          {t.person && (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                              <User className="w-3 h-3" />
                              <span>{t.person.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-medium">
                            {t.category?.name || 'Geral'}
                          </span>
                        </td>

                        {/* Carteira / Método */}
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {t.account?.name || 'Não definida'}
                          </div>
                          <div className="text-[10px] text-slate-400">{t.paymentMethod || 'Pix'}</div>
                        </td>

                        {/* Valor */}
                        <td
                          className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatBRL(t.amount)}
                        </td>

                        {/* Botão de Quitação Rápida (Pagar Agora) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleQuickPay(t.id, e)}
                            disabled={payingId === t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white dark:hover:text-slate-950 border border-emerald-500/20 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Marcar como Pago"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Pagar</span>
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEdit(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Editar gasto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(t.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                              title="Excluir gasto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-base">
                              Nenhum gasto previsto pendente!
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Todos os compromissos deste filtro já foram pagos ou não há lançamentos para o mês.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredList.map((t) => {
                const status = getDueStatus(t.dueDate);
                const isIncome = t.type === 'INCOME';
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectDetail(t)}
                    className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${status.dotColor}`} />
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {t.description}
                          </span>
                          {t.totalInstallments && t.totalInstallments > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
                              {t.currentInstallment}/{t.totalInstallments}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{t.dueDate}</span>
                          <span>•</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`text-base font-bold whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatBRL(t.amount)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                          {t.category?.name || 'Geral'}
                        </span>
                        <span>{t.account?.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleQuickPay(t.id, e)}
                          disabled={payingId === t.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white text-xs font-bold border border-emerald-500/20 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pagar</span>
                        </button>
                        <button
                          onClick={() => onEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredList.length === 0 && (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    Tudo em dia!
                  </p>
                  <p className="text-xs text-slate-500">
                    Nenhum compromisso pendente encontrado para os filtros selecionados.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Resumo por Categoria & Maiores Compromissos (Proporção compacta: ~25%) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Card 1: Maiores Gastos Previstos */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Maiores Compromissos
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Top 4</span>
            </div>

            <div className="space-y-2">
              {topPendingExpenses.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectDetail(t)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t.description}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Vence em: {t.dueDate}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                    {formatBRL(t.amount)}
                  </span>
                </div>
              ))}

              {topPendingExpenses.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  Sem despesas pendentes no momento.
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Gastos Previstos por Categoria */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Onde você vai gastar
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Categorias</span>
            </div>

            <div className="space-y-2.5">
              {categoryBreakdown.map((c) => {
                const percent = metrics.totalExpense > 0 ? Math.round((c.total / metrics.totalExpense) * 100) : 0;
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                        {c.name} ({c.count})
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">
                        {formatBRL(c.total)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {categoryBreakdown.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  Nenhum dado por categoria disponível.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
