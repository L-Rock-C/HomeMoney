'use client';

export type SupportedBank =
  | 'Nubank'
  | 'BB'
  | 'Caixa'
  | 'Bradesco'
  | 'Santander'
  | 'Inter'
  | 'Itaú'
  | 'C6 Bank'
  | 'PicPay'
  | 'Mercado Pago'
  | 'PagBank'
  | 'BTG Pactual'
  | 'Neon'
  | 'Sicoob'
  | 'Sicredi';

export interface BankNotification {
  id: string;
  bank: SupportedBank;
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

  // 7. ITAÚ / ITI
  {
    bank: 'Itaú',
    color: '#EC7000',
    packages: ['com.itau', 'com.itau.cartoes', 'com.iti.iti'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebida|recebido|recebimento).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Itaú'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /Pix\s+(?:enviado|realizado).*?(?:valor\s+de\s+)?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /(?:compra|pagamento).*?aprovad[ao].*?R\$\s*([0-9.,]+).*?(?:em|no|na)\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 8. C6 BANK
  {
    bank: 'C6 Bank',
    color: '#242424',
    packages: ['com.c6bank.app'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebido).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência C6 Bank'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:transferiu|enviou|pix).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /compra\s+aprovada.*?R\$\s*([0-9.,]+)\s+em\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 9. PICPAY
  {
    bank: 'PicPay',
    color: '#11C76F',
    packages: ['com.picpay'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|te\s+enviou).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência PicPay'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:pagou|enviou|transferiu).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /pagamento\s+aprovado.*?R\$\s*([0-9.,]+)\s+em\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 10. MERCADO PAGO
  {
    bank: 'Mercado Pago',
    color: '#009EE3',
    packages: ['com.mercadopago.wallet'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|voc[eê]\s+recebeu).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Mercado Pago'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:enviou|transferiu|pagou).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Crédito',
        regex: /compra\s+aprovada.*?R\$\s*([0-9.,]+)\s+em\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 11. PAGBANK
  {
    bank: 'PagBank',
    color: '#00B488',
    packages: ['br.com.uol.ps'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebido).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência PagBank'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:enviou|transferiu|pagou).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 12. BTG PACTUAL
  {
    bank: 'BTG Pactual',
    color: '#0A1C3C',
    packages: ['com.btg.pactual.banking'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebido).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência BTG Pactual'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:enviou|transferiu|pagou).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 13. NEON
  {
    bank: 'Neon',
    color: '#00E5FF',
    packages: ['br.com.neon'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebido).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Neon'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:enviou|transferiu|pagou).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 14. SICOOB
  {
    bank: 'Sicoob',
    color: '#003641',
    packages: ['br.com.sicoob.netbr'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebido).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Sicoob'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:enviou|transferiu|pagou).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },

  // 15. SICREDI
  {
    bank: 'Sicredi',
    color: '#43B02A',
    packages: ['br.com.sicredi.mobile'],
    patterns: [
      {
        type: 'INCOME',
        method: 'Pix',
        regex: /(?:recebeu|recebido).*?R\$\s*([0-9.,]+)(?:\s+de\s+([^.]+?))?(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2] || 'Transferência Sicredi'),
        }),
      },
      {
        type: 'EXPENSE',
        method: 'Pix',
        regex: /(?:enviou|transferiu|pagou).*?R\$\s*([0-9.,]+)\s+para\s+([^.]+?)(?:\.|$)/i,
        extract: (m) => ({
          amount: parseBRLAmount(m[1]),
          targetOrSource: cleanName(m[2]),
        }),
      },
    ],
  },
];

// Helper: parse string amount like "80,00", "1.250,50", "20.50" (English/international locale) to float
export function parseBRLAmount(rawStr: string | number): number {
  if (typeof rawStr === 'number') return isNaN(rawStr) ? 0 : rawStr;
  if (!rawStr) return 0;
  let str = String(rawStr).trim();

  // Remove non-numeric prefixes/suffixes except separators
  str = str.replace(/^[^\d.,]+/, '').replace(/[^\d.,]+$/, '').trim();
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  // Case 1: Both comma and dot are present (e.g. "1.250,50" or "1,250.50")
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // "1.250,50" -> dot is thousand separator, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // "1,250.50" -> comma is thousand separator, dot is decimal
      str = str.replace(/,/g, '');
    }
    return parseFloat(str) || 0;
  }

  // Case 2: Only comma is present (e.g. "20,50", "1250,50", "1,000")
  if (hasComma && !hasDot) {
    const parts = str.split(',');
    if (parts.length === 2) {
      const decimals = parts[1];
      // If 1 or 2 digits after comma, it's decimal (cents: 20,50 or 20,5)
      if (decimals.length === 1 || decimals.length === 2) {
        str = parts[0] + '.' + decimals;
      } else if (decimals.length === 3) {
        // e.g. "1,000" (thousand separator without decimals)
        str = parts[0] + decimals;
      } else {
        str = str.replace(',', '.');
      }
    } else {
      str = str.replace(/,/g, '');
    }
    return parseFloat(str) || 0;
  }

  // Case 3: Only dot is present (e.g. "20.50", "1250.50", "1.000", "1.000.000")
  if (hasDot && !hasComma) {
    const parts = str.split('.');
    if (parts.length === 2) {
      const decimals = parts[1];
      // If 1 or 2 digits after dot, it's decimal (cents: 20.50 or 20.5 on English phone)
      if (decimals.length === 1 || decimals.length === 2) {
        str = parts[0] + '.' + decimals;
      } else if (decimals.length === 3) {
        // e.g. "1.000" -> thousand separator in pt-BR
        str = parts[0] + decimals;
      } else {
        str = str.replace(/\./g, '');
      }
    } else {
      str = str.replace(/\./g, '');
    }
    return parseFloat(str) || 0;
  }

  return parseFloat(str) || 0;
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
// Filtros Estritos de Transações e Não-Transações
// ============================================================================

/**
 * Padrão de exclusão: Rejeita sugestões de empréstimos, aumentos de limites,
 * faturas fechadas (sem pagamento efetuado), investimentos, tokens e marketing.
 */
export const NON_TRANSACTION_EXCLUSION_REGEX =
  /\b(?:empr[eé]stimo|empr[eé]stimos|pr[eé][- ]?aprovad[ao]|simule|simular|simula[cç][aã]o|dinheiro\s+extra|grana\s+extra|cr[eé]dito\s+pessoal|cr[eé]dito\s+para\s+voc[eê]|cr[eé]dito\s+dispon[ií]vel|contrate\s+agora|contratar|pegue\s+at[eé]|taxa\s+reduzida|taxas?\s+especia(?:l|is)|refinanciamento|renegocia[cç][aã]o|quite\s+suas?\s+d[ií]vidas?|aumentamos\s+seu\s+limite|aumento\s+de\s+limite|limite\s+aumentad[ao]|novo\s+limite|ajustar\s+limite|ajuste\s+de\s+limite|limite\s+liberado|pe[cç]a\s+seu\s+cart[aã]o|cart[aã]o\s+a\s+caminho|cart[aã]o\s+chegou|desbloqueie\s+seu\s+cart[aã]o|cart[aã]o\s+aprovado|anuidade\s+gr[aá]tis|sem\s+anuidade|fatura\s+fechou|fechamento\s+d[ea]\s+fatura|fatura\s+fechada|sua\s+fatura\s+vence|lembrete\s+de\s+fatura|lembrete\s+de\s+vencimento|sua\s+fatura\s+est[aá]\s+dispon[ií]vel|fatura\s+dispon[ií]vel|resumo\s+da\s+fatura|invista\s+a\s+partir|comece\s+a\s+investir|seguro\s+de\s+vida|seguro\s+celular|seguro\s+residencial|seguro\s+auto|guarde\s+seu\s+dinheiro|guarde\s+a\s+partir|conhe[cç]a\s+as?\s+caixinhas?|informe\s+de\s+rendimentos|imposto\s+de\s+renda|c[oó]digo\s+de\s+seguran[cç]a|c[oó]digo\s+de\s+verifica[cç][aã]o|c[oó]digo\s+de\s+valida[cç][aã]o|c[oó]digo\s+de\s+autoriza[cç][aã]o|i[- ]?safe|chave\s+de\s+seguran[cç]a|token|novo\s+acesso|acesso\s+identificado|dispositivo\s+desconhecido|login\s+suspeito|senha\s+alterada|dados\s+cadastrais|atualize\s+seu\s+app|cashback\s+no\s+shopping|shopping\s+nu|shopping\s+inter|aproveite\s+a\s+promo[cç][aã]o|oferta\s+exclusiva|desconto\s+exclusivo|cupom|indique\s+e\s+ganhe|indique\s+um\s+amigo|pesquisa\s+de\s+satisfa[cç][aã]o|avalie\s+nosso\s+app|pix\s+agendado|transfer[eê]ncia\s+agendada|pagamento\s+agendado|agendado\s+com\s+sucesso)\b/i;

/**
 * Padrão de ação de transação positiva: Pix recebido/enviado, compra no cartão,
 * pagamento de boleto/conta, saque, depósito/salário creditado.
 */
export const TRANSACTION_ACTION_REGEX =
  /(?:recebeu\s+(?:uma\s+transfer[eê]ncia|um\s+pix|dinheiro)|pix\s+recebido|transfer[eê]ncia\s+recebida|te\s+enviou\s+(?:um\s+pix|uma\s+transfer[eê]ncia|R\$)|recebimento\s+de\s+pix|dep[oó]sito\s+recebido|sal[aá]rio\s+(?:creditado|depositado)|cr[eé]dito\s+em\s+conta|transferiu|transfer[eê]ncia\s+(?:enviada|realizada)|pix\s+(?:enviado|realizado)|(?:voc[eê]|voce)?\s*pagou.*?no\s+pix|enviou\s+um\s+pix|compra\s+(?:de\s+R\$|aprovada|realizada|no\s+cr[eé]dito|no\s+d[eé]bito|com\s+cart[aã]o)|pagamento\s+aprovado|pagamento\s+(?:de\s+boleto|efetuado|confirmado|realizado)|boleto\s+pago|pagamento\s+d[ea]\s+fatura\s+(?:efetuado|confirmado|recebido|realizado)|saque\s+(?:realizado|efetuado|de\s+R\$))/i;

/**
 * Validação rigorosa para garantir que o texto é estritamente uma transação financeira real.
 */
export function isStrictTransactionNotification(text: string, title?: string): boolean {
  const combined = `${title || ''} ${text || ''}`.trim();
  if (!combined) return false;

  // 1. Rejeita se bater com termos de exclusão (marketing, empréstimo, limite, senha, etc.)
  if (NON_TRANSACTION_EXCLUSION_REGEX.test(combined)) {
    return false;
  }

  // 2. Deve conter valor monetário válido
  const moneyMatch =
    combined.match(/R\$\s*([0-9.,]+)/i) ||
    combined.match(/([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/);
  if (!moneyMatch) {
    return false;
  }
  const amount = parseBRLAmount(moneyMatch[1] || moneyMatch[0]);
  if (amount <= 0) {
    return false;
  }

  // 3. Deve conter verbo / ação concreta de transação
  if (!TRANSACTION_ACTION_REGEX.test(combined)) {
    return false;
  }

  return true;
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
  if (!text) return null;

  // 1. FILTRO ESTRITO: Descarta imediatamente se não for estritamente uma transação financeira
  if (!isStrictTransactionNotification(text)) {
    return null;
  }

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
  // Fallback Universal: Apenas para mensagens que passaram no filtro estrito
  // ============================================================================
  const moneyMatch =
    text.match(/R\$\s*([0-9.,]+)/i) ||
    text.match(/([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/);
  if (moneyMatch) {
    const amount = parseBRLAmount(moneyMatch[1] || moneyMatch[0]);
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
      // Auto-correção caso haja notificações no histórico com tipo, valor ou nome desatualizado:
      if (item.rawText && item.status === 'PENDING') {
        const reParsed = parseBankNotificationText(item.rawText, item.bank, item.date, item.time);
        if (
          reParsed &&
          (Math.abs(reParsed.amount - item.amount) > 0.001 ||
            reParsed.formattedAmount !== item.formattedAmount ||
            reParsed.type !== item.type ||
            reParsed.targetOrSource !== item.targetOrSource)
        ) {
          updated = true;
          return {
            ...item,
            type: reParsed.type,
            targetOrSource: reParsed.targetOrSource,
            paymentMethod: reParsed.paymentMethod,
            amount: reParsed.amount,
            formattedAmount: reParsed.formattedAmount,
          };
        }
      } else if (item.rawText && /(?:recebeu|recebida|recebido|te\s+enviou)/i.test(item.rawText)) {
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

function createFallbackBankNotification(item: any, status: 'PENDING' | 'DISMISSED'): BankNotification | null {
  const bank = (item.bank as BankNotification['bank']) || 'Nubank';
  const bankRule = BANK_RULES.find((b) => b.bank === bank) || BANK_RULES[0];
  const now = new Date();
  const dateStr = item.date || now.toISOString().split('T')[0];
  const timeStr = item.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const text = item.text || item.title || '';
  const title = item.title || '';
  const combined = title ? `${title} ${text}` : text;

  // FILTRO ESTRITO: se não for transação financeira real, retorna null
  if (!isStrictTransactionNotification(combined)) {
    return null;
  }

  const numberMatch =
    combined.match(/R\$\s*([0-9.,]+)/i) ||
    combined.match(/([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/);
  const amount = numberMatch ? parseBRLAmount(numberMatch[1] || numberMatch[0]) : 0;
  if (amount <= 0) return null;
  const formattedAmount = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isIncome = /(?:recebeu|recebida|recebido|crédito\s+em\s+conta|depositado|reembolso|te\s+enviou)/i.test(combined);

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

    // Filtro Estrito: Verifica se a notificação é de fato uma transação bancária
    if (!isStrictTransactionNotification(text, title) && !isStrictTransactionNotification(fullText)) {
      console.log('Notificação ignorada pelo filtro estrito de transação:', fullText);
      continue;
    }

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
      ) ||
      createFallbackBankNotification(item, 'PENDING');

    if (!notif) {
      console.log('Notificação bancária descartada (não é transação):', fullText);
      continue;
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
            if (dismissedNotif) {
              dismissedNotif.status = 'DISMISSED';
              dismissedNotif.dismissedAt = new Date().toISOString();
              if (notifId) dismissedNotif.id = notifId;
              saveStoredNotifications([dismissedNotif, ...getStoredNotifications()]);
            }
          }
        }
        window.dispatchEvent(new Event('homemoney_queue_updated'));
      }
    } catch (err) {
      console.error('Erro ao processar notificações dispensadas do Android:', err);
    }
  });
}


