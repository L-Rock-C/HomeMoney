'use client';

export interface BankNotification {
  id: string;
  bank: 'Nubank' | 'BB' | 'Caixa' | 'Bradesco' | 'Santander' | 'Inter';
  bankColor: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  formattedAmount: string;
  targetOrSource: string;
  paymentMethod: 'Pix' | 'Crédito' | 'Débito' | 'Transferência';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  rawText: string;
  status: 'PENDING' | 'RECONCILED' | 'DISMISSED';
  reconciledAt?: string;
  dismissedAt?: string;
}

export interface BankRule {
  bank: BankNotification['bank'];
  color: string;
  packages: string[];
  patterns: {
    type: 'EXPENSE' | 'INCOME';
    method: 'Pix' | 'Crédito' | 'Débito' | 'Transferência';
    regex: RegExp;
    extract: (match: RegExpMatchArray) => {
      amount: number;
      targetOrSource: string;
    };
  }[];
}

// ============================================================================
// Regras de Expressões Regulares dos Principais Bancos Brasileiros
// ============================================================================
export const BANK_RULES: BankRule[] = [
  // 1. NUBANK
  {
    bank: 'Nubank',
    color: '#820AD1',
    packages: ['com.nu.production', 'com.nubank'],
    patterns: [
      // Pix Enviado: "Você transferiu R$ 80,00 para Allison Araújo no Pix." ou "Pix enviado: R$ 80,00 para Fulano"
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:transferiu|enviou|pagou|transfer[eê]ncia|pix).*?R\$\s*([0-9.,]+).*?(?:para|a)\s+([^.]+?)(?:\s+(?:no|via|pelo)\s+Pix|\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Padrão genérico de Pix enviado: "R$ 80,00 para Allison Araújo no Pix"
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /R\$\s*([0-9.,]+)\s+(?:enviado\s+)?para\s+([^.]+?)(?:\s+(?:no|via|pelo)\s+Pix|\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão: "Compra de R$ 35,50 aprovada no cartão Nubank em Mercado Central."
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /(?:compra|pagamento).*?R\$\s*([0-9.,]+).*?(?:em|no|na)\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido / Transferência Recebida: "Você recebeu uma transferência de R$ 150,00 de Fulano." ou "Fulano te enviou um Pix de R$ 150,00"
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebida|recebido|te\s+enviou).*?R\$\s*([0-9.,]+)(?:.*?(?:de|por)\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => {
          let sender = m[2];
          if (!sender && m.input) {
            const beforeMatch = m.input.match(/^([^.]+?)\s+te\s+enviou/i);
            if (beforeMatch) sender = beforeMatch[1];
          }
          return {
            amount: parseBRLAmount(m[1]),
            targetOrSource: cleanName(sender || 'Transferência Nubank'),
          };
        },
      },
    ],
  },

  // 2. BANCO DO BRASIL (BB)
  {
    bank: 'BB',
    color: '#FBF800',
    packages: ['br.com.bb.android', 'bancodobrasil'],
    patterns: [
      // Pix Enviado: "BB: Pix enviado no valor de R$ 120,00 para Carlos Alberto."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Pix\s+(?:enviado|realizado).*?(?:valor\s+de\s+)?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão Ourocard: "BB: Compra com Ourocard aprovada R$ 54,90 em Padaria Sao Jose."
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /compra.*?(?:aprovada|realizada)\s+R\$\s*([0-9.,]+)\s+em\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido: "BB: Pix recebido no valor de R$ 200,00 de Marina Souza."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /Pix\s+recebido.*?(?:valor\s+de\s+)?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência BB'),
        }),
      },
    ],
  },

  // 3. CAIXA ECONÔMICA FEDERAL
  {
    bank: 'Caixa',
    color: '#005CA9',
    packages: ['br.com.gabba.Caixa', 'br.gov.caixa.tem'],
    patterns: [
      // Pix Enviado: "CAIXA: Transferencia Pix de R$ 50,00 realizada com sucesso para Drogaria Pacheco."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Transfer[eê]ncia\s+Pix\s+de\s+R\$\s*([0-9.,]+)\s+realizada.*?(?:para)\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão Débito/Crédito: "CAIXA: Compra aprovada de R$ 99,00 no cartao em Supermercado Guanabara."
      {
        type: 'EXPENSE',
        method: 'Débito',
        regex: /Compra\s+aprovada\s+de\s+R\$\s*([0-9.,]+)\s+no\s+cart[aã]o.*?(?:em)\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido: "CAIXA: Pix recebido no valor de R$ 300,00 de Empresa XYZ."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /Pix\s+recebido\s+no\s+valor\s+de\s+R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Caixa'),
        }),
      },
    ],
  },

  // 4. BRADESCO
  {
    bank: 'Bradesco',
    color: '#CC092F',
    packages: ['com.bradesco', 'com.bradesco.cartoes'],
    patterns: [
      // Pix Enviado: "Bradesco: Pix enviado no valor de R$ 75,00 para Marcos Silva."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Pix\s+enviado\s+no\s+valor\s+de\s+R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão: "Bradesco Cartões: Compra aprovada de R$ 110,00 em Posto Ipiranga."
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /Compra\s+aprovada\s+de\s+R\$\s*([0-9.,]+)\s+em\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido: "Bradesco: Pix recebido no valor de R$ 45,00 de Rafael Lima."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /Pix\s+recebido\s+no\s+valor\s+de\s+R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Bradesco'),
        }),
      },
    ],
  },

  // 5. SANTANDER
  {
    bank: 'Santander',
    color: '#EC0000',
    packages: ['com.santander.app', 'com.santander.way'],
    patterns: [
      // Pix Enviado: "Santander: Pix enviado de R$ 85,00 para Maria Silva."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Pix\s+enviado\s+de\s+R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão Santander Way: "Santander Way: Compra aprovada de R$ 62,00 no cartao em Farmacia Drogasil."
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /Compra\s+aprovada\s+de\s+R\$\s*([0-9.,]+).*?(?:em)\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido: "Santander: Voce recebeu um Pix de R$ 500,00 de Joao Pedro."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /recebeu\s+um\s+Pix\s+de\s+R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Santander'),
        }),
      },
    ],
  },

  // 6. BANCO INTER
  {
    bank: 'Inter',
    color: '#FF7A00',
    packages: ['br.com.intermedium'],
    patterns: [
      // Pix Enviado: "Inter: Pix de R$ 95,00 enviado para Jose Carlos."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Pix\s+de\s+R\$\s*([0-9.,]+)\s+enviado\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão: "Inter: Compra no credito aprovada R$ 42,00 em Lanchonete da Esquina."
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /Compra.*?aprovada\s+R\$\s*([0-9.,]+)\s+em\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido: "Inter: Voce recebeu um Pix de R$ 180,00 de Paula Oliveira."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /recebeu\s+um\s+Pix\s+de\s+R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Inter'),
        }),
      },
    ],
  },
];

// Helper: parse string amount like "80,00" or "1.250,50" to float
function parseBRLAmount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function cleanName(str: string): string {
  if (!str) return 'Pagamento';
  return str.trim().replace(/[.,;]+$/, '');
}

// ============================================================================
// Parser Universal de Notificações Bancárias
// ============================================================================
export function parseBankNotificationText(
  text: string,
  explicitBank?: BankNotification['bank'],
  dateOverride?: string,
  timeOverride?: string
): BankNotification | null {
  const now = new Date();
  const dateStr = dateOverride || now.toISOString().split('T')[0];
  const timeStr =
    timeOverride ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const banksToCheck = explicitBank
    ? BANK_RULES.filter((b) => b.bank === explicitBank)
    : BANK_RULES;

  for (const bankRule of banksToCheck) {
    for (const pattern of bankRule.patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const { amount, targetOrSource } = pattern.extract(match);
        if (amount > 0) {
          const formatted = amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          return {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            bank: bankRule.bank,
            bankColor: bankRule.color,
            type: pattern.type,
            amount,
            formattedAmount: formatted,
            targetOrSource,
            paymentMethod: pattern.method,
            date: dateStr,
            time: timeStr,
            rawText: text,
            status: 'PENDING',
          };
        }
      }
    }
  }

  // ============================================================================
  // Fallback Universal: Captura qualquer notificação bancária com valor em R$
  // ============================================================================
  const moneyMatch = text.match(/R\$\s*([0-9.,]+)/i) || text.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/);
  if (moneyMatch) {
    const amount = parseBRLAmount(moneyMatch[1]);
    if (amount > 0) {
      const isIncome = /(?:recebeu|recebida|recebido|crédito|depositado|reembolso|te\s+enviou)/i.test(text);
      let targetOrSource = isIncome ? 'Transferência Recebida' : 'Transferência Enviada';

      if (isIncome) {
        const fromMatch = text.match(/(?:de|de\s+parte\s+de|por)\s+([A-Za-zÀ-ÿ\s0-9]{2,35})/i);
        if (fromMatch) targetOrSource = cleanName(fromMatch[1]);
      } else {
        const toMatch = text.match(/(?:para|a|em|no|na)\s+([A-Za-zÀ-ÿ\s0-9]{2,35})/i);
        if (toMatch) targetOrSource = cleanName(toMatch[1]);
      }

      const isPix = /pix/i.test(text);
      const isCard = /(?:cartão|cartao|credito|crédito|debito|débito|compra)/i.test(text);
      const paymentMethod = isPix ? 'Pix' : isCard ? 'Crédito' : 'Transferência';

      const bank = explicitBank || 'Nubank';
      const bankRule = BANK_RULES.find((b) => b.bank === bank) || BANK_RULES[0];
      const formatted = amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        bank: bankRule.bank,
        bankColor: bankRule.color,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        amount,
        formattedAmount: formatted,
        targetOrSource,
        paymentMethod,
        date: dateStr,
        time: timeStr,
        rawText: text,
        status: 'PENDING',
      };
    }
  }

  return null;
}

// ============================================================================
// Storage & Gerenciamento Local de Fila e Notificações Dispensadas
// ============================================================================
const STORAGE_KEY = 'homemoney_bank_notifications_v1';

export function getStoredNotifications(): BankNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredNotifications(list: BankNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getPendingQueue(): BankNotification[] {
  return getStoredNotifications().filter((n) => n.status === 'PENDING');
}

export function getDismissedHistory(): BankNotification[] {
  return getStoredNotifications().filter((n) => n.status === 'DISMISSED');
}

export function dismissNotification(id: string): BankNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) =>
    n.id === id ? { ...n, status: 'DISMISSED' as const, dismissedAt: new Date().toISOString() } : n
  );
  saveStoredNotifications(updated);
  return updated;
}

export function restoreNotification(id: string): BankNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) =>
    n.id === id ? { ...n, status: 'PENDING' as const, dismissedAt: undefined } : n
  );
  saveStoredNotifications(updated);
  return updated;
}

export function markNotificationReconciled(id: string): BankNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) =>
    n.id === id ? { ...n, status: 'RECONCILED' as const, reconciledAt: new Date().toISOString() } : n
  );
  saveStoredNotifications(updated);
  return updated;
}

export function clearDismissedHistory(): BankNotification[] {
  const current = getStoredNotifications();
  const updated = current.filter((n) => n.status !== 'DISMISSED');
  saveStoredNotifications(updated);
  return updated;
}

export function addIncomingNotification(notif: BankNotification): BankNotification[] {
  const current = getStoredNotifications();
  const existingIndex = current.findIndex(
    (n) =>
      n.id === notif.id ||
      (n.rawText === notif.rawText &&
        n.time === notif.time &&
        n.date === notif.date &&
        Math.abs(n.amount - notif.amount) < 0.01)
  );

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    if (existing.status === 'DISMISSED') {
      current[existingIndex] = {
        ...existing,
        status: 'PENDING',
        dismissedAt: undefined,
      };
      saveStoredNotifications(current);
    }
    return current;
  }

  const updated = [notif, ...current];
  saveStoredNotifications(updated);
  return updated;
}

// ============================================================================
// Status e Ações da Ponte Nativa Android
// ============================================================================
export interface AndroidBridgeStatus {
  isAvailable: boolean;
  isPermissionGranted: boolean;
}

export function getAndroidBridgeStatus(): AndroidBridgeStatus {
  if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
    try {
      const granted = Boolean((window as any).AndroidNotificationBridge.isNotificationAccessGranted());
      return { isAvailable: true, isPermissionGranted: granted };
    } catch {
      return { isAvailable: true, isPermissionGranted: false };
    }
  }
  return { isAvailable: false, isPermissionGranted: false };
}

export function openAndroidNotificationSettings(): boolean {
  if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
    try {
      (window as any).AndroidNotificationBridge.openNotificationSettings();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function triggerAndroidNotificationCheck(): boolean {
  if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
    try {
      if (typeof (window as any).AndroidNotificationBridge.checkNotificationsNow === 'function') {
        (window as any).AndroidNotificationBridge.checkNotificationsNow();
      }
      if (typeof (window as any).AndroidNotificationBridge.getPendingNotificationsJson === 'function') {
        const directJson = (window as any).AndroidNotificationBridge.getPendingNotificationsJson();
        if (directJson && directJson !== '[]') {
          const parsed = JSON.parse(directJson);
          processIncomingAndroidNotificationItems(parsed);
        }
      }
      return true;
    } catch (e) {
      console.warn('Erro ao chamar checkNotificationsNow:', e);
    }
  }
  return false;
}

export function checkAndroidPendingReconciliation(): boolean {
  if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
    try {
      if (typeof (window as any).AndroidNotificationBridge.consumePendingOpenReconciliation === 'function') {
        return Boolean((window as any).AndroidNotificationBridge.consumePendingOpenReconciliation());
      }
    } catch {}
  }
  return false;
}

export function requestAndroidNotificationPermission(): void {
  if (typeof window !== 'undefined' && (window as any).AndroidNotificationBridge) {
    try {
      if (typeof (window as any).AndroidNotificationBridge.requestPostNotificationPermission === 'function') {
        (window as any).AndroidNotificationBridge.requestPostNotificationPermission();
      }
    } catch {}
  }
}

function createFallbackBankNotification(item: any, status: 'PENDING' | 'DISMISSED'): BankNotification {
  const bank = (item.bank as BankNotification['bank']) || 'Nubank';
  const bankRule = BANK_RULES.find((b) => b.bank === bank) || BANK_RULES[0];
  const now = new Date();
  const dateStr = item.date || now.toISOString().split('T')[0];
  const timeStr = item.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const text = item.text || item.title || 'Notificação Bancária';
  const title = item.title || '';
  const combined = title ? `${title} ${text}` : text;

  const numberMatch = combined.match(/R\$\s*([0-9.,]+)/i) || combined.match(/([0-9]+[.,][0-9]{2})/);
  const amount = numberMatch ? parseBRLAmount(numberMatch[1]) : 0;
  const formattedAmount = amount > 0
    ? amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  const isIncome = /(?:recebeu|recebida|recebido|crédito|depositado|reembolso|te\s+enviou)/i.test(combined);

  return {
    id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    bank,
    bankColor: bankRule.color,
    type: isIncome ? 'INCOME' : 'EXPENSE',
    amount,
    formattedAmount,
    targetOrSource: title || 'Transferência Bancária',
    paymentMethod: /pix/i.test(combined) ? 'Pix' : 'Transferência',
    date: dateStr,
    time: timeStr,
    rawText: combined,
    status,
    dismissedAt: status === 'DISMISSED' ? new Date().toISOString() : undefined,
  };
}

export function processIncomingAndroidNotificationItems(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return;

  const current = getStoredNotifications();
  let changed = false;

  for (const item of items) {
    const text = item.text || '';
    const title = item.title || '';
    const fullText = title ? `${title}: ${text}` : text;

    let notif =
      parseBankNotificationText(
        text,
        item.bank as BankNotification['bank'],
        item.date,
        item.time
      ) ||
      parseBankNotificationText(
        fullText,
        item.bank as BankNotification['bank'],
        item.date,
        item.time
      ) ||
      parseBankNotificationText(
        title,
        item.bank as BankNotification['bank'],
        item.date,
        item.time
      );

    if (!notif) {
      notif = createFallbackBankNotification(item, 'PENDING');
    }

    if (item.id) {
      notif.id = item.id;
    }

    // Procura se já existe no armazenamento local (por ID ou por conteúdo exato no mesmo minuto)
    const existingIndex = current.findIndex(
      (n) =>
        (item.id && n.id === item.id) ||
        (n.rawText === notif!.rawText &&
          n.time === notif!.time &&
          n.date === notif!.date &&
          Math.abs(n.amount - notif!.amount) < 0.01)
    );

    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      // Se a notificação foi dispensada anteriormente, mas continua ativa na bandeja do celular
      // ou foi reescaneada no botão de atualizar, restaura para PENDING para permitir conciliar!
      if (existing.status === 'DISMISSED') {
        current[existingIndex] = {
          ...existing,
          status: 'PENDING',
          dismissedAt: undefined,
        };
        changed = true;
      }
    } else {
      current.unshift(notif);
      changed = true;
    }
  }

  if (changed) {
    saveStoredNotifications(current);
    window.dispatchEvent(new Event('homemoney_queue_updated'));
  }
}

// ============================================================================
// Ouvinte do Evento Nativo do Android (Capacitor Bridge)
// ============================================================================
if (typeof window !== 'undefined') {
  window.addEventListener('homemoney_android_notifications', (e: any) => {
    try {
      const raw = e.detail;
      const parsedArray = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsedArray)) {
        processIncomingAndroidNotificationItems(parsedArray);
      }
    } catch (err) {
      console.error('Erro ao processar notificações do Android:', err);
    }
  });

  window.addEventListener('homemoney_android_dismissed_notifications', (e: any) => {
    try {
      const raw = e.detail;
      const parsedArray = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsedArray)) {
        const current = getStoredNotifications();
        for (const item of parsedArray) {
          const text = item.text || '';
          const notifId = item.id;

          const existing = current.find(
            (n) => (notifId && n.id === notifId) || (text && n.rawText.includes(text))
          );

          if (existing) {
            dismissNotification(existing.id);
          } else {
            let dismissedNotif =
              parseBankNotificationText(text, item.bank as BankNotification['bank'], item.date, item.time) ||
              createFallbackBankNotification(item, 'DISMISSED');
            dismissedNotif.status = 'DISMISSED';
            dismissedNotif.dismissedAt = new Date().toISOString();
            if (notifId) dismissedNotif.id = notifId;
            saveStoredNotifications([dismissedNotif, ...getStoredNotifications()]);
          }
        }
        window.dispatchEvent(new Event('homemoney_queue_updated'));
      }
    } catch (err) {
      console.error('Erro ao processar notificações dispensadas do Android:', err);
    }
  });
}


