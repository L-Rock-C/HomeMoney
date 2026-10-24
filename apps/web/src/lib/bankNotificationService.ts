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
      // Pix Recebido / Transferência Recebida: "Você recebeu uma transferência de R$0,01 de Letícia Lima de Lucena Viana." ou "Fulano te enviou um Pix de R$ 150,00"
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
      // Pix Enviado: "Você transferiu R$ 80,00 para Allison Araújo no Pix." ou "Pix enviado: R$ 80,00 para Fulano"
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:transferiu|enviou|pagou|(?:transfer[eê]ncia|pix)\s+(?:enviad[ao]|realizad[ao]))\s*:?\s*(?:de\s*)?R\$\s*([0-9.,]+)\s+(?:para|a)\s+([^.]+?)(?:\s+(?:no|via|pelo)\s+Pix|\.|$)/i,
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
        extract: (m) => {
          let place = m[2];
          const emMatch = place.match(/(?:em|no|na)\s+([^.]+?)$/i);
          if (emMatch) {
            place = emMatch[1];
          }
          place = place.replace(/^cart[aã]o(?:\s+[A-Za-z0-9]+)?\s+(?:em|no|na)\s+/i, '');
          return {
            amount: parseBRLAmount(m[1]),
            targetOrSource: cleanName(place),
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
      // Pix Recebido: "BB: Pix recebido no valor de R$ 200,00 de Marina Souza."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebido|recebeu).*?(?:valor\s+de\s+)?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência BB'),
        }),
      },
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
    ],
  },

  // 3. CAIXA ECONÔMICA FEDERAL
  {
    bank: 'Caixa',
    color: '#005CA9',
    packages: ['br.com.gabba.Caixa', 'br.gov.caixa.tem'],
    patterns: [
      // Pix Recebido: "CAIXA: Pix recebido no valor de R$ 300,00 de Empresa XYZ."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebido|recebeu).*?(?:valor\s+de\s+)?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Caixa'),
        }),
      },
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
    ],
  },

  // 4. BRADESCO
  {
    bank: 'Bradesco',
    color: '#CC092F',
    packages: ['com.bradesco', 'com.bradesco.cartoes'],
    patterns: [
      // Pix Recebido: "Bradesco: Pix recebido no valor de R$ 45,00 de Rafael Lima."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebido|recebeu).*?(?:valor\s+de\s+)?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Bradesco'),
        }),
      },
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
    ],
  },

  // 5. SANTANDER
  {
    bank: 'Santander',
    color: '#EC0000',
    packages: ['com.santander.app', 'com.santander.way'],
    patterns: [
      // Pix Recebido: "Santander: Voce recebeu um Pix de R$ 500,00 de Joao Pedro."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /recebeu.*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Santander'),
        }),
      },
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
    ],
  },

  // 6. BANCO INTER
  {
    bank: 'Inter',
    color: '#FF7A00',
    packages: ['br.com.intermedium'],
    patterns: [
      // Pix Recebido: "Inter: Voce recebeu um Pix de R$ 180,00 de Paula Oliveira."
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /recebeu.*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Inter'),
        }),
      },
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
    ],
  },
];

// Helper: parse string amount like "80,00" or "1.250,50" to float
function parseBRLAmount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ============================================================================
// Helper de Formatação e Simplificação de Nomes de Pessoas e Estabelecimentos
// ============================================================================
export function simplifyPersonOrEntityName(rawName: string): string {
  if (!rawName) return 'Transferência Bancária';

  // Limpa pontuações e caracteres estranhos
  let cleaned = rawName
    .trim()
    .replace(/[.,;:!?]+$/, '')
    .replace(/^[:\s-]+/, '')
    .trim();

  // Remove sufixos como "no Pix", "via Pix", "pelo Pix", "com cartão"
  cleaned = cleaned.replace(/\s+(?:no|via|pelo|com)\s+(?:Pix|cart[aã]o|cr[eé]dito|d[eé]bito).*$/i, '').trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return cleaned;
  }

  // Prefixos comerciais conhecidos (manter até 3 palavras se fizer sentido)
  const businessPrefixes = [
    'padaria', 'supermercado', 'drogaria', 'farmacia', 'farmácia',
    'mercado', 'posto', 'restaurante', 'bar', 'lanchonete', 'loja',
    'auto', 'hotel', 'pousada', 'clinica', 'clínica', 'hospital'
  ];

  if (businessPrefixes.includes(words[0].toLowerCase())) {
    return words.slice(0, 3).join(' ');
  }

  // Preposições comuns em nomes em português
  const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e'];
  const firstWord = words[0];
  const secondWord = words[1];

  // Caso: "Maria de Souza" -> mantém preposição + próximo sobrenome
  if (prepositions.includes(secondWord.toLowerCase()) && words.length >= 3) {
    return `${firstWord} ${secondWord} ${words[2]}`;
  }

  // Caso padrão para pessoas físicas com múltiplos sobrenomes:
  // "Letícia Lima de Lucena Viana" -> "Letícia Lima"
  // "João Pedro da Silva Ramos" -> "João Pedro"
  return `${firstWord} ${secondWord}`;
}

function cleanName(str: string): string {
  if (!str) return 'Transferência Bancária';
  return simplifyPersonOrEntityName(str);
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
      const isIncome = /(?:recebeu|recebida|recebido|recebimento|cr[eé]dito\s+em\s+conta|depositado|dep[oó]sito|reembolso|te\s+enviou)/i.test(text);
      let targetOrSource = isIncome ? 'Transferência Recebida' : 'Transferência Enviada';

      if (isIncome) {
        const fromMatch = text.match(/\b(?:de|de\s+parte\s+de|por)\s+([A-Za-zÀ-ÿ\s0-9]{2,35})/i);
        if (fromMatch) targetOrSource = cleanName(fromMatch[1]);
      } else {
        const toMatch = text.match(/\b(?:para|a|em|no|na)\s+([A-Za-zÀ-ÿ\s0-9]{2,35})/i);
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
    const list: BankNotification[] = JSON.parse(raw);
    let updated = false;
    const sanitized = list.map((item) => {
      // Auto-correção caso haja notificações no histórico com tipo ou nome desatualizado:
      if (item.rawText && /(?:recebeu|recebida|recebido|te\s+enviou)/i.test(item.rawText)) {
        if (item.type !== 'INCOME' || item.targetOrSource.toLowerCase().includes('lima de lucena')) {
          const reParsed = parseBankNotificationText(item.rawText, item.bank, item.date, item.time);
          if (reParsed) {
            updated = true;
            return {
              ...item,
              type: 'INCOME' as const,
              targetOrSource: reParsed.targetOrSource,
              paymentMethod: reParsed.paymentMethod,
              amount: reParsed.amount,
              formattedAmount: reParsed.formattedAmount,
            };
          }
        }
      }
      return item;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
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
      const needsCorrection =
        existing.type !== notif.type ||
        existing.targetOrSource !== notif.targetOrSource ||
        Math.abs(existing.amount - notif.amount) > 0.001;

      // Se a notificação foi dispensada anteriormente ou seus detalhes foram corrigidos (ex: tipo INCOME ou nome limpo)
      if (existing.status === 'DISMISSED' || needsCorrection) {
        current[existingIndex] = {
          ...existing,
          bank: notif.bank,
          bankColor: notif.bankColor,
          type: notif.type,
          amount: notif.amount,
          formattedAmount: notif.formattedAmount,
          targetOrSource: notif.targetOrSource,
          paymentMethod: notif.paymentMethod,
          status: existing.status === 'DISMISSED' ? 'PENDING' : existing.status,
          dismissedAt: existing.status === 'DISMISSED' ? undefined : existing.dismissedAt,
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


