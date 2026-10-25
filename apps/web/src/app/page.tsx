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
  BellRing,
  Sparkles,
  History,
  Eye,
  EyeOff,
  ArrowRight,
  FlaskConical,
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
  deletePerson,
  getStoredUser,
  fetchCurrentUser,
  getAuthToken,
  clearAuthToken,
  fetchPendingTransfers,
  TransferNotificationItem,
} from '../lib/api';
import { TransactionModal } from '../components/TransactionModal';
import { SettleModal } from '../components/SettleModal';
import { ManagerModal } from '../components/ManagerModal';
import { ManagerView } from '../components/ManagerView';
import { WalletModal } from '../components/WalletModal';
import { ReconciliationQueueModal } from '../components/ReconciliationQueueModal';
import { NotificationHistoryModal } from '../components/NotificationHistoryModal';
import { NotificationHistoryView } from '../components/NotificationHistoryView';
import { ProfileContactsView } from '../components/ProfileContactsView';
import { TransferRecognitionModal } from '../components/TransferRecognitionModal';
import { DevSimulatorView } from '../components/DevSimulatorView';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { PeopleTableView } from '../components/PeopleTableView';
import { HomeMoneyLogo } from '../components/HomeMoneyLogo';
import { CategoryDonutChart, MonthlyBarChart } from '../components/FinanceCharts';
import { SelectDropdown } from '../components/ui/FormControls';
import {
  BankNotification,
  getPendingQueue,
  getDismissedHistory,
  triggerAndroidNotificationCheck,
  checkAndroidPendingReconciliation,
  getAndroidBridgeStatus,
  openAndroidNotificationSettings,
} from '../lib/bankNotificationService';

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ============================================================================
// Local Persistence Cache (Stale-While-Revalidate com isolamento por usuário)
// ============================================================================
const getCacheKey = (userId?: string) => (userId ? `homemoney_app_cache_${userId}` : 'homemoney_app_cache_v1');

interface AppCacheData {
  monthlyReports: any[];
  accounts: any[];
  categories: any[];
  people: any[];
  paymentMethods: any[];
  transactions: any[];
  categoriesReport: any;
  availableMonths: string[];
  selectedMonth: string;
  cachedAt: number;
}

function getStoredAppCache(userId?: string): AppCacheData | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getCacheKey(userId);
    const raw = localStorage.getItem(key) || (userId ? null : localStorage.getItem('homemoney_app_cache_v1'));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAppCache(data: Partial<AppCacheData>, userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const key = getCacheKey(userId);
    const current = getStoredAppCache(userId) || ({} as any);
    const merged = {
      ...current,
      ...data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(merged));
    if (userId) {
      localStorage.setItem('homemoney_app_cache_v1', JSON.stringify(merged));
    }
  } catch (e) {
    console.warn('Erro ao salvar cache local:', e);
  }
}

function clearAppCache(userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      localStorage.removeItem(getCacheKey(userId));
    }
    localStorage.removeItem('homemoney_app_cache_v1');
  } catch {}
}

// Verifica se o usuário logado é o perfil especial (Lucas) com acesso ao Simulador
export const isSpecialDevUser = (user: any) => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  return email === 'lucas@homemoney.com' || name.startsWith('lucas');
};

export default function HomePage() {
  const router = useRouter();

  // Theme state: Default is LIGHT
  const [theme, setTheme] = useState<'light' | 'dark' | 'aero'>('light');

  // Authentication state
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletsNavOpen, setWalletsNavOpen] = useState(true);

  // App data states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRANSACTIONS' | 'BALANCE' | 'PEOPLE' | 'WALLETS' | 'PROFILE' | 'SUGGESTIONS' | 'MANAGER' | 'DEV_SIMULATOR'>('DASHBOARD');
  const [showTransactionKPIs, setShowTransactionKPIs] = useState(false);
  const [showWalletKPIs, setShowWalletKPIs] = useState(false);
  const [selectedDetailTransaction, setSelectedDetailTransaction] = useState<any | null>(null);


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
  const [managerSection, setManagerSection] = useState<'CATEGORIES' | 'PAYMENTS' | 'THEMES'>('CATEGORIES');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<any | null>(null);

  // Fila de Conciliação e Histórico de Notificações Bancárias
  const [pendingQueue, setPendingQueue] = useState<BankNotification[]>([]);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  // Fila de Transferências e Reembolsos de Contatos Vinculados
  const [pendingTransfers, setPendingTransfers] = useState<TransferNotificationItem[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const loadPendingTransfersData = async () => {
    try {
      const data = await fetchPendingTransfers();
      setPendingTransfers(data);

      // Dispara notificação nativa no Android para novas transferências
      if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge && Array.isArray(data) && data.length > 0) {
        try {
          const notifiedKey = 'homemoney_notified_transfers_v1';
          const notifiedList: string[] = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
          let updatedList = [...notifiedList];

          for (const item of data) {
            if (!notifiedList.includes(item.id)) {
              if (typeof (window as any).AndroidNotificationBridge.postTransferNotification === 'function') {
                (window as any).AndroidNotificationBridge.postTransferNotification(
                  item.sender?.name || 'Contato',
                  item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                  item.description,
                  item.id
                );
              }
              updatedList.push(item.id);
            }
          }
          localStorage.setItem(notifiedKey, JSON.stringify(updatedList));
        } catch (e) {
          console.warn('Erro ao disparar notificação nativa de transferência:', e);
        }
      }
    } catch {
      // non-fatal
    }
  };

  const refreshQueueData = () => {
    const queue = getPendingQueue();
    setPendingQueue(queue);
    setDismissedCount(getDismissedHistory().length);
  };

  const handleCheckNotifications = () => {
    const status = getAndroidBridgeStatus();
    if (status.isAvailable && !status.isPermissionGranted) {
      openAndroidNotificationSettings();
      setCheckFeedback('Autorize o HomeMoney nas notificações');
      setTimeout(() => setCheckFeedback(null), 4000);
      return;
    }

    setIsCheckingNotifications(true);
    triggerAndroidNotificationCheck();
    loadPendingTransfersData();

    // Primeiro refresh rápido
    setTimeout(() => {
      refreshQueueData();
      loadPendingTransfersData();
    }, 350);

    // Segundo refresh completo com feedback
    setTimeout(() => {
      refreshQueueData();
      loadPendingTransfersData();
      setIsCheckingNotifications(false);

      const queue = getPendingQueue();
      const dismissed = getDismissedHistory();
      if (queue.length > 0) {
        setCheckFeedback(`${queue.length} ${queue.length === 1 ? 'sugestão encontrada' : 'sugestões na fila'}`);
      } else if (dismissed.length > 0) {
        setCheckFeedback(`Fila atualizada (${dismissed.length} no histórico)`);
      } else {
        setCheckFeedback('Fila atualizada');
      }
      setTimeout(() => setCheckFeedback(null), 3000);
    }, 950);
  };

  useEffect(() => {
    refreshQueueData();
    triggerAndroidNotificationCheck();
    loadPendingTransfersData();

    // Se o aplicativo foi aberto a partir de um clique em "Registrar Agora" na notificação nativa bancária
    if (checkAndroidPendingReconciliation()) {
      setIsQueueModalOpen(true);
    }

    // Se o aplicativo foi aberto a partir de uma notificação nativa de transferência entre contatos
    if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
      try {
        if (typeof (window as any).AndroidNotificationBridge.consumePendingOpenTransfer === 'function') {
          if ((window as any).AndroidNotificationBridge.consumePendingOpenTransfer()) {
            setIsTransferModalOpen(true);
          }
        }
      } catch {}
    }

    const handleOpenReconcile = () => {
      refreshQueueData();
      setIsQueueModalOpen(true);
    };

    const handleQueueUpdated = () => {
      refreshQueueData();
    };

    const handleOpenTransfer = () => {
      loadPendingTransfersData();
      setIsTransferModalOpen(true);
    };

    window.addEventListener('homemoney_open_reconciliation', handleOpenReconcile);
    window.addEventListener('homemoney_queue_updated', handleQueueUpdated);
    window.addEventListener('homemoney_open_transfer', handleOpenTransfer);

    return () => {
      window.removeEventListener('homemoney_open_reconciliation', handleOpenReconcile);
      window.removeEventListener('homemoney_queue_updated', handleQueueUpdated);
      window.removeEventListener('homemoney_open_transfer', handleOpenTransfer);
    };
  }, []);

  // Initialize theme, authenticate user and hydrate cache immediately
  useEffect(() => {
    const savedTheme = localStorage.getItem('homemoney-theme') as 'light' | 'dark' | 'aero' | null;
    const initialTheme = savedTheme === 'dark' || savedTheme === 'aero' ? savedTheme : 'light';
    applyTheme(initialTheme);

    // 1. Tenta hidratar o estado a partir do cache local imediatamente (0ms)
    const savedUser = getStoredUser();
    const activeUserId = savedUser?.id;
    const cached = getStoredAppCache(activeUserId);
    if (cached) {
      if (cached.monthlyReports?.length) setMonthlyReports(cached.monthlyReports);
      if (cached.accounts?.length) setAccounts(cached.accounts);
      if (cached.categories?.length) setCategories(cached.categories);
      if (cached.people?.length) setPeople(cached.people);
      if (cached.paymentMethods?.length) setPaymentMethods(cached.paymentMethods);
      if (cached.transactions?.length) setTransactions(cached.transactions);
      if (cached.categoriesReport) setCategoriesReport(cached.categoriesReport);
      if (cached.availableMonths?.length) setAvailableMonths(cached.availableMonths);
      if (cached.selectedMonth) setSelectedMonth(cached.selectedMonth);

      // Desliga o loading imediatamente se houver dados em cache
      setLoading(false);
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    if (savedUser) {
      setCurrentUser(savedUser);
    }

    fetchCurrentUser().then((u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        clearAuthToken();
        clearAppCache(activeUserId);
        router.push('/login');
      }
    });

    // 2. Busca dados frescos da rede (em segundo plano se já houver cache; com loading se não houver)
    loadInitialData(!cached);
  }, [router]);

  const handleLogout = () => {
    const uid = currentUser?.id || getStoredUser()?.id;
    clearAuthToken();
    clearAppCache(uid);
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

  function applyTheme(newTheme: 'light' | 'dark' | 'aero') {
    setTheme(newTheme);
    localStorage.setItem('homemoney-theme', newTheme);
    document.documentElement.classList.remove('dark', 'theme-aero');
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'aero') {
      document.documentElement.classList.add('theme-aero');
      const savedWp = localStorage.getItem('homemoney-aero-wallpaper') || 'aero-blue';
      const url = savedWp === 'aero-waves' ? '/wallpapers/aero-waves.jpg' : savedWp === 'aero-flora' ? '/wallpapers/aero-flora.jpg' : savedWp === 'aero-sky' ? '/wallpapers/aero-sky.png' : savedWp === 'aero-teal' ? '/wallpapers/aero-teal.png' : '/wallpapers/aero-blue.jpg';
      document.documentElement.style.setProperty('--aero-bg-image', `url('${url}')`);
    }
  }

  function toggleTheme() {
    const order: ('light' | 'dark' | 'aero')[] = ['light', 'dark', 'aero'];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    applyTheme(order[nextIdx]);
  }

  // Load Initial Data (com persistência em cache por usuário)
  async function loadInitialData(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
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

      const filterResult = await fetchTransactionsForFilter(initialMonth, '', '');

      // Persiste no cache local para carregamento instantâneo nas próximas aberturas
      const activeUid = currentUser?.id || getStoredUser()?.id;
      saveAppCache({
        monthlyReports: monthsData,
        accounts: accs,
        categories: cats,
        people: peop,
        paymentMethods: methods,
        transactions: filterResult?.trans || [],
        categoriesReport: filterResult?.catRep || { grandTotal: 0, categories: [] },
        availableMonths: allMonths,
        selectedMonth: initialMonth,
      }, activeUid);

      // Carrega transferências pendentes de contatos vinculados
      loadPendingTransfersData();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactionsForFilter(month?: string, start?: string, end?: string) {
    try {
      const activeUid = currentUser?.id || getStoredUser()?.id;
      if (filterMode === 'MONTH' || month) {
        const m = month || selectedMonth;
        const [catRep, trans] = await Promise.all([
          fetchCategoryReports(m),
          fetchTransactions({ month: m }),
        ]);
        setCategoriesReport(catRep);
        setTransactions(trans);
        saveAppCache({
          transactions: trans,
          categoriesReport: catRep,
          selectedMonth: m,
        }, activeUid);
        return { catRep, trans };
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
        const catRep = { grandTotal: grand, categories: cats };
        setCategoriesReport(catRep);
        saveAppCache({
          transactions: trans,
          categoriesReport: catRep,
        }, activeUid);
        return { catRep, trans };
      }
    } catch (err) {
      console.error(err);
      return null;
    }
  }

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
      const filterRes = await fetchTransactionsForFilter(filterMode === 'MONTH' ? selectedMonth : undefined, startDate, endDate);
      const updatedMonths = await fetchMonthlyReports();
      setMonthlyReports(updatedMonths);
      const updatedAccs = await fetchAccounts();
      setAccounts(updatedAccs);

      // Sincroniza cache local imediatamente
      const activeUid = currentUser?.id || getStoredUser()?.id;
      saveAppCache({
        transactions: filterRes?.trans || transactions.map((t) => (t.id === id ? { ...t, paid: !t.paid } : t)),
        monthlyReports: updatedMonths,
        accounts: updatedAccs,
      }, activeUid);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta transação?')) return;
    try {
      await deleteTransaction(id);
      const filterRes = await fetchTransactionsForFilter(filterMode === 'MONTH' ? selectedMonth : undefined, startDate, endDate);
      const updatedMonths = await fetchMonthlyReports();
      setMonthlyReports(updatedMonths);
      const updatedAccs = await fetchAccounts();
      setAccounts(updatedAccs);

      // Sincroniza cache local imediatamente
      const activeUid = currentUser?.id || getStoredUser()?.id;
      saveAppCache({
        transactions: filterRes?.trans || transactions.filter((t) => t.id !== id),
        monthlyReports: updatedMonths,
        accounts: updatedAccs,
      }, activeUid);
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

  // Loading Screen caso não haja dados em cache para exibir
  if (loading && accounts.length === 0 && transactions.length === 0 && monthlyReports.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
        <div className="relative flex flex-col items-center max-w-sm w-full text-center space-y-6">
          {/* Logo oficial animado */}
          <div className="relative">
            <div className="absolute -inset-4 bg-[#688746]/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center">
              <HomeMoneyLogo size="xl" showText={false} />
            </div>
          </div>

          <div className="space-y-2">
            <HomeMoneyLogo size="lg" showText={true} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Carregando seus dados financeiros...
            </p>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#688746] rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
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
            <HomeMoneyLogo
              size={sidebarCollapsed ? 'sm' : 'md'}
              showText={!sidebarCollapsed}
            />
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

          {/* Histórico de Sugestões Bancárias */}
          <button
            onClick={() => {
              setActiveTab('SUGGESTIONS');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'SUGGESTIONS'
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            } relative cursor-pointer`}
            title="Histórico de Sugestões Bancárias"
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <History className="w-5 h-5 min-w-5 shrink-0 text-violet-500" />
              {!sidebarCollapsed && <span>Histórico de Sugestões</span>}
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                {pendingQueue.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {pendingQueue.length}
                  </span>
                )}
                {dismissedCount > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {dismissedCount}
                  </span>
                )}
              </div>
            )}
            {sidebarCollapsed && (pendingQueue.length > 0 || dismissedCount > 0) && (
              <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${pendingQueue.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            )}
          </button>

          {/* Gerenciador de Cadastros */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <button
              onClick={() => {
                setActiveTab('MANAGER');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
              } py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === 'MANAGER'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Gerenciador de Cadastros"
            >
              <Settings className="w-5 h-5 min-w-5 shrink-0" />
              {!sidebarCollapsed && <span>Gerenciador</span>}
            </button>
          </div>

          {/* Simulador Dev (Exclusivo Perfil Lucas) */}
          {isSpecialDevUser(currentUser) && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveTab('DEV_SIMULATOR');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                } py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  activeTab === 'DEV_SIMULATOR'
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/30'
                    : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
                }`}
                title="Simulador de Testes (Dev)"
              >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <FlaskConical className="w-5 h-5 min-w-5 shrink-0 text-purple-500" />
                  {!sidebarCollapsed && <span>Simulador Dev</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                    DEV
                  </span>
                )}
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Footer: User & Theme Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              theme === 'aero'
                ? 'bg-sky-500/15 border-sky-400/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25'
                : theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            } ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
            title={
              theme === 'aero'
                ? 'Tema Aero (Clique para alternar para Claro)'
                : theme === 'dark'
                ? 'Tema Escuro (Clique para alternar para Aero)'
                : 'Tema Claro (Clique para alternar para Escuro)'
            }
          >
            {theme === 'aero' ? (
              <Sparkles className="w-4 h-4 min-w-4 text-sky-500 shrink-0 animate-pulse" />
            ) : theme === 'dark' ? (
              <Sun className="w-4 h-4 min-w-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 min-w-4 text-indigo-500 shrink-0" />
            )}
            {!sidebarCollapsed && (
              <span>
                {theme === 'aero'
                  ? 'Aero'
                  : theme === 'dark'
                  ? 'Tema Escuro'
                  : 'Tema Claro (Padrão)'}
              </span>
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
              <div className="w-8 h-8 min-w-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm shrink-0 overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  (currentUser?.name || 'L').slice(0, 1).toUpperCase()
                )}
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
        className={`flex-1 min-w-0 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="truncate">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {activeTab === 'DASHBOARD' && 'Visão Geral'}
                {activeTab === 'TRANSACTIONS' && 'Extrato de Transações'}
                {activeTab === 'BALANCE' && 'Balanço Consolidado'}
                {activeTab === 'PEOPLE' && 'Contatos & Acertos'}
                {activeTab === 'WALLETS' && 'Carteiras & Poupanças'}
                {activeTab === 'PROFILE' && 'Meu Perfil & Conexões'}
                {activeTab === 'SUGGESTIONS' && 'Histórico de Sugestões Bancárias'}
                {activeTab === 'MANAGER' && 'Gerenciador de Cadastros'}
                {activeTab === 'DEV_SIMULATOR' && 'Simulador de Testes (Dev)'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Botão de Transferências e Reembolsos de Contatos Vinculados */}
            {pendingTransfers.length > 0 && (
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow-xs relative flex items-center justify-center shrink-0 animate-pulse"
                title={`${pendingTransfers.length} transferências/reembolsos recebidos aguardando reconhecimento`}
              >
                <HandCoins className="w-4 h-4 text-amber-500" />
                <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white dark:text-slate-950 shadow-xs leading-none">
                  {pendingTransfers.length}
                </span>
              </button>
            )}

            {activeTab !== 'PROFILE' && activeTab !== 'SUGGESTIONS' && activeTab !== 'MANAGER' && activeTab !== 'DEV_SIMULATOR' && (
              <>
                {/* Botão de Checagem e Atualização de Notificações */}
                <button
                  type="button"
                  onClick={handleCheckNotifications}
                  disabled={isCheckingNotifications}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:bg-emerald-500/5 transition hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow-xs disabled:opacity-60 relative group flex items-center justify-center shrink-0"
                  title="Atualizar e checar notificações bancárias"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-emerald-500 transition-transform ${
                      isCheckingNotifications ? 'animate-spin' : 'group-hover:rotate-45'
                    }`}
                  />
                  {pendingQueue.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white dark:text-slate-950 shadow-xs leading-none">
                      {pendingQueue.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>
                    <span className="hidden sm:inline">Nova </span>Transação
                  </span>
                </button>
              </>
            )}

            {checkFeedback && (
              <div className="absolute -bottom-8 right-0 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-500/30 px-2.5 py-1 rounded-lg shadow-md pointer-events-none animate-in fade-in slide-in-from-top-1 z-40 whitespace-nowrap">
                {checkFeedback}
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto overflow-x-hidden">
          {/* ========================================================================= */}
          {/* Dashboard Geral (Filtros & Indicadores KPI) - Apenas em Telas Financeiras */}
          {/* ========================================================================= */}
          {/* Banner de Reconhecimento de Transferências / Reembolsos entre Contatos Vinculados */}
          {activeTab === 'DASHBOARD' && pendingTransfers.length > 0 && (
            <div
              onClick={() => setIsTransferModalOpen(true)}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/10 border border-amber-500/40 shadow-lg shadow-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 cursor-pointer hover:border-amber-500/60 hover:scale-[1.005] transition"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <HandCoins className="w-5 h-5 text-amber-500 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                      {pendingTransfers.length} {pendingTransfers.length === 1 ? 'Transferência Pendente' : 'Transferências Pendentes'}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Reconhecimento Necessário
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                    {pendingTransfers[0].sender?.name} registrou {formatBRL(pendingTransfers[0].amount)} (&ldquo;{pendingTransfers[0].description}&rdquo;)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Clique para reconhecer esta movimentação e aceitar o lançamento no seu extrato ou recusar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                  Reconhecer Agora <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          )}

          {/* Smart Multi-Bank Notification Queue Banner - Apenas no Dashboard quando houver sugestões pendentes */}
          {activeTab === 'DASHBOARD' && pendingQueue.length > 0 && (
            <div
              onClick={() => setIsQueueModalOpen(true)}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 cursor-pointer hover:border-emerald-500/50 hover:scale-[1.005] transition"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <BellRing className="w-5 h-5 animate-bounce text-violet-500 dark:text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      {pendingQueue.length} {pendingQueue.length === 1 ? 'Transferência Detectada' : 'Transferências na Fila'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Monitor de Bancos (BB, Caixa, Nubank, Bradesco, Santander, Inter)
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                    Você tem {pendingQueue.length}{' '}
                    {pendingQueue.length === 1
                      ? 'notificação bancária para conciliar'
                      : 'notificações bancárias para conciliar'}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {pendingQueue.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white shadow-xs"
                        style={{ backgroundColor: item.bankColor }}
                      >
                        {item.bank}: R$ {item.formattedAmount} ({item.targetOrSource})
                      </span>
                    ))}
                    {pendingQueue.length > 4 && (
                      <span className="text-[10px] text-slate-400">
                        +{pendingQueue.length - 4} mais
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQueueModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" /> Registrar Agora ({pendingQueue.length})
                </button>
              </div>
            </div>
          )}

          {/* Filtros de Período e Indicadores KPI: Apenas em Telas de Análise Financeira (DASHBOARD, TRANSACTIONS, BALANCE) */}
          {(activeTab === 'DASHBOARD' || activeTab === 'TRANSACTIONS' || activeTab === 'BALANCE') && (
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
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
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
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Até:</span>
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
          {/* KPI Summary Cards: Sempre visíveis em DASHBOARD e BALANCE, com Toggle em TRANSACTIONS */}
          {/* ========================================================================= */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowTransactionKPIs(!showTransactionKPIs)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition shadow-sm cursor-pointer"
              >
                {showTransactionKPIs ? (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>
                  {showTransactionKPIs
                    ? 'Ocultar Resumo Financeiro'
                    : 'Exibir Resumo (Total Receitas, Despesas, Saldo)'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showTransactionKPIs ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}

          {(activeTab !== 'TRANSACTIONS' || showTransactionKPIs) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
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
          )}
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
                      onClick={() => setActiveTab('WALLETS')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Gerenciar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {accounts.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setActiveTab('WALLETS')}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition"
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
                  <div className="min-w-[180px]">
                    <SelectDropdown
                      value={accountFilter}
                      onChange={(e) => setAccountFilter(e.target.value)}
                      className="py-1.5 px-3 text-xs"
                    >
                      <option value="ALL">Todas as Carteiras</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </SelectDropdown>
                  </div>

                  {/* Filter by Type */}
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full scrollbar-none">
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
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm w-full max-w-full">
                {/* Desktop View: Full 8-column Table */}
                <div className="hidden md:block overflow-x-auto w-full max-w-full">
                  <table className="w-full text-left text-sm min-w-[700px]">
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
                          <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                            Nenhuma transação encontrada para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Compact rows with 100% width and tap-to-open detail modal */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTransactions.map((t) => {
                    const isIncome = t.type === 'INCOME';
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedDetailTransaction(t)}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/60 transition cursor-pointer"
                      >
                        {/* Left: Indicator dot, description & subtitle */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                                {t.description}
                              </span>
                              {t.totalInstallments && t.totalInstallments > 1 && (
                                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                                  {t.currentInstallment}/{t.totalInstallments}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <span>{t.dueDate}</span>
                              <span>•</span>
                              <span className="truncate">{t.category?.name || 'Geral'}</span>
                              {t.person && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                                    {t.person.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Status Badge */}
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-bold whitespace-nowrap ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatBRL(t.amount)}
                          </div>
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                              t.paid
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {t.paid ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      Nenhuma transação encontrada para este filtro.
                    </div>
                  )}
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
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full text-left text-sm min-w-[550px]">
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
          {/* TAB 4: Contatos & Terceiros (Tabela Completa de Contatos) */}
          {/* ========================================================================= */}
          {activeTab === 'PEOPLE' && (
            <PeopleTableView
              people={people}
              formatBRL={formatBRL}
              onSettle={(p) => setSettlePerson(p)}
              onEdit={() => setActiveTab('PROFILE')}
              onDelete={async (p) => {
                if (!confirm(`Deseja realmente excluir o contato "${p.name}"?`)) return;
                try {
                  await deletePerson(p.id);
                  await loadInitialData();
                } catch (e: any) {
                  alert(e?.message || 'Erro ao excluir contato');
                }
              }}
              onCreateContact={() => setActiveTab('PROFILE')}
            />
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
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowWalletKPIs(!showWalletKPIs)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {showWalletKPIs ? (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>{showWalletKPIs ? 'Ocultar Resumo' : 'Exibir Resumo de Saldos'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showWalletKPIs ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => {
                      setWalletToEdit(null);
                      setIsWalletModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Nova Carteira / Poupança
                  </button>
                </div>
              </div>

              {/* Summary KPIs: Colapsável via Toggle */}
              {showWalletKPIs && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
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
              )}

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
                          setWalletToEdit(acc);
                          setIsWalletModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
              pendingTransfers={pendingTransfers}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
              accounts={accounts}
              categories={categories}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 6: Histórico de Sugestões Bancárias */}
          {/* ========================================================================= */}
          {activeTab === 'SUGGESTIONS' && (
            <NotificationHistoryView
              onOpenReconciliation={() => setIsQueueModalOpen(true)}
              onQueueUpdated={refreshQueueData}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 7: Gerenciador de Cadastros (Tela) */}
          {/* ========================================================================= */}
          {activeTab === 'MANAGER' && (
            <ManagerView
              categories={categories}
              paymentMethods={paymentMethods}
              onRefreshData={loadInitialData}
              initialSection={managerSection}
              currentTheme={theme}
              onThemeChange={applyTheme}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 8: Simulador de Testes (Dev - Exclusivo Lucas) */}
          {/* ========================================================================= */}
          {activeTab === 'DEV_SIMULATOR' && isSpecialDevUser(currentUser) && (
            <DevSimulatorView
              currentUser={currentUser}
              onRefreshAllData={loadInitialData}
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
        paymentMethods={paymentMethods}
        onRefreshData={loadInitialData}
        initialSection={managerSection === 'PAYMENTS' ? 'PAYMENTS' : 'CATEGORIES'}
      />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        onSuccess={loadInitialData}
        walletToEdit={walletToEdit}
      />

      <ReconciliationQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        queue={pendingQueue}
        accounts={accounts}
        categories={categories}
        people={people}
        paymentMethods={paymentMethods}
        onQueueUpdated={refreshQueueData}
        onSuccessTransaction={loadInitialData}
      />

      <NotificationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onQueueUpdated={refreshQueueData}
      />

      <TransferRecognitionModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          loadPendingTransfersData();
          loadInitialData();
        }}
        pendingTransfers={pendingTransfers}
        accounts={accounts}
        formatBRL={formatBRL}
      />

      {/* Modal de Detalhes da Transação (Mobile Compact View) */}
      <TransactionDetailModal
        isOpen={Boolean(selectedDetailTransaction)}
        onClose={() => setSelectedDetailTransaction(null)}
        transaction={selectedDetailTransaction}
        onEdit={(t) => {
          setSelectedDetailTransaction(null);
          handleOpenEdit(t);
        }}
        onDelete={async (id) => {
          setSelectedDetailTransaction(null);
          await handleDelete(id);
        }}
        onTogglePaid={async (id) => {
          await handleTogglePaid(id);
          if (selectedDetailTransaction && selectedDetailTransaction.id === id) {
            setSelectedDetailTransaction((prev: any) => (prev ? { ...prev, paid: !prev.paid } : null));
          }
        }}
        formatBRL={formatBRL}
      />
    </div>
  );
}
