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
    packages: ['com.nu.production'],
    patterns: [
      // Pix Enviado: "Você transferiu R$ 80,00 para Allison Araújo no Pix."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:transferiu|enviou)\s+R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\s+no\s+Pix|\s+pelo\s+Pix|\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Compra Cartão: "Compra de R$ 35,50 aprovada no cartão Nubank em Mercado Central."
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /compra\s+de\s+R\$\s*([0-9.,]+)\s+aprovada.*?(?:em|no|na)\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      // Pix Recebido: "Você recebeu uma transferência Pix de R$ 150,00 de Fulano."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /recebeu\s+(?:uma\s+transferência\s+Pix\s+de|um\s+Pix\s+de)\s+R\$\s*([0-9.,]+)\s+de\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 2. BANCO DO BRASIL (BB)
  {
    bank: 'BB',
    color: '#FBF800',
    packages: ['br.com.bb.android'],
    patterns: [
      // Pix Enviado: "BB: Pix enviado no valor de R$ 120,00 para Carlos Alberto."
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Pix\s+enviado\s+no\s+valor\s+de\s+R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
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
        regex: /Pix\s+recebido\s+no\s+valor\s+de\s+R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
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
      // Carrega exemplos iniciais com o caso do usuário (Allison Araújo / Nubank) + BB + Inter para testar fila!
      const initial = getInitialMockNotifications();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
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
  const updated = [notif, ...current];
  saveStoredNotifications(updated);
  return updated;
}

// Exemplos iniciais realistas nos 6 bancos para testar a fila de conciliação
export function getInitialMockNotifications(): BankNotification[] {
  return [
    {
      id: 'notif_init_1',
      bank: 'Nubank',
      bankColor: '#820AD1',
      type: 'EXPENSE',
      amount: 80.0,
      formattedAmount: '80,00',
      targetOrSource: 'Allison Araújo',
      paymentMethod: 'Pix',
      date: '2026-10-13',
      time: '14:23',
      rawText: 'Você transferiu R$ 80,00 para Allison Araújo no Pix.',
      status: 'PENDING',
    },
    {
      id: 'notif_init_2',
      bank: 'BB',
      bankColor: '#FBF800',
      type: 'EXPENSE',
      amount: 54.9,
      formattedAmount: '54,90',
      targetOrSource: 'Padaria São José',
      paymentMethod: 'Crédito',
      date: '2026-10-13',
      time: '18:10',
      rawText: 'BB: Compra com Ourocard aprovada R$ 54,90 em Padaria São José.',
      status: 'PENDING',
    },
    {
      id: 'notif_init_3',
      bank: 'Inter',
      bankColor: '#FF7A00',
      type: 'INCOME',
      amount: 180.0,
      formattedAmount: '180,00',
      targetOrSource: 'Paula Oliveira',
      paymentMethod: 'Pix',
      date: '2026-10-14',
      time: '09:45',
      rawText: 'Inter: Você recebeu um Pix de R$ 180,00 de Paula Oliveira.',
      status: 'PENDING',
    },
    {
      id: 'notif_init_4_dismissed',
      bank: 'Caixa',
      bankColor: '#005CA9',
      type: 'EXPENSE',
      amount: 25.0,
      formattedAmount: '25,00',
      targetOrSource: 'Farmácia Popular',
      paymentMethod: 'Débito',
      date: '2026-10-10',
      time: '11:00',
      rawText: 'CAIXA: Compra aprovada de R$ 25,00 no cartao em Farmácia Popular.',
      status: 'DISMISSED',
      dismissedAt: '2026-10-10T14:00:00.000Z',
    },
  ];
}
