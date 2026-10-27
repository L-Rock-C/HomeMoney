'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  HandCoins,
  CheckCircle2,
  Clock,
  UserCheck,
  Edit2,
  Trash2,
  Plus,
  ChevronRight,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Sparkles,
} from 'lucide-react';

interface PeopleTableViewProps {
  people: any[];
  formatBRL: (val: number) => string;
  onSettle: (person: any) => void;
  onEdit: (person: any) => void;
  onDelete: (person: any) => void;
  onCreateContact: () => void;
}

export function PeopleTableView({
  people,
  formatBRL,
  onSettle,
  onEdit,
  onDelete,
  onCreateContact,
}: PeopleTableViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING' | 'LINKED'>('PENDING');

  // Calculations
  const totalToReceive = people.reduce((sum, p) => sum + (p.toReceive || 0), 0);
  const totalToPay = people.reduce((sum, p) => sum + (p.toPay || 0), 0);
  const totalNet = totalToReceive - totalToPay;
  const pendingCount = people.filter((p) => (p.toReceive || 0) > 0 || (p.toPay || 0) > 0).length;

  const filteredPeople = people.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.linkedUser?.name && p.linkedUser.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.linkedUser?.email && p.linkedUser.email.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'PENDING') {
      return (p.toReceive || 0) > 0 || (p.toPay || 0) > 0;
    }
    if (filterType === 'LINKED') {
      return Boolean(p.linkedUserId);
    }
    return true;
  });

  // Resumo responsivo dos contatos filtrados
  const peopleSummary = useMemo(() => {
    let totalToReceive = 0;
    let totalToPay = 0;
    let totalNet = 0;
    let withPendingCount = 0;

    for (const p of filteredPeople) {
      totalToReceive += p.toReceive || 0;
      totalToPay += p.toPay || 0;
      totalNet += p.netBalance || 0;
      if ((p.toReceive || 0) > 0 || (p.toPay || 0) > 0) {
        withPendingCount++;
      }
    }

    return {
      count: filteredPeople.length,
      totalToReceive,
      totalToPay,
      totalNet,
      withPendingCount,
    };
  }, [filteredPeople]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            Acerto de Contas & Contatos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie despesas compartilhadas, valores adiantados e quitações financeiras com terceiros.
          </p>
        </div>

        <button
          onClick={onCreateContact}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Contato</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            A Receber (Adiantado)
          </span>
          <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatBRL(totalToReceive)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {pendingCount} {pendingCount === 1 ? 'contato com pendência' : 'contatos com pendências'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            A Pagar
          </span>
          <div className="text-lg sm:text-xl font-bold text-rose-500 mt-1">
            {formatBRL(totalToPay)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Débitos com terceiros
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Saldo Consolidado
          </span>
          <div
            className={`text-lg sm:text-xl font-bold mt-1 ${
              totalNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {formatBRL(totalNet)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Diferença líquida
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato por nome ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            Todos ({people.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'PENDING'
                ? 'bg-amber-500 text-white dark:text-slate-950 font-bold shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            Com Pendências ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('LINKED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'LINKED'
                ? 'bg-teal-500 text-white dark:text-slate-950 font-bold shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            Vinculados ({people.filter((p) => p.linkedUserId).length})
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm w-full max-w-full">
        {/* DESKTOP TABLE (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Vínculo</th>
                <th className="py-3 px-4">Pendências</th>
                <th className="py-3 px-4 text-right">A Receber</th>
                <th className="py-3 px-4 text-right">A Pagar</th>
                <th className="py-3 px-4 text-right">Saldo Líquido</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {filteredPeople.map((p) => {
                const hasPending = (p.toReceive || 0) > 0 || (p.toPay || 0) > 0;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group"
                  >
                    {/* Contato (Avatar + Nome + Notas) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                          {p.linkedUser?.avatar ? (
                            <img src={p.linkedUser.avatar} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {p.name}
                          </span>
                          {p.notes && (
                            <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                              {p.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Vínculo com Usuário Real */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {p.linkedUser ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                          <UserCheck className="w-3.5 h-3.5" />
                          {p.linkedUser.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                          Local
                        </span>
                      )}
                    </td>

                    {/* Pendências */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {hasPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                          <Clock className="w-3 h-3" />
                          {p.pendingCount || 1} { (p.pendingCount || 1) === 1 ? 'pendência' : 'pendências'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Quitado
                        </span>
                      )}
                    </td>

                    {/* A Receber */}
                    <td className="py-3 px-4 text-right font-semibold text-xs whitespace-nowrap">
                      {(p.toReceive || 0) > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {formatBRL(p.toReceive)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* A Pagar */}
                    <td className="py-3 px-4 text-right font-semibold text-xs whitespace-nowrap">
                      {(p.toPay || 0) > 0 ? (
                        <span className="text-rose-500 font-bold">
                          {formatBRL(p.toPay)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Saldo Líquido */}
                    <td className="py-3 px-4 text-right font-bold text-xs whitespace-nowrap">
                      <span
                        className={
                          (p.netBalance || 0) > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : (p.netBalance || 0) < 0
                            ? 'text-rose-500'
                            : 'text-slate-400'
                        }
                      >
                        {formatBRL(p.netBalance || 0)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSettle(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            hasPending
                              ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Fazer Acerto / Quitação"
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          <span>Acertar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(p)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                          title="Editar Contato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(p)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                          title="Excluir Contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPeople.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Linha de Totais da Tabela (Responsiva ao filtro ativo) */}
            <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 font-medium text-xs">
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
                      TOTAL
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {peopleSummary.count} {peopleSummary.count === 1 ? 'contato' : 'contatos'}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-400 dark:text-slate-600">
                  —
                </td>
                <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {peopleSummary.withPendingCount} com pendências
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {formatBRL(peopleSummary.totalToReceive)}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-xs text-rose-500 whitespace-nowrap">
                  {formatBRL(peopleSummary.totalToPay)}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-xs whitespace-nowrap">
                  <span
                    className={
                      peopleSummary.totalNet > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : peopleSummary.totalNet < 0
                        ? 'text-rose-500'
                        : 'text-slate-400'
                    }
                  >
                    {formatBRL(peopleSummary.totalNet)}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center text-xs text-slate-400 dark:text-slate-600">
                  —
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* MOBILE COMPACT LIST (visible on mobile, 100% width, no horizontal scroll) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredPeople.map((p) => {
            const hasPending = (p.toReceive || 0) > 0 || (p.toPay || 0) > 0;
            return (
              <div
                key={p.id}
                onClick={() => onSettle(p)}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                    {p.linkedUser?.avatar ? (
                      <img src={p.linkedUser.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {p.name}
                      </span>
                      {p.linkedUser && (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      {hasPending ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {p.pendingCount || 1} {(p.pendingCount || 1) === 1 ? 'pendência' : 'pendências'}
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-medium">Em dia</span>
                      )}
                      {p.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[110px]">{p.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span
                      className={`text-sm font-extrabold whitespace-nowrap block ${
                        hasPending
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatBRL(p.toReceive || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">
                      A receber
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </div>
            );
          })}

          {filteredPeople.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhum contato encontrado.
            </div>
          )}

          {/* Resumo Rodapé Mobile */}
          <div className="p-3.5 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="uppercase text-[11px] font-bold text-slate-400 tracking-wider">
                  Total
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {peopleSummary.count} {peopleSummary.count === 1 ? 'contato' : 'contatos'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {peopleSummary.withPendingCount} com pendências
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-amber-600 dark:text-amber-400 font-bold" title="A Receber">
                  +{formatBRL(peopleSummary.totalToReceive)}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-rose-500 font-bold" title="A Pagar">
                  -{formatBRL(peopleSummary.totalToPay)}
                </span>
              </div>
              <div className="text-right font-bold">
                <span
                  className={
                    peopleSummary.totalNet > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : peopleSummary.totalNet < 0
                      ? 'text-rose-500'
                      : 'text-slate-400'
                  }
                >
                  {formatBRL(peopleSummary.totalNet)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
