'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Repeat,
  CheckCircle2,
  Calendar,
  Wallet,
  Tag,
  CreditCard,
  User,
  Layers,
  ChevronRight,
  SkipForward,
  AlertCircle,
} from 'lucide-react';
import {
  BankNotification,
  dismissNotification,
  markNotificationReconciled,
  parseBRLAmount,
} from '../lib/bankNotificationService';
import { createTransaction } from '../lib/api';
import { TextInput, CurrencyInput, Checkbox, SelectDropdown } from './ui/FormControls';

interface ReconciliationQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: BankNotification[];
  accounts: any[];
  categories: any[];
  people: any[];
  paymentMethods: any[];
  onQueueUpdated: () => void;
  onSuccessTransaction: () => void;
}

export function ReconciliationQueueModal({
  isOpen,
  onClose,
  queue,
  accounts,
  categories,
  people,
  paymentMethods,
  onQueueUpdated,
  onSuccessTransaction,
}: ReconciliationQueueModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalInSession, setTotalInSession] = useState(queue.length);
  const [resolvedInSession, setResolvedInSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa sessão de conciliação
  useEffect(() => {
    if (isOpen) {
      setTotalInSession(queue.length);
      setResolvedInSession(0);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Garante que currentIndex esteja dentro dos limites da fila
  useEffect(() => {
    if (queue.length > 0 && currentIndex >= queue.length) {
      setCurrentIndex(Math.max(0, queue.length - 1));
    }
  }, [queue.length, currentIndex]);

  // Current item form states
  const currentItem: BankNotification | undefined = queue[currentIndex];

  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'REIMBURSEMENT'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0,00');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [personId, setPersonId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paid, setPaid] = useState(true);
  const [totalInstallments, setTotalInstallments] = useState('1');
  const [notes, setNotes] = useState('');

  // Sincroniza formulário com o item atual da fila
  useEffect(() => {
    if (currentItem) {
      setError(null);
      setType(currentItem.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      let autoDesc = '';
      if (currentItem.type === 'INCOME') {
        if (currentItem.paymentMethod === 'Pix' || /pix|transfer[eê]ncia/i.test(currentItem.rawText)) {
          autoDesc = `Pix de ${currentItem.targetOrSource}`;
        } else {
          autoDesc = `Recebimento de ${currentItem.targetOrSource}`;
        }
      } else {
        if (currentItem.paymentMethod === 'Pix' || /pix/i.test(currentItem.rawText)) {
          autoDesc = `Pix para ${currentItem.targetOrSource}`;
        } else if (
          currentItem.paymentMethod === 'Crédito' ||
          currentItem.paymentMethod === 'Débito' ||
          /compra|cart[aã]o/i.test(currentItem.rawText)
        ) {
          autoDesc = `Compra em ${currentItem.targetOrSource}`;
        } else {
          autoDesc = `Pagamento a ${currentItem.targetOrSource}`;
        }
      }
      setDescription(autoDesc);
      setAmount(currentItem.formattedAmount);
      setPurchaseDate(currentItem.date);
      setDueDate(currentItem.date);
      setPaymentMethod(currentItem.paymentMethod || 'Pix');
      setPaid(true);
      setTotalInstallments('1');
      setNotes(
        `Lançamento automático via Notificação ${currentItem.bank} (${currentItem.date} às ${currentItem.time})`
      );

      // Tenta associar carteira correspondente ao banco
      const matchedAccount = accounts.find((a) => {
        const accLower = a.name.toLowerCase();
        const bankLower = currentItem.bank.toLowerCase();
        return (
          accLower.includes(bankLower) ||
          (bankLower === 'nubank' && (accLower.includes('nu') || accLower.includes('roxo'))) ||
          (bankLower === 'bb' && (accLower.includes('brasil') || accLower.includes('bb'))) ||
          (bankLower === 'caixa' && accLower.includes('caixa')) ||
          (bankLower === 'bradesco' && accLower.includes('bradesco')) ||
          (bankLower === 'santander' && accLower.includes('santander')) ||
          (bankLower === 'inter' && accLower.includes('inter')) ||
          (bankLower === 'itaú' && (accLower.includes('itau') || accLower.includes('itaú') || accLower.includes('iti'))) ||
          (bankLower === 'c6 bank' && (accLower.includes('c6') || accLower.includes('c6bank'))) ||
          (bankLower === 'picpay' && accLower.includes('picpay')) ||
          (bankLower === 'mercado pago' && (accLower.includes('mercado') || accLower.includes('mp'))) ||
          (bankLower === 'pagbank' && (accLower.includes('pagbank') || accLower.includes('pagseguro')))
        );
      });
      setAccountId(matchedAccount ? matchedAccount.id : accounts[0]?.id || '');

      // Tenta associar categoria inicial adequada
      const matchingCategory = categories.find((c) =>
        currentItem.type === 'INCOME'
          ? c.isIncome &&
            (c.name.toLowerCase().includes('pix') ||
              c.name.toLowerCase().includes('transferência') ||
              c.name.toLowerCase().includes('receita') ||
              c.name.toLowerCase().includes('outros'))
          : !c.isIncome
      ) || categories.find((c) => (currentItem.type === 'INCOME' ? c.isIncome : !c.isIncome));
      setCategoryId(matchingCategory ? matchingCategory.id : categories[0]?.id || '');

      // Tenta achar pessoa se for contato existente
      const targetLower = currentItem.targetOrSource.toLowerCase();
      const matchedPerson = people.find((p) => {
        const personLower = p.name.toLowerCase();
        return targetLower.includes(personLower) || personLower.includes(targetLower);
      });
      setPersonId(matchedPerson ? matchedPerson.id : '');
    }
  }, [currentIndex, currentItem, accounts, categories, people]);

  if (!isOpen) return null;

  // Se a fila estiver vazia ou terminada
  const isCompleted = queue.length === 0;

  const handleDismissCurrent = () => {
    if (!currentItem) return;
    dismissNotification(currentItem.id);
    setResolvedInSession((prev) => prev + 1);
    onQueueUpdated();
    if (currentIndex >= queue.length - 1) {
      setCurrentIndex(Math.max(0, queue.length - 2));
    }
  };

  const handleSaveAndAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;

    if (!description.trim()) {
      setError('Por favor, informe a descrição.');
      return;
    }
    const cleanAmount = parseBRLAmount(amount);
    if (cleanAmount <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createTransaction({
        description: description.trim(),
        amount: cleanAmount,
        type,
        purchaseDate,
        dueDate,
        categoryId: categoryId || categories[0]?.id || '',
        accountId: accountId || accounts[0]?.id || '',
        personId: personId || null,
        paymentMethod: paymentMethod || 'Pix',
        notes: notes || undefined,
        paid,
        totalInstallments: parseInt(totalInstallments, 10) || 1,
      });

      // Marca notificação como conciliada
      markNotificationReconciled(currentItem.id);
      setResolvedInSession((prev) => prev + 1);
      onQueueUpdated();
      onSuccessTransaction();

      // Ajusta o índice para apontar para o próximo item
      if (currentIndex >= queue.length - 1) {
        setCurrentIndex(Math.max(0, queue.length - 2));
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar transação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/65 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header com barra de progresso da fila */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Fila de Conciliação Bancária
                </h2>
                {!isCompleted && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Item <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.min(resolvedInSession + 1, totalInSession || queue.length)}</span> de <span className="font-bold">{totalInSession || queue.length}</span> ({queue.length} restantes na fila)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {queue.length > 1 && (
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : queue.length - 1))}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Ver anterior"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => (prev < queue.length - 1 ? prev + 1 : 0))}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Pular para a próxima sem dispensar"
                  >
                    →
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Barra de progresso visual */}
          {!isCompleted && totalInSession > 0 && (
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(10, ((resolvedInSession + 1) / (totalInSession || queue.length)) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Estado Concluído (Fila zerada) */}
        {isCompleted ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Fila de Conciliação Limpa!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Todas as transferências detectadas foram resolvidas ou dispensadas com sucesso.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              Voltar ao Painel
            </button>
          </div>
        ) : (
          /* Formulário de Conciliação do Item Atual */
          <form onSubmit={handleSaveAndAdvance} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Card com Detalhes da Notificação Capturada */}
            <div
              className="p-3.5 rounded-2xl border text-left space-y-1.5 relative overflow-hidden transition"
              style={{
                backgroundColor: `${currentItem.bankColor}12`,
                borderColor: `${currentItem.bankColor}35`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: currentItem.bankColor }}
                  >
                    {currentItem.bank}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notificação Push Capturada
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentItem.date} às {currentItem.time}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium">
                "{currentItem.rawText}"
              </p>
            </div>

            {/* Tipo de Registro (Despesa / Receita / A Reembolsar) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Como deseja registrar esta movimentação?
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    type === 'EXPENSE'
                      ? 'bg-white dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-slate-200 dark:border-rose-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  Despesa Própria
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    type === 'INCOME'
                      ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setType('REIMBURSEMENT')}
                  className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    type === 'REIMBURSEMENT'
                      ? 'bg-white dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-amber-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5 text-amber-500" />
                  A Reembolsar
                </button>
              </div>
            </div>

            {/* Descrição e Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <TextInput
                  label="Descrição"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Almoço, Pix fulano..."
                />
              </div>
              <div>
                <CurrencyInput
                  label="Valor (R$)"
                  required
                  value={amount}
                  onChange={(val) => setAmount(val)}
                />
              </div>
            </div>

            {/* Categoria e Carteira (Origem do Dinheiro) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <SelectDropdown
                  label="Categoria"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  leftIcon={<Tag className="w-4 h-4 text-slate-500" />}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isIncome ? '(Receita)' : '(Despesa)'}
                    </option>
                  ))}
                </SelectDropdown>
              </div>

              <div>
                <SelectDropdown
                  label="Conta / Carteira de Origem"
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  leftIcon={<Wallet className="w-4 h-4 text-slate-500" />}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </SelectDropdown>
              </div>
            </div>

            {/* Contato (Terceiro) & Método */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <SelectDropdown
                  label={type === 'REIMBURSEMENT' ? 'Quem vai reembolsar? *' : 'Vincular Contato (opcional)'}
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  leftIcon={<User className="w-4 h-4 text-slate-500" />}
                  required={type === 'REIMBURSEMENT'}
                >
                  <option value="">Nenhum (Despesa exclusiva de Lucas)</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectDropdown>
              </div>

              <div>
                <SelectDropdown
                  label="Método de Pagamento"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  leftIcon={<CreditCard className="w-4 h-4 text-slate-500" />}
                >
                  <option value="Pix">Pix</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Débito">Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </SelectDropdown>
              </div>
            </div>

            {/* Datas da Operação e Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextInput
                label="Data da Operação"
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
              />

              <TextInput
                label="Data de Vencimento"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4 text-amber-500" />}
              />
            </div>

            {/* Status Pago */}
            <div className="pt-1">
              <Checkbox
                label="Transação já liquidada/paga"
                description="Debita ou credita imediatamente no saldo da carteira"
                checked={paid}
                onChange={(val) => setPaid(val)}
              />
            </div>

            {/* Footer com botões de ação e fluxo de fila */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDismissCurrent}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                title="Salva no histórico de dispensadas e vai para a próxima sem lançar"
              >
                <SkipForward className="w-4 h-4" />
                Dispensar esta
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    'Salvando...'
                  ) : currentIndex < queue.length - 1 ? (
                    <>
                      Salvar e Próxima ({currentIndex + 2}/{queue.length}) <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Finalizar Conciliação
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
