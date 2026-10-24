import { z } from 'zod';

// ==========================================
// Enums
// ==========================================

export const TransactionType = {
  INCOME: 'INCOME', // Entrada (Bolsa, Salário, etc.)
  EXPENSE: 'EXPENSE', // Saída pessoal (Comida, Lazer, etc.)
  TRANSFER: 'TRANSFER', // Transferência entre carteiras próprias
  REIMBURSEMENT: 'REIMBURSEMENT', // Pagamento por/para terceiro a ser acertado
} as const;
export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const PaymentMethod = {
  CREDIT: 'CREDIT', // Cartão de Crédito
  DEBIT: 'DEBIT', // Cartão de Débito
  PIX: 'PIX', // Pix direto
  PIX_CREDIT: 'PIX_CREDIT', // Pix no Crédito
  CASH: 'CASH', // Dinheiro vivo
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export const AccountType = {
  CHECKING: 'CHECKING', // Conta corrente / Carteira Principal
  SAVINGS: 'SAVINGS', // Poupança / Caixinha / Reserva
  WALLET: 'WALLET', // Carteira Dinheiro Vivo
  INVESTMENT: 'INVESTMENT', // Investimentos
  CREDIT_CARD: 'CREDIT_CARD', // Cartão
} as const;
export type AccountType = typeof AccountType[keyof typeof AccountType];

// ==========================================
// Domain Models (Interfaces)
// ==========================================

export interface Account {
  id: string;
  name: string; // Ex: Carteira Principal (Lucas), Poupança Reserva, Nubank
  type: AccountType;
  color?: string | null;
  initialBalance: number;
  currentBalance: number;
  isArchived?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string; // Ex: Comida, Lazer, Bolsa, etc.
  icon?: string | null;
  color?: string | null;
  isIncome: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string; // Ex: Pai, Lê, Clara, Matheus
  netBalance: number; // Positivo = eles devem para você; Negativo = você deve para eles
  notes?: string | null;
  isArchived?: boolean;
  linkedUserId?: string | null;
  linkedUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface PaymentMethodItem {
  id: string;
  name: string; // Ex: Cartão Nubank, Pix, Débito Inter, Dinheiro
  icon?: string | null;
  isArchived?: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  purchaseDate: string; // Data da compra (YYYY-MM-DD)
  dueDate: string; // Data de vencimento/fatura (YYYY-MM-DD)
  paid: boolean;
  paymentMethod: string;
  notes?: string | null;
  
  // Carteira / Conta de origem
  accountId: string;
  account?: Account;
  
  categoryId: string;
  category?: Category;
  
  // Terceiro / Contato relacionado
  personId?: string | null;
  person?: Person | null;

  // Parcelamento livre
  currentInstallment?: number | null;
  totalInstallments?: number | null;
  installmentGroupId?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBalance {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  accumulatedBalance: number;
}

export interface CategoryExpenseSummary {
  categoryId: string;
  categoryName: string;
  color?: string | null;
  total: number;
  percentage: number;
}

export interface PersonBalanceSummary {
  personId: string;
  personName: string;
  toReceive: number;
  toPay: number;
  net: number;
}

// ==========================================
// Zod Schemas for Validation
// ==========================================

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Nome da carteira/poupança é obrigatório'),
  type: z.nativeEnum(AccountType).default(AccountType.CHECKING),
  color: z.string().optional().nullable(),
  initialBalance: z.number().default(0),
  isArchived: z.boolean().optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isIncome: z.boolean().default(false),
  isArchived: z.boolean().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createPersonSchema = z.object({
  name: z.string().min(1, 'Nome do contato é obrigatório'),
  notes: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
});
export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const updatePersonSchema = createPersonSchema.partial();
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Nome do método de pagamento é obrigatório'),
  icon: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
});
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;

export const createTransactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('O valor deve ser maior que zero'),
  type: z.nativeEnum(TransactionType),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  paid: z.boolean().default(false),
  paymentMethod: z.string().default('Crédito'),
  notes: z.string().optional().nullable(),
  accountId: z.string().min(1, 'Carteira/Conta de origem é obrigatória'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  personId: z.string().optional().nullable(),
  totalInstallments: z.number().int().min(1, 'Mínimo de 1 parcela').default(1),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const settleDebtSchema = z.object({
  personId: z.string().min(1, 'Pessoa é obrigatória'),
  accountId: z.string().min(1, 'Carteira de recebimento/pagamento é obrigatória'),
  amount: z.number().positive('O valor do acerto deve ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().default('Acerto de contas'),
});
export type SettleDebtInput = z.infer<typeof settleDebtSchema>;

// ==========================================
// Authentication Schemas & Types
// ==========================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Informe seu nome ou email'),
  password: z.string().min(1, 'Informe sua senha'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'A senha deve ter no mínimo 4 caracteres'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio').optional(),
  email: z.string().email('E-mail inválido').optional(),
  avatar: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(4, 'Nova senha deve ter no mínimo 4 caracteres').optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const linkContactSchema = z.object({
  email: z.string().email('Informe um e-mail válido para vincular'),
});
export type LinkContactInput = z.infer<typeof linkContactSchema>;

export interface ContactInvite {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverEmail: string;
  receiverId?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  personId?: string | null;
  personName?: string | null;
  createdAt: string;
}

