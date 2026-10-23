'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Scale, PieChart, BarChart3, HelpCircle } from 'lucide-react';

interface CategoryItem {
  categoryId: string;
  categoryName: string;
  color?: string | null;
  total: number;
  count: number;
  percentage: number;
}

interface MonthlyItem {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  accumulatedBalance?: number;
}

const PALETTE = [
  '#10B981', // emerald-500
  '#06B6D4', // cyan-500
  '#6366F1', // indigo-500
  '#8B5CF6', // purple-500
  '#EC4899', // pink-500
  '#F59E0B', // amber-500
  '#F43F5E', // rose-500
  '#3B82F6', // blue-500
  '#14B8A6', // teal-500
  '#84CC16', // lime-500
];

interface CategoryDonutChartProps {
  categories: CategoryItem[];
  grandTotal: number;
  formatBRL: (val: number) => string;
}

export function CategoryDonutChart({ categories, grandTotal, formatBRL }: CategoryDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!categories || categories.length === 0 || grandTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Nenhuma despesa para exibir no gráfico
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
          Lance despesas ou selecione outro mês com movimentações para visualizar a distribuição por setores.
        </p>
      </div>
    );
  }

  // Pre-calculate SVG Donut Slices using stroke-dasharray
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;
  const slices = categories.map((cat, idx) => {
    const pct = cat.percentage / 100;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercentage * circumference;
    accumulatedPercentage += pct;
    const color = cat.color || PALETTE[idx % PALETTE.length];

    return {
      cat,
      idx,
      color,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeCategory = hoveredIdx !== null ? categories[hoveredIdx] : null;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full transform -rotate-90 filter drop-shadow-sm transition-all"
        >
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80"
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            return (
              <circle
                key={slice.cat.categoryId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          {activeCategory ? (
            <>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                {activeCategory.categoryName}
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {formatBRL(activeCategory.total)}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeCategory.percentage}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total do Mês
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {formatBRL(grandTotal)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Categories Legend List */}
      <div className="flex-1 w-full space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {categories.map((cat, idx) => {
          const color = cat.color || PALETTE[idx % PALETTE.length];
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={cat.categoryId}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2 rounded-xl transition cursor-pointer border ${
                isHovered
                  ? 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold truncate max-w-[140px] sm:max-w-none">{cat.categoryName}</span>
                  <span className="text-[10px] text-slate-400">({cat.count}x)</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatBRL(cat.total)}{' '}
                  <span className="text-[11px] font-normal text-slate-400">({cat.percentage}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(cat.percentage, 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MonthlyBarChartProps {
  monthlyReports: MonthlyItem[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  formatBRL: (val: number) => string;
}

export function MonthlyBarChart({
  monthlyReports,
  selectedMonth,
  onSelectMonth,
  formatBRL,
}: MonthlyBarChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyItem | null>(null);

  if (!monthlyReports || monthlyReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Dados insuficientes para gerar o comparativo
        </p>
      </div>
    );
  }

  // Display the last 6-8 recorded months (sorted chronologically)
  const sortedReports = [...monthlyReports].sort((a, b) => a.month.localeCompare(b.month));
  const recentReports = sortedReports.slice(-8);

  // Maximum value for scale
  const maxVal = Math.max(
    ...recentReports.map((r) => Math.max(r.totalIncome, r.totalExpense, Math.abs(r.netBalance))),
    1
  );

  const formatMonthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length < 2) return m;
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const idx = parseInt(parts[1], 10) - 1;
    return `${monthsNames[idx] || parts[1]}/${parts[0].slice(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/30" />
            <span className="font-medium text-slate-600 dark:text-slate-300">Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 shadow-sm shadow-rose-500/30" />
            <span className="font-medium text-slate-600 dark:text-slate-300">Despesas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-500 shadow-sm shadow-indigo-500/30" />
            <span className="font-medium text-slate-600 dark:text-slate-300">Saldo Líquido</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Clique em um mês para filtrar
        </span>
      </div>

      {/* Main Chart Graphic */}
      <div className="relative pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 items-end h-48 sm:h-56 px-2">
          {recentReports.map((report) => {
            const isSelected = report.month === selectedMonth;
            const incomeHeight = Math.max((report.totalIncome / maxVal) * 100, 3);
            const expenseHeight = Math.max((report.totalExpense / maxVal) * 100, 3);
            const balanceHeight = Math.max((Math.abs(report.netBalance) / maxVal) * 100, 3);
            const isPositiveBalance = report.netBalance >= 0;

            return (
              <div
                key={report.month}
                onClick={() => onSelectMonth(report.month)}
                onMouseEnter={() => setHoveredMonth(report)}
                onMouseLeave={() => setHoveredMonth(null)}
                className={`group relative flex flex-col items-center justify-end h-full p-1.5 sm:p-2 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500 shadow-md'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Columns Cluster */}
                <div className="flex items-end justify-center gap-1 sm:gap-1.5 w-full h-full pb-2">
                  {/* Income Column */}
                  <div
                    style={{ height: `${incomeHeight}%` }}
                    className="w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm transition-all duration-300 group-hover:brightness-110"
                    title={`Receitas: ${formatBRL(report.totalIncome)}`}
                  />

                  {/* Expense Column */}
                  <div
                    style={{ height: `${expenseHeight}%` }}
                    className="w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 shadow-sm transition-all duration-300 group-hover:brightness-110"
                    title={`Despesas: ${formatBRL(report.totalExpense)}`}
                  />

                  {/* Net Balance Column */}
                  <div
                    style={{ height: `${balanceHeight}%` }}
                    className={`w-2.5 sm:w-3.5 rounded-t-md shadow-sm transition-all duration-300 group-hover:brightness-110 ${
                      isPositiveBalance
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                        : 'bg-gradient-to-t from-amber-600 to-amber-400'
                    }`}
                    title={`Saldo: ${formatBRL(report.netBalance)}`}
                  />
                </div>

                {/* X Axis Label */}
                <span
                  className={`text-[11px] font-semibold tracking-tight transition-colors whitespace-nowrap mt-1 ${
                    isSelected
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {formatMonthLabel(report.month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Hover Details Bar */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {hoveredMonth ? (
          <>
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span>{formatMonthLabel(hoveredMonth.month)}</span>
              {hoveredMonth.month === selectedMonth && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Mês Ativo
                </span>
              )}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                + {formatBRL(hoveredMonth.totalIncome)}
              </span>
              <span className="text-rose-500 font-semibold">
                - {formatBRL(hoveredMonth.totalExpense)}
              </span>
              <span
                className={`font-bold ${
                  hoveredMonth.netBalance >= 0
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-amber-500'
                }`}
              >
                Saldo: {formatBRL(hoveredMonth.netBalance)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-500 dark:text-slate-400 italic">
            Passe o mouse sobre as colunas para ver detalhes de cada mês.
          </span>
        )}
      </div>
    </div>
  );
}
