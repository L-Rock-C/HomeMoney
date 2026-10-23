import { prisma } from './prisma.js';

export async function ensureUserData() {
  const lucas = await prisma.user.findFirst({
    where: { name: 'Lucas' },
  });

  if (lucas) {
    // Backfill any unowned records to Lucas
    await prisma.account.updateMany({
      where: { userId: null },
      data: { userId: lucas.id },
    });

    await prisma.category.updateMany({
      where: { userId: null },
      data: { userId: lucas.id },
    });

    await prisma.paymentMethod.updateMany({
      where: { userId: null },
      data: { userId: lucas.id },
    });

    await prisma.person.updateMany({
      where: { userId: null },
      data: { userId: lucas.id },
    });

    await prisma.transaction.updateMany({
      where: { userId: null },
      data: { userId: lucas.id },
    });
  }

  // Check all users; if any user has 0 accounts, seed their default accounts and categories!
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    if (u.id === lucas?.id) continue;

    const accCount = await prisma.account.count({ where: { userId: u.id } });
    if (accCount === 0) {
      // Create default accounts for new user
      await prisma.account.createMany({
        data: [
          { name: 'Carteira Principal', type: 'CHECKING', color: '#10B981', initialBalance: 0, userId: u.id },
          { name: 'Reserva de Emergência', type: 'SAVINGS', color: '#06B6D4', initialBalance: 0, userId: u.id },
        ],
      });
    }

    const catCount = await prisma.category.count({ where: { userId: u.id } });
    if (catCount === 0) {
      await prisma.category.createMany({
        data: [
          { name: 'Alimentação', color: '#F59E0B', isIncome: false, userId: u.id },
          { name: 'Moradia & Contas', color: '#6366F1', isIncome: false, userId: u.id },
          { name: 'Transporte', color: '#3B82F6', isIncome: false, userId: u.id },
          { name: 'Lazer & Entretenimento', color: '#EC4899', isIncome: false, userId: u.id },
          { name: 'Saúde & Farmácia', color: '#EF4444', isIncome: false, userId: u.id },
          { name: 'Salário & Renda', color: '#10B981', isIncome: true, userId: u.id },
          { name: 'Outras Entradas', color: '#14B8A6', isIncome: true, userId: u.id },
          { name: 'Acerto de Contas', color: '#10B981', isIncome: true, userId: u.id },
        ],
      });
    }

    const pmCount = await prisma.paymentMethod.count({ where: { userId: u.id } });
    if (pmCount === 0) {
      await prisma.paymentMethod.createMany({
        data: [
          { name: 'Pix', userId: u.id },
          { name: 'Cartão de Crédito', userId: u.id },
          { name: 'Cartão de Débito', userId: u.id },
          { name: 'Dinheiro', userId: u.id },
        ],
      });
    }
  }
}
