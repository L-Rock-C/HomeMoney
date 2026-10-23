'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Users,
  PieChart,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  HandCoins,
  RefreshCw,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  CalendarDays,
  Settings,
  PiggyBank,
  LogIn,
  LogOut,
  FolderOpen,
  UserCheck,
} from 'lucide-react';
import {
  fetchMonthlyReports,
  fetchCategoryReports,
  fetchAccounts,
  fetchCategories,
  fetchPeople,
  fetchPaymentMethods,
  fetchTransactions,
  toggleTransactionPaid,
  deleteTransaction,
  getStoredUser,
  fetchCurrentUser,
  getAuthToken,
  clearAuthToken,
} from '../lib/api';
import { TransactionModal } from '../components/TransactionModal';
import { SettleModal } from '../components/SettleModal';
import { ManagerModal } from '../components/ManagerModal';
import { ProfileContactsView } from '../components/ProfileContactsView';
import { CategoryDonutChart, MonthlyBarChart } from '../components/FinanceCharts';

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function HomePage() {
  const router = useRouter();

  // Theme state: Default is LIGHT
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Authentication state
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletsNavOpen, setWalletsNavOpen] = useState(true);

  // App data states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRANSACTIONS' | 'BALANCE' | 'PEOPLE' | 'WALLETS' | 'PROFILE'>('DASHBOARD');


  // Date Filter states
  const [filterMode, setFilterMode] = useState<'MONTH' | 'RANGE'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Search & Type Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');

  // Core Data
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [categoriesReport, setCategoriesReport] = useState<any>({ grandTotal: 0, categories: [] });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);
  const [settlePerson, setSettlePerson] = useState<any | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerSection, setManagerSection] = useState<'CATEGORIES' | 'PEOPLE' | 'PAYMENTS' | 'WALLETS'>('CATEGORIES');

  // Initialize theme and authenticate user
  useEffect(() => {
    const savedTheme = localStorage.getItem('homemoney-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const savedUser = getStoredUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    }

    fetchCurrentUser().then((u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        clearAuthToken();
        router.push('/login');
      }
    });
  }, [router]);

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setMonthlyReports([]);
    setCategoriesReport({ grandTotal: 0, categories: [] });
    setAccounts([]);
    setCategories([]);
    setPeople([]);
    setPaymentMethods([]);
    setTransactions([]);
    setActiveTab('DASHBOARD');
    router.push('/login');
  };

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('homemoney-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Load Initial Data
  async function loadInitialData() {
    try {
      setLoading(true);
      const [monthsData, accs, cats, peop, methods] = await Promise.all([
        fetchMonthlyReports(),
        fetchAccounts(),
        fetchCategories(),
        fetchPeople(),
        fetchPaymentMethods(),
      ]);

      setMonthlyReports(monthsData);
      setAccounts(accs);
      setCategories(cats);
      setPeople(peop);
      setPaymentMethods(methods);

      const months = monthsData.map((m: any) => m.month);
      const currentM = getCurrentMonthKey();
      const allMonths = Array.from(new Set([...months, currentM])).sort();
      setAvailableMonths(allMonths);

      const initialMonth = currentM;
      setSelectedMonth(initialMonth);

      await fetchTransactionsForFilter(initialMonth, '', '');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactionsForFilter(month?: string, start?: string, end?: string) {
    try {
      if (filterMode === 'MONTH' || month) {
        const m = month || selectedMonth;
        const [catRep, trans] = await Promise.all([
          fetchCategoryReports(m),
          fetchTransactions({ month: m }),
        ]);
        setCategoriesReport(catRep);
        setTransactions(trans);
      } else {
        const trans = await fetchTransactions({
          startDate: start || undefined,
          endDate: end || undefined,
        });
        setTransactions(trans);
        const catMap = new Map<string, any>();
        let grand = 0;
        for (const t of trans) {
          if (t.type === 'EXPENSE' || t.type === 'REIMBURSEMENT') {
            grand += t.amount;
            const cid = t.categoryId;
            if (!catMap.has(cid)) {
              catMap.set(cid, { categoryId: cid, categoryName: t.category?.name || 'Outros', total: 0, count: 0 });
            }
            const item = catMap.get(cid);
            item.total += t.amount;
            item.count += 1;
          }
        }
        const cats = Array.from(catMap.values())
          .map((c) => ({
            ...c,
            percentage: grand > 0 ? Math.round((c.total / grand) * 1000) / 10 : 0,
          }))
          .sort((a, b) => b.total - a.total);
        setCategoriesReport({ grandTotal: grand, categories: cats });
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadInitialData();
    }
  }, []);

  async function handleMonthSelect(month: string) {
    setSelectedMonth(month);
    setFilterMode('MONTH');
    setStartDate('');
    setEndDate('');
    await fetchTransactionsForFilter(month, '', '');
  }

  async function handleApplyDateRange() {
    if (!startDate && !endDate) return;
    setFilterMode('RANGE');
    await fetchTransactionsForFilter(undefined, startDate, endDate);
  }

  function handleClearDateFilter() {
    setStartDate('');
    setEndDate('');
    setFilterMode('MONTH');
    fetchTransactionsForFilter(selectedMonth, '', '');
  }

  async function handleTogglePaid(id: string) {
    try {
      await toggleTransactionPaid(id);
      await fetchTransactionsForFilter(filterMode === 'MONTH' ? selectedMonth : undefined, startDate, endDate);
      const updatedMonths = await fetchMonthlyReports();
      setMonthlyReports(updatedMonths);
      const updatedAccs = await fetchAccounts();
      setAccounts(updatedAccs);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta transação?')) return;
    try {
      await deleteTransaction(id);
      await fetchTransactionsForFilter(filterMode === 'MONTH' ? selectedMonth : undefined, startDate, endDate);
      const updatedMonths = await fetchMonthlyReports();
      setMonthlyReports(updatedMonths);
      const updatedAccs = await fetchAccounts();
      setAccounts(updatedAccs);
    } catch (err) {
      console.error(err);
    }
  }

  function handleOpenCreate() {
    setTransactionToEdit(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(transaction: any) {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  }

  // Current month metrics
  const currentMonthData = monthlyReports.find((m) => m.month === selectedMonth) || {
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    accumulatedBalance: 0,
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.person?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.account?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchesAccount = accountFilter === 'ALL' || t.accountId === accountFilter;

    return matchesSearch && matchesType && matchesAccount;
  });

  const formatBRL = (val: number) =>
    val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ========================================================================= */}
      {/* Collapsible Sidebar */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Desktop Collapse/Expand Toggle Button (Floating pill on border) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-md items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:scale-110 transition cursor-pointer"
          title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Sidebar Header / Logo */}
        <div className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 ${
          sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'
        }`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden`}>
            <div className="w-10 h-10 min-w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950 font-bold shrink-0">
              <Wallet className="w-5 h-5 text-slate-950" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  HomeMoney
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5">
                  Gestão Pessoal
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <button
            onClick={() => {
              setActiveTab('DASHBOARD');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
            } py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'DASHBOARD'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Visão Geral"
          >
            <PieChart className="w-5 h-5 min-w-5 shrink-0" />
            {!sidebarCollapsed && <span>Visão Geral</span>}
          </button>

          <button
            onClick={() => {
              setActiveTab('TRANSACTIONS');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Transações do Mês"
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <CreditCard className="w-5 h-5 min-w-5 shrink-0" />
              {!sidebarCollapsed && <span>Transações</span>}
            </div>
            {!sidebarCollapsed && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {filteredTransactions.length}
              </span>
            )}
          </button>

          {/* Carteiras & Poupanças no Nav com Formato Toggle Accordion */}
          <div>
            <div
              onClick={() => {
                setActiveTab('WALLETS');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
              } py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'WALLETS'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title="Carteiras & Poupanças"
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <PiggyBank className="w-5 h-5 min-w-5 shrink-0 text-emerald-500" />
                {!sidebarCollapsed && <span>Carteiras & Poupanças</span>}
              </div>

              {!sidebarCollapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {accounts.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWalletsNavOpen(!walletsNavOpen);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                    title={walletsNavOpen ? 'Recolher carteiras' : 'Expandir carteiras'}
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        walletsNavOpen ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Quick list of wallets toggleable */}
            {!sidebarCollapsed && walletsNavOpen && accounts.length > 0 && (
              <div className="pl-6 pr-2 py-1 space-y-1 animate-in fade-in duration-200">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setAccountFilter(acc.id);
                      setActiveTab('TRANSACTIONS');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer transition group"
                    title={`Filtrar transações de ${acc.name}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: acc.color || '#10B981' }}
                      />
                      <span className="truncate max-w-[95px] font-medium">{acc.name}</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-semibold ${
                        acc.currentBalance >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500'
                      }`}
                    >
                      {formatBRL(acc.currentBalance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setActiveTab('BALANCE');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
            } py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'BALANCE'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Balanço Histórico"
          >
            <Scale className="w-5 h-5 min-w-5 shrink-0" />
            {!sidebarCollapsed && <span>Balanço Histórico</span>}
          </button>

          <button
            onClick={() => {
              setActiveTab('PEOPLE');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'PEOPLE'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Acerto de Contas & Terceiros"
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <Users className="w-5 h-5 min-w-5 shrink-0" />
              {!sidebarCollapsed && <span>Acerto de Contas</span>}
            </div>
            {!sidebarCollapsed && people.some((p) => p.toReceive > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Pendências a receber" />
            )}
          </button>

          {/* Perfil & Contatos no Nav */}
          <button
            onClick={() => {
              setActiveTab('PROFILE');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
            } py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'PROFILE'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Perfil & Contatos"
          >
            <UserCheck className="w-5 h-5 min-w-5 shrink-0 text-emerald-500" />
            {!sidebarCollapsed && <span>Perfil & Contatos</span>}
          </button>

          {/* Gerenciador de Cadastros */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <button
              onClick={() => {
                setManagerSection('CATEGORIES');
                setIsManagerOpen(true);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
              } py-2.5 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition`}
              title="Gerenciador de Cadastros"
            >
              <Settings className="w-5 h-5 min-w-5 shrink-0" />
              {!sidebarCollapsed && <span>Gerenciador</span>}
            </button>
          </div>
        </nav>

        {/* Sidebar Footer: User & Theme Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 py-2 rounded-xl text-xs font-semibold border transition ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            } ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 min-w-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 min-w-4 text-indigo-500 shrink-0" />}
            {!sidebarCollapsed && (
              <span>{theme === 'dark' ? 'Tema Escuro' : 'Tema Claro (Padrão)'}</span>
            )}
          </button>

          {/* User Badge: Navigates to Profile or Login */}
          <div
            className={`flex items-center justify-between p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 transition ${
              sidebarCollapsed ? 'flex-col gap-2' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  setActiveTab('PROFILE');
                  setMobileMenuOpen(false);
                } else {
                  router.push('/login');
                }
              }}
              className="flex items-center gap-2.5 truncate cursor-pointer text-left flex-1 hover:opacity-80 transition"
              title="Meu Perfil & Conta (Clique para abrir)"
            >
              <div className="w-8 h-8 min-w-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                {(currentUser?.name || 'L').slice(0, 1).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate text-left">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">
                    {currentUser?.name || 'Lucas'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    {currentUser?.email || 'lucas@homemoney.com'}
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
              title="Sair da Conta (Logoff)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* Main Content Area */}
      {/* ========================================================================= */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {activeTab === 'DASHBOARD' && 'Visão Geral'}
                {activeTab === 'TRANSACTIONS' && 'Extrato de Transações'}
                {activeTab === 'BALANCE' && 'Balanço Consolidado'}
                {activeTab === 'PEOPLE' && 'Acertos com Terceiros'}
                {activeTab === 'WALLETS' && 'Carteiras & Poupanças'}
                {activeTab === 'PROFILE' && 'Meu Perfil & Conexões'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'PROFILE' && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nova Transação</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* ========================================================================= */}
          {/* Dashboard Geral (Filtros & Indicadores KPI) - Apenas em Telas Financeiras */}
          {/* ========================================================================= */}
          {activeTab !== 'PROFILE' && (
            <>
              {/* Styled Date Search & Filter Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Filtrar por Período</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione um mês de referência ou defina uma faixa de datas
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
                <button
                  onClick={() => setFilterMode('MONTH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterMode === 'MONTH'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Por Mês
                </button>
                <button
                  onClick={() => setFilterMode('RANGE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterMode === 'RANGE'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Personalizado (De / Até)
                </button>
              </div>
            </div>

            {/* Filter Content */}
            {filterMode === 'MONTH' ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {availableMonths.map((m) => {
                  const isSelected = selectedMonth === m;
                  return (
                    <button
                      key={m}
                      onClick={() => handleMonthSelect(m)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                        isSelected
                          ? 'bg-emerald-500 text-white dark:text-slate-950 border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleApplyDateRange}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-sm transition"
                >
                  Aplicar Faixa
                </button>

                {(startDate || endDate) && (
                  <button
                    onClick={handleClearDateFilter}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* KPI Summary Cards */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Receitas
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {formatBRL(currentMonthData.totalIncome)}
              </div>
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <span>Receitas do período</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Despesas
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {formatBRL(currentMonthData.totalExpense)}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>Gastos liquidados</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Saldo Líquido
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    currentMonthData.netBalance >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl font-bold tracking-tight ${
                  currentMonthData.netBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500'
                }`}
              >
                {formatBRL(currentMonthData.netBalance)}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Receitas menos despesas
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Saldo Acumulado
                </span>
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl font-bold tracking-tight ${
                  currentMonthData.accumulatedBalance >= 0
                    ? 'text-slate-900 dark:text-white'
                    : 'text-rose-500'
                }`}
              >
                {formatBRL(currentMonthData.accumulatedBalance)}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Patrimônio acumulado
              </div>
            </div>
          </div>
        </>
      )}

          {/* ========================================================================= */}
          {/* TAB 1: Dashboard (Visão Geral) */}
          {/* ========================================================================= */}
          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráficos de Visão Geral (Colunas & Setores) */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Gráfico de Colunas: Comparativo Mensal */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Evolução Financeira (Receitas, Despesas e Saldo)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Comparativo entre os meses registrados com seleção rápida de período
                      </p>
                    </div>
                  </div>

                  <MonthlyBarChart
                    monthlyReports={monthlyReports}
                    selectedMonth={selectedMonth}
                    onSelectMonth={handleMonthSelect}
                    formatBRL={formatBRL}
                  />
                </div>

                {/* 2. Gráfico de Setores: Despesas por Categoria */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-emerald-500" />
                        Despesas por Categoria (Gráfico de Setores)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Distribuição proporcional no período de {selectedMonth}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Total: {formatBRL(categoriesReport.grandTotal)}
                    </span>
                  </div>

                  <CategoryDonutChart
                    categories={categoriesReport.categories}
                    grandTotal={categoriesReport.grandTotal}
                    formatBRL={formatBRL}
                  />
                </div>
              </div>

              {/* Contas, Poupanças & Terceiros */}
              <div className="space-y-6">
                {/* Carteiras & Poupanças */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-emerald-500" />
                      Carteiras & Poupanças
                    </h3>
                    <button
                      onClick={() => setIsManagerOpen(true)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Gerenciar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {accounts.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: a.color || '#10B981' }}
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                              {a.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {a.type === 'SAVINGS' ? 'Poupança / Caixinha' : a.type === 'CHECKING' ? 'Principal' : 'Carteira'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            a.currentBalance >= 0 ? 'text-slate-900 dark:text-slate-200' : 'text-rose-500'
                          }`}
                        >
                          {formatBRL(a.currentBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terceiros Pendentes */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HandCoins className="w-4 h-4 text-amber-500" />
                      A Receber de Terceiros
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {people
                      .filter((p) => p.toReceive > 0)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</div>
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                              Deve para Lucas: {formatBRL(p.toReceive)}
                            </div>
                          </div>
                          <button
                            onClick={() => setSettlePerson(p)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                          >
                            Acertar
                          </button>
                        </div>
                      ))}
                    {people.filter((p) => p.toReceive > 0).length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">Nenhum valor pendente de terceiros 🎉</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: Extrato de Transações */}
          {/* ========================================================================= */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, categoria, terceiro..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition shadow-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Filter by Carteira / Poupança */}
                  <select
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none shadow-sm cursor-pointer"
                  >
                    <option value="ALL">Todas as Carteiras</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Type */}
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button
                      onClick={() => setTypeFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        typeFilter === 'ALL'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setTypeFilter('EXPENSE')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        typeFilter === 'EXPENSE'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Despesas
                    </button>
                    <button
                      onClick={() => setTypeFilter('INCOME')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        typeFilter === 'INCOME'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Receitas
                    </button>
                    <button
                      onClick={() => setTypeFilter('REIMBURSEMENT')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        typeFilter === 'REIMBURSEMENT'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Reembolsos
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4">Descrição</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Carteira / Método</th>
                        <th className="py-3 px-4">Terceiro</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                      {filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleTogglePaid(t.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                t.paid
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {t.paid ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5" /> Pendente
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {t.dueDate}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{t.description}</span>
                              {t.totalInstallments && t.totalInstallments > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                  {t.currentInstallment}/{t.totalInstallments}
                                </span>
                              )}
                            </div>
                            {t.notes && <p className="text-xs text-slate-400 mt-0.5">{t.notes}</p>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50">
                              {t.category?.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{t.account?.name}</span> • {t.paymentMethod}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {t.person ? (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-medium">
                                {t.person.name}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${
                              t.type === 'INCOME'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {t.type === 'INCOME' ? '+' : '-'} {formatBRL(t.amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(t)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            Nenhuma transação encontrada para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: Balanço Histórico */}
          {/* ========================================================================= */}
          {activeTab === 'BALANCE' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Balanço Financeiro Consolidado</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Histórico oficial por mês (equivalente à aba Balanço da sua planilha)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Mês/Ano</th>
                      <th className="py-3.5 px-4 text-right">Total Receitas</th>
                      <th className="py-3.5 px-4 text-right">Total Despesas</th>
                      <th className="py-3.5 px-4 text-right">Saldo do Mês</th>
                      <th className="py-3.5 px-4 text-right">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
                    {monthlyReports.map((m) => (
                      <tr
                        key={m.month}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition ${
                          m.month === selectedMonth ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-sans font-semibold text-slate-900 dark:text-white">{m.month}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">{formatBRL(m.totalIncome)}</td>
                        <td className="py-3.5 px-4 text-right text-rose-500">{formatBRL(m.totalExpense)}</td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold ${
                            m.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          }`}
                        >
                          {formatBRL(m.netBalance)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold ${
                            m.accumulatedBalance >= 0 ? 'text-slate-900 dark:text-slate-200' : 'text-rose-500'
                          }`}
                        >
                          {formatBRL(m.accumulatedBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: Acerto de Contas & Terceiros (Apenas pendências) */}
          {/* ========================================================================= */}
          {activeTab === 'PEOPLE' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-amber-500" />
                    Acerto de Contas & Reembolsos Pendentes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clique em qualquer contato para ver a lista detalhada de despesas adiantadas por você e realizar a quitação.
                  </p>
                </div>
                <button
                  onClick={() => setIsManagerOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition self-start sm:self-auto"
                >
                  Gerenciar Contatos
                </button>
              </div>

              {people.filter((p) => p.toReceive > 0 || p.toPay > 0).length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Tudo em dia! Nenhum reembolso pendente
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Todas as despesas adiantadas ou pagas a terceiros estão devidamente quitadas e conciliadas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {people
                    .filter((p) => p.toReceive > 0 || p.toPay > 0)
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSettlePerson(p)}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 hover:shadow-md transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                                {p.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {p.pendingCount || 1} despesa{(p.pendingCount || 1) > 1 ? 's' : ''} a acertar
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Deve para Lucas:
                          </span>
                          <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                            {formatBRL(p.toReceive)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:text-slate-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <HandCoins className="w-4 h-4" />
                          Ver Transações & Quitar ({formatBRL(p.toReceive)})
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: Carteiras & Poupanças */}
          {/* ========================================================================= */}
          {activeTab === 'WALLETS' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PiggyBank className="w-6 h-6 text-emerald-500" />
                    Gestão de Carteiras & Poupanças
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Acompanhe o saldo consolidado de suas contas correntes, caixinhas de poupança e reservas financeiras.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setManagerSection('WALLETS');
                    setIsManagerOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Nova Carteira / Poupança
                </button>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Saldo Total Consolidado
                  </span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatBRL(accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {accounts.length} carteiras/poupanças cadastradas
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Contas Correntes
                  </span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatBRL(
                      accounts
                        .filter((a) => a.type === 'CHECKING')
                        .reduce((sum, a) => sum + (a.currentBalance || 0), 0)
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {accounts.filter((a) => a.type === 'CHECKING').length} contas principais
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Poupanças & Caixinhas
                  </span>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {formatBRL(
                      accounts
                        .filter((a) => a.type === 'SAVINGS')
                        .reduce((sum, a) => sum + (a.currentBalance || 0), 0)
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {accounts.filter((a) => a.type === 'SAVINGS').length} caixinhas ativas
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Dinheiro & Outros
                  </span>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {formatBRL(
                      accounts
                        .filter((a) => a.type === 'WALLET' || a.type === 'INVESTMENT')
                        .reduce((sum, a) => sum + (a.currentBalance || 0), 0)
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Carteiras físicas e investimentos
                  </span>
                </div>
              </div>

              {/* Wallets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:border-emerald-500/50 transition group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                          {acc.type === 'SAVINGS' ? (
                            <PiggyBank className="w-5 h-5" />
                          ) : acc.type === 'CHECKING' ? (
                            <CreditCard className="w-5 h-5" />
                          ) : (
                            <Wallet className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                            {acc.name}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {acc.type === 'SAVINGS'
                              ? 'Poupança / Caixinha'
                              : acc.type === 'CHECKING'
                              ? 'Conta Principal'
                              : acc.type === 'INVESTMENT'
                              ? 'Investimento'
                              : 'Carteira Física'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Saldo Atual:
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            acc.currentBalance >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          }`}
                        >
                          {formatBRL(acc.currentBalance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                        <span>Saldo inicial cadastrado:</span>
                        <span>{formatBRL(acc.initialBalance || 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setAccountFilter(acc.id);
                          setActiveTab('TRANSACTIONS');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition text-center shadow-sm"
                      >
                        Ver Transações
                      </button>
                      <button
                        onClick={() => {
                          setManagerSection('WALLETS');
                          setIsManagerOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Configurar Carteira"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: Perfil & Contatos */}
          {/* ========================================================================= */}
          {activeTab === 'PROFILE' && (
            <ProfileContactsView
              currentUser={currentUser}
              people={people}
              onRefreshData={loadInitialData}
              formatBRL={formatBRL}
            />
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* Modals */}
      {/* ========================================================================= */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTransactionToEdit(null);
        }}
        onSuccess={() => {
          loadInitialData();
        }}
        accounts={accounts}
        categories={categories}
        people={people}
        paymentMethods={paymentMethods}
        defaultMonth={selectedMonth}
        transactionToEdit={transactionToEdit}
        onReloadAuxiliaryData={loadInitialData}
      />

      <SettleModal
        isOpen={Boolean(settlePerson)}
        onClose={() => setSettlePerson(null)}
        onSuccess={() => {
          loadInitialData();
        }}
        person={settlePerson}
        accounts={accounts}
      />

      <ManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        categories={categories}
        people={people}
        paymentMethods={paymentMethods}
        accounts={accounts}
        onRefreshData={loadInitialData}
        initialSection={managerSection}
      />
    </div>
  );
}
