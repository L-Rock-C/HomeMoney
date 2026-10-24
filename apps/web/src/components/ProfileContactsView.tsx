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
} from '../lib/api';

interface ProfileContactsViewProps {
  currentUser: any;
  people: any[];
  onRefreshData: () => void;
  formatBRL: (val: number) => string;
  pendingTransfers?: any[];
  onOpenTransferModal?: () => void;
}

export function ProfileContactsView({
  currentUser,
  people,
  onRefreshData,
  formatBRL,
  pendingTransfers = [],
  onOpenTransferModal,
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

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map((person) => {
              const isLinked = !!person.linkedUser || !!person.linkedUserId;

              return (
                <div
                  key={person.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Contact Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                            isLinked
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {person.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {person.name}
                            {isLinked && (
                              <span title="Vinculado a usuário real" className="inline-flex">
                                <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] text-slate-400 block line-clamp-1">
                            {person.notes || 'Sem observações'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditContact(person)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Editar Contato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(person)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Excluir Contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Saldo Pendente:</span>
                      <span
                        className={`font-mono font-bold ${
                          person.netBalance > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : person.netBalance < 0
                            ? 'text-rose-500'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {formatBRL(person.netBalance)}
                      </span>
                    </div>

                    {/* Link Status Pill */}
                    <div className="mt-3">
                      {isLinked ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
                              Usuário Vinculado
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                              {person.linkedUser?.name || 'Usuário Real'} ({person.linkedUser?.email || 'vinculado'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditContact(person)}
                              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
                              title="Editar contato e vínculo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlink(person)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Desvincular usuário"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Contato local
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditContact(person)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Vincular usuário</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
