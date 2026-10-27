import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { getRequestUserId } from '../lib/auth.js';

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  // Monthly Balance (Balanço Mensal)
  app.get('/monthly', async (request) => {
    const userId = await getRequestUserId(request);
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
    });

    const monthMap = new Map<string, { income: number; expense: number; pendingExpense: number; pendingIncome: number }>();

    for (const t of transactions) {
      const monthKey = t.dueDate.toISOString().slice(0, 7); // YYYY-MM
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { income: 0, expense: 0, pendingExpense: 0, pendingIncome: 0 });
      }
      const data = monthMap.get(monthKey)!;

      if (t.type === 'INCOME') {
        if (t.paid) data.income += t.amount;
        else data.pendingIncome += t.amount;
      } else if (t.type === 'EXPENSE' || t.type === 'REIMBURSEMENT') {
        if (t.paid) data.expense += t.amount;
        else data.pendingExpense += t.amount;
      }
    }

    if (monthMap.size === 0) {
      return [];
    }

    const recordedMonths = Array.from(monthMap.keys()).sort();
    const firstMonth = recordedMonths[0];
    const lastMonth = recordedMonths[recordedMonths.length - 1];

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Garante que o intervalo abrange da primeira transação até a última, incluindo o mês corrente
    const startMonth = firstMonth < currentMonthKey ? firstMonth : currentMonthKey;
    const endMonth = lastMonth > currentMonthKey ? lastMonth : currentMonthKey;

    const [startYear, startM] = startMonth.split('-').map(Number);
    const [endYear, endM] = endMonth.split('-').map(Number);

    const continuousMonths: string[] = [];
    let curY = startYear;
    let curM = startM;
    while (curY < endYear || (curY === endYear && curM <= endM)) {
      continuousMonths.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    let accumulatedBalance = 0;

    const result = continuousMonths.map((m) => {
      const data = monthMap.get(m) || { income: 0, expense: 0, pendingExpense: 0, pendingIncome: 0 };
      const netBalance = data.income - data.expense;
      accumulatedBalance += netBalance;

      return {
        month: m,
        totalIncome: Math.round(data.income * 100) / 100,
        totalExpense: Math.round(data.expense * 100) / 100,
        pendingExpense: Math.round(data.pendingExpense * 100) / 100,
        pendingIncome: Math.round(data.pendingIncome * 100) / 100,
        netBalance: Math.round(netBalance * 100) / 100,
        accumulatedBalance: Math.round(accumulatedBalance * 100) / 100,
      };
    });

    return result;
  });

  // Expenses grouped by Category
  app.get('/by-category', async (request) => {
    const userId = await getRequestUserId(request);
    const query = request.query as { month?: string };
    const where: any = { userId, type: { in: ['EXPENSE', 'REIMBURSEMENT'] } };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      where.dueDate = { gte: start, lte: end };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const categoryMap = new Map<string, { name: string; color?: string | null; total: number; count: number }>();
    let grandTotal = 0;

    for (const t of transactions) {
      grandTotal += t.amount;
      const catId = t.categoryId;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          name: t.category.name,
          color: t.category.color,
          total: 0,
          count: 0,
        });
      }
      const data = categoryMap.get(catId)!;
      data.total += t.amount;
      data.count += 1;
    }

    const categories = Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        color: data.color,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      grandTotal: Math.round(grandTotal * 100) / 100,
      categories,
    };
  });
};
