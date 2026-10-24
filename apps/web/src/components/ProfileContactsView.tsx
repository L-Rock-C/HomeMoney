'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Link2,
  Unlink,
  UserPlus,
  Send,
  Sparkles,
  LogOut,
  Edit2,
  Trash2,
  KeyRound,
  Check,
  X,
  Clock,
  ArrowRight,
  HandCoins,
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import {
  updateUserProfile,
  linkPersonToUser,
  unlinkPerson,
  fetchContactInvites,
  acceptContactInvite,
  rejectContactInvite,
  createPerson,
  updatePerson,
  deletePerson,
  clearAuthToken,
  fetchBulkDeletePreview,
  executeBulkDelete,
} from '../lib/api';

interface ProfileContactsViewProps {
  currentUser: any;
  people: any[];
  onRefreshData: () => void;
  formatBRL: (val: number) => string;
  pendingTransfers?: any[];
  onOpenTransferModal?: () => void;
  accounts?: any[];
  categories?: any[];
}

export function ProfileContactsView({
  currentUser,
  people,
  onRefreshData,
  formatBRL,
  pendingTransfers = [],
  onOpenTransferModal,
  accounts = [],
  categories = [],
}: ProfileContactsViewProps) {
  const router = useRouter();

  // Tab switch: 'PROFILE' | 'CONTACTS'
  const [subTab, setSubTab] = useState<'PROFILE' | 'CONTACTS'>('CONTACTS');

  // Profile Form state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invites state
  const [invites, setInvites] = useState<{ received: any[]; sent: any[] }>({ received: [], sent: [] });
  const [invitesLoading, setInvitesLoading] = useState(false);

  // Link Modal state
  const [linkingPerson, setLinkingPerson] = useState<any | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  // Contact Modal state (Unified for Create & Edit)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactLoading, setContactLoading] = useState(false);

  // Contacts Table Filter & Search
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilter, setContactFilter] = useState<'ALL' | 'LINKED' | 'LOCAL' | 'PENDING'>('ALL');

  // Danger Zone State
  const [dangerScope, setDangerScope] = useState<'ALL' | 'MONTH' | 'ACCOUNT' | 'CATEGORY' | 'PAID' | 'UNPAID'>('ALL');
  const [dangerMonth, setDangerMonth] = useState('');
  const [dangerAccountId, setDangerAccountId] = useState('');
  const [dangerCategoryId, setDangerCategoryId] = useState('');
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [dangerPreview, setDangerPreview] = useState<{ count: number; totalAmount: number }>({ count: 0, totalAmount: 0 });
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerDeleting, setDangerDeleting] = useState(false);
  const [dangerFeedback, setDangerFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDangerPreview = async () => {
    try {
      setDangerLoading(true);
      const filters: any = { scope: dangerScope };
      if (dangerScope === 'MONTH' && dangerMonth) filters.month = dangerMonth;
      if (dangerScope === 'ACCOUNT' && dangerAccountId) filters.accountId = dangerAccountId;
      if (dangerScope === 'CATEGORY' && dangerCategoryId) filters.categoryId = dangerCategoryId;
      if (dangerScope === 'PAID') filters.paid = true;
      if (dangerScope === 'UNPAID') filters.paid = false;

      const preview = await fetchBulkDeletePreview(filters);
      setDangerPreview(preview);
    } catch (e: any) {
      console.warn('Erro ao carregar prévia da zona de perigo:', e);
    } finally {
      setDangerLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'PROFILE') {
      loadDangerPreview();
    }
  }, [subTab, dangerScope, dangerMonth, dangerAccountId, dangerCategoryId]);

  const handleExecuteBulkDelete = async () => {
    if (dangerConfirmText.trim().toUpperCase() !== 'EXCLUIR') return;
    if (
      !confirm(
        `CONFIRMAÇÃO FINAL: Deseja realmente excluir permanentemente ${dangerPreview.count} transação(ões)? Esta ação não poderá ser desfeita.`
      )
    ) {
      return;
    }
    try {
      setDangerDeleting(true);
      setDangerFeedback(null);
      const filters: any = { scope: dangerScope };
      if (dangerScope === 'MONTH' && dangerMonth) filters.month = dangerMonth;
      if (dangerScope === 'ACCOUNT' && dangerAccountId) filters.accountId = dangerAccountId;
      if (dangerScope === 'CATEGORY' && dangerCategoryId) filters.categoryId = dangerCategoryId;
      if (dangerScope === 'PAID') filters.paid = true;
      if (dangerScope === 'UNPAID') filters.paid = false;

      const res = await executeBulkDelete(filters);
      setDangerFeedback({
        type: 'success',
        text: `Sucesso! ${res.deletedCount} transação(ões) foram excluídas definitivamente.`,
      });
      setDangerConfirmText('');
      onRefreshData();
      await loadDangerPreview();
    } catch (e: any) {
      setDangerFeedback({
        type: 'error',
        text: e?.message || 'Falha ao executar exclusão em massa.',
      });
    } finally {
      setDangerDeleting(false);
    }
  };

  // Load invites
  const loadInvites = async () => {
    try {
      setInvitesLoading(true);
      const data = await fetchContactInvites();
      setInvites(data);
    } catch (e) {
      // non-fatal
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);

    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('A nova senha e a confirmação não coincidem.');
      }
      if (newPassword && newPassword.length < 4) {
        throw new Error('A nova senha deve ter no mínimo 4 caracteres.');
      }

      await updateUserProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });

      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onRefreshData();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Falha ao atualizar perfil.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Link Contact to Real User
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingPerson) return;
    setLinkError('');
    setLinkSuccess('');
    setLinkLoading(true);

    try {
      if (!linkEmail.trim() || !linkEmail.includes('@')) {
        throw new Error('Informe um e-mail válido para vincular.');
      }

      const res = await linkPersonToUser(linkingPerson.id, linkEmail.trim());
      setLinkSuccess(res.message || 'Contato vinculado com sucesso!');
      onRefreshData();
      loadInvites();
      setTimeout(() => {
        setLinkingPerson(null);
        setLinkEmail('');
        setLinkSuccess('');
      }, 1200);
    } catch (err: any) {
      setLinkError(err.message || 'Não foi possível vincular o contato.');
    } finally {
      setLinkLoading(false);
    }
  };

  // Handle Unlink Contact
  const handleUnlink = async (person: any) => {
    if (!confirm(`Deseja desvincular o contato "${person.name}" do usuário "${person.linkedUser?.name || 'real'}"?`)) {
      return;
    }
    try {
      await unlinkPerson(person.id);
      onRefreshData();
      loadInvites();
    } catch (err: any) {
      alert(err.message || 'Erro ao desvincular contato.');
    }
  };

  // Handle Accept Invite
  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptContactInvite(inviteId);
      loadInvites();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao aceitar convite.');
    }
  };

  // Handle Reject Invite
  const handleRejectInvite = async (inviteId: string) => {
    try {
      await rejectContactInvite(inviteId);
      loadInvites();
    } catch (err: any) {
      alert(err.message || 'Erro ao recusar convite.');
    }
  };

  // Open Contact Modal for Creation
  const handleOpenCreateContact = () => {
    setEditingPerson(null);
    setContactName('');
    setContactNotes('');
    setContactEmail('');
    setContactError('');
    setIsContactModalOpen(true);
  };

  // Open Contact Modal for Editing
  const handleOpenEditContact = (person: any) => {
    setEditingPerson(person);
    setContactName(person.name || '');
    setContactNotes(person.notes || '');
    setContactEmail(person.linkedUser?.email || '');
    setContactError('');
    setIsContactModalOpen(true);
  };

  // Handle Save Contact (Create or Edit)
  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactLoading(true);

    try {
      if (!contactName.trim()) {
        throw new Error('O nome do contato é obrigatório.');
      }

      if (editingPerson) {
        // 1. Atualizar dados cadastrais
        await updatePerson(editingPerson.id, {
          name: contactName.trim(),
          notes: contactNotes.trim() || null,
        });

        // 2. Tratar vinculação de usuário real
        const prevEmail = (editingPerson.linkedUser?.email || '').trim().toLowerCase();
        const nextEmail = contactEmail.trim().toLowerCase();

        if (prevEmail !== nextEmail) {
          if (!nextEmail && prevEmail) {
            // E-mail limpo: desvincular
            await unlinkPerson(editingPerson.id);
          } else if (nextEmail) {
            // Novo e-mail fornecido: vincular / convidar
            await linkPersonToUser(editingPerson.id, nextEmail);
          }
        }
      } else {
        // Criar novo contato
        const created = await createPerson({
          name: contactName.trim(),
          notes: contactNotes.trim() || null,
        });

        if (contactEmail.trim() && created?.id) {
          await linkPersonToUser(created.id, contactEmail.trim().toLowerCase()).catch(() => {});
        }
      }

      setIsContactModalOpen(false);
      setEditingPerson(null);
      setContactName('');
      setContactNotes('');
      setContactEmail('');
      onRefreshData();
      loadInvites();
    } catch (err: any) {
      setContactError(err.message || 'Erro ao salvar contato.');
    } finally {
      setContactLoading(false);
    }
  };

  // Handle Delete Contact
  const handleDeleteContact = async (person: any) => {
    if (person.netBalance && Math.abs(person.netBalance) > 0.009) {
      alert(
        `Não é possível excluir "${person.name}" porque há saldo pendente de ${formatBRL(
          person.netBalance
        )}. Faça a liquidação/acerto de contas antes.`
      );
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o contato "${person.name}"?`)) {
      try {
        await deletePerson(person.id);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir contato');
      }
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair da sua conta?')) {
      clearAuthToken();
      router.push('/login');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-sm w-full max-w-full">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg sm:text-xl shadow-lg shadow-emerald-500/20 shrink-0">
            {(currentUser?.name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name || 'Lucas'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                Conta Ativa
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {currentUser?.email || 'lucas@homemoney.com'}
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher & Logout */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto max-w-full scrollbar-none">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex-1 sm:flex-none">
            <button
              onClick={() => setSubTab('CONTACTS')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                subTab === 'CONTACTS'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Contatos & Vínculos</span>
              {people.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                  {people.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab('PROFILE')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                subTab === 'PROFILE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Meu Perfil</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shadow-sm"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONTATOS & VÍNCULOS COM USUÁRIOS REAIS */}
      {/* ========================================================================= */}
      {subTab === 'CONTACTS' && (
        <div className="space-y-6">
          {/* Hero Explanatory Card */}
          <div className="p-5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-2xl">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Conexão Bilateral entre Usuários Reais
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Vincule seus contatos (ex: <strong>Lelê</strong>, amigos ou familiares) a usuários cadastrados no HomeMoney.
                  Isso permite compartilhar gastos, atribuir pagamentos e sincronizar acertos de contas com total transparência para ambos.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenCreateContact}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Contato</span>
            </button>
          </div>

          {/* Pending Transfer Notifications Banner */}
          {pendingTransfers.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/10 border border-amber-500/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <HandCoins className="w-4 h-4" />
                  <span>Transferências & Reembolsos Recebidos ({pendingTransfers.length})</span>
                </div>
                {onOpenTransferModal && (
                  <button
                    onClick={onOpenTransferModal}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Reconhecer tudo <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pendingTransfers.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {item.sender?.name || 'Contato'}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {formatBRL(item.amount)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                        &ldquo;{item.description}&rdquo;
                      </span>
                    </div>

                    {onOpenTransferModal && (
                      <button
                        onClick={onOpenTransferModal}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-xs whitespace-nowrap shadow-xs transition cursor-pointer shrink-0"
                      >
                        Reconhecer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Incoming Invites Banner */}
          {invites.received.filter((i) => i.status === 'PENDING').length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span>Convites de Conexão Recebidos ({invites.received.filter((i) => i.status === 'PENDING').length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {invites.received
                  .filter((i) => i.status === 'PENDING')
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {inv.senderName}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          {inv.senderEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcceptInvite(inv.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleRejectInvite(inv.id)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 text-xs transition"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Contacts Table Controls: Search & Tabs */}
          {(() => {
            const filteredContacts = people.filter((p) => {
              const searchLower = contactSearch.toLowerCase();
              const matches =
                p.name.toLowerCase().includes(searchLower) ||
                (p.notes && p.notes.toLowerCase().includes(searchLower)) ||
                (p.linkedUser?.name && p.linkedUser.name.toLowerCase().includes(searchLower)) ||
                (p.linkedUser?.email && p.linkedUser.email.toLowerCase().includes(searchLower));
              if (!matches) return false;

              if (contactFilter === 'LINKED') return Boolean(p.linkedUser || p.linkedUserId);
              if (contactFilter === 'LOCAL') return !p.linkedUser && !p.linkedUserId;
              if (contactFilter === 'PENDING') return (p.netBalance && p.netBalance !== 0) || (p.toReceive > 0 || p.toPay > 0);
              return true;
            });

            return (
              <div className="space-y-4">
                {/* Search & Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, e-mail, notas..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => setContactFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        contactFilter === 'ALL'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Todos ({people.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactFilter('LINKED')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        contactFilter === 'LINKED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Vinculados ({people.filter((p) => p.linkedUser || p.linkedUserId).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactFilter('LOCAL')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        contactFilter === 'LOCAL'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Locais ({people.filter((p) => !p.linkedUser && !p.linkedUserId).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactFilter('PENDING')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        contactFilter === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Com Pendências ({people.filter((p) => (p.netBalance && p.netBalance !== 0) || (p.toReceive > 0 || p.toPay > 0)).length})
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm w-full max-w-full">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto w-full max-w-full">
                    <table className="w-full text-left text-sm min-w-[650px]">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Contato</th>
                          <th className="py-3 px-4">Vínculo HomeMoney</th>
                          <th className="py-3 px-4">Saldo Pendente</th>
                          <th className="py-3 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                        {filteredContacts.map((person) => {
                          const isLinked = !!person.linkedUser || !!person.linkedUserId;
                          return (
                            <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                              {/* Contato Info */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                                      isLinked
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {person.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                        {person.name}
                                      </span>
                                      {isLinked && (
                                        <span title="Vinculado a usuário HomeMoney" className="text-emerald-500 shrink-0">
                                          <Link2 className="w-3.5 h-3.5" />
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">
                                      {person.notes || 'Sem observações'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Vínculo HomeMoney */}
                              <td className="py-3.5 px-4">
                                {isLinked ? (
                                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-semibold truncate max-w-[220px]">
                                      {person.linkedUser?.name || 'Usuário Real'} ({person.linkedUser?.email || 'vinculado'})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlink(person)}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition ml-1"
                                      title="Desvincular usuário"
                                    >
                                      <Unlink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                                      Contato local
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditContact(person)}
                                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Link2 className="w-3 h-3" />
                                      Vincular
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Saldo Pendente */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                                    person.netBalance > 0
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : person.netBalance < 0
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {formatBRL(person.netBalance || 0)}
                                </span>
                              </td>

                              {/* Ações */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditContact(person)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Editar contato"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteContact(person)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                    title="Excluir contato"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredContacts.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                              Nenhum contato encontrado para este filtro.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact View (100% width, no horizontal scroll) */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredContacts.map((person) => {
                      const isLinked = !!person.linkedUser || !!person.linkedUserId;
                      return (
                        <div
                          key={person.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                                isLinked
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {person.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                                  {person.name}
                                </span>
                                {isLinked && <Link2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {isLinked ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 truncate">
                                    {person.linkedUser?.email || 'Vinculado'}
                                  </span>
                                ) : (
                                  <span className="truncate">Local</span>
                                )}
                                <span>•</span>
                                <span
                                  className={`font-mono font-bold ${
                                    person.netBalance > 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : person.netBalance < 0
                                      ? 'text-rose-500'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {formatBRL(person.netBalance || 0)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditContact(person)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(person)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredContacts.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        Nenhum contato encontrado para este filtro.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MEU PERFIL & SEGURANÇA */}
      {/* ========================================================================= */}
      {subTab === 'PROFILE' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dados Pessoais & Login
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Atualize seu nome de exibição, e-mail de acesso e senha da conta.
              </p>
            </div>

            {profileMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 min-w-4" />
                ) : (
                  <AlertCircle className="w-4 h-4 min-w-4" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail de Login
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Alterar Senha (Opcional)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mín. 4 caracteres"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {newPassword && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-60 cursor-pointer"
                >
                  {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Zona de Perigo: Exclusão em Massa de Transações com Filtros */}
          <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-5">
            <div className="flex items-start gap-3 border-b border-rose-200/80 dark:border-rose-900/60 pb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <span>Zona de Perigo: Exclusão em Massa</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                    IRREVERSÍVEL
                  </span>
                </h3>
                <p className="text-xs text-rose-600/80 dark:text-rose-300/80 mt-0.5">
                  Exclua permanentemente transações financeiras da sua conta. Você pode escolher limpar todo o histórico ou filtrar por período, carteira, categoria ou status.
                </p>
              </div>
            </div>

            {dangerFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs animate-in fade-in ${
                  dangerFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold'
                }`}
              >
                {dangerFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 min-w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 min-w-4 text-rose-600 shrink-0" />
                )}
                <span>{dangerFeedback.text}</span>
              </div>
            )}

            {/* Filtros da Zona de Perigo */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                1. Selecione o Escopo da Exclusão
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'ALL', label: 'Tudo (Total)' },
                  { id: 'MONTH', label: 'Por Mês' },
                  { id: 'ACCOUNT', label: 'Por Carteira' },
                  { id: 'CATEGORY', label: 'Por Categoria' },
                  { id: 'PAID', label: 'Apenas Pagas' },
                  { id: 'UNPAID', label: 'Apenas Pendentes' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDangerScope(item.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      dangerScope === item.id
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Sub-filtros conforme o escopo */}
              {dangerScope === 'MONTH' && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mês de Referência (YYYY-MM):
                  </label>
                  <input
                    type="month"
                    value={dangerMonth}
                    onChange={(e) => setDangerMonth(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {dangerScope === 'ACCOUNT' && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Carteira / Conta:
                  </label>
                  <select
                    value={dangerAccountId}
                    onChange={(e) => setDangerAccountId(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Todas as carteiras</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {dangerScope === 'CATEGORY' && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria:
                  </label>
                  <select
                    value={dangerCategoryId}
                    onChange={(e) => setDangerCategoryId(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Prévia dos Dados */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Transações encontradas para o filtro selecionado:
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {dangerLoading ? 'Calculando...' : `${dangerPreview.count} itens (${formatBRL(dangerPreview.totalAmount)})`}
              </span>
            </div>

            {/* Confirmação de Segurança */}
            <div className="space-y-3 pt-2 border-t border-rose-200/80 dark:border-rose-900/60">
              <div>
                <label className="block text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1">
                  2. Para confirmar a exclusão irreversível, digite &ldquo;EXCLUIR&rdquo; abaixo:
                </label>
                <input
                  type="text"
                  value={dangerConfirmText}
                  onChange={(e) => setDangerConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full px-3 py-2 text-xs uppercase font-mono tracking-wider bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-xl text-rose-700 dark:text-rose-300 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="button"
                disabled={
                  dangerConfirmText.trim().toUpperCase() !== 'EXCLUIR' ||
                  dangerPreview.count === 0 ||
                  dangerDeleting
                }
                onClick={handleExecuteBulkDelete}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {dangerDeleting
                  ? 'Excluindo transações permanentemente...'
                  : `Excluir Definitivamente (${dangerPreview.count} transações)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Vincular Contato a Usuário Real */}
      {/* ========================================================================= */}
      {linkingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Vincular a Usuário Real
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Contato: <strong className="text-emerald-600 dark:text-emerald-400">{linkingPerson.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLinkingPerson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o e-mail cadastrado desse usuário no HomeMoney. Assim que conectado, despesas e reembolsos poderão ser sincronizados entre ambas as contas.
            </p>

            {linkError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 min-w-4" />
                <span>{linkError}</span>
              </div>
            )}

            {linkSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 min-w-4" />
                <span>{linkSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail do Usuário Real
                </label>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="ex: lele@homemoney.com"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkingPerson(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={linkLoading}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {linkLoading ? 'Vinculando...' : 'Confirmar Vínculo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Contato (Criar e Editar) */}
      {/* ========================================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {editingPerson ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingPerson ? `Editar Contato: ${editingPerson.name}` : 'Adicionar Novo Contato'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingPerson
                      ? 'Atualize o nome, observações e a vinculação de conta real'
                      : 'Cadastre amigos, familiares ou pessoas com quem divide despesas'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contactError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 min-w-4" />
                <span>{contactError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Lelê, Matheus, Clara..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Ex: Namorada, colega de apê..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    E-mail do Usuário Real (Vinculação)
                  </label>
                  {editingPerson?.linkedUser && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Atualmente vinculado
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ex: lele@homemoney.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {editingPerson?.linkedUser
                    ? 'Para desvincular este usuário, basta apagar o e-mail acima e salvar.'
                    : 'Insira o e-mail de um usuário cadastrado para enviar convite e sincronizar acertos de conta.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingPerson ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsContactModalOpen(false);
                      handleDeleteContact(editingPerson);
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    {contactLoading ? 'Salvando...' : editingPerson ? 'Salvar Alterações' : 'Criar Contato'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
