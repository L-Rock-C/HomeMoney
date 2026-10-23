import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createCategorySchema, updateCategorySchema } from '@homemoney/shared';
import { getRequestUserId } from '../lib/auth.js';

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  // List categories (only active by default)
  app.get('/', async (request) => {
    const userId = await getRequestUserId(request);
    const { includeArchived } = request.query as { includeArchived?: string };
    const where: any = { userId };
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    return prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  });

  // Create category
  app.post('/', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const parseResult = createCategorySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name, icon, color, isIncome } = parseResult.data;

    // Check if category with this name already exists for this user
    const existing = await prisma.category.findFirst({
      where: { name, userId },
    });

    if (existing) {
      if (existing.isArchived) {
        // If previously archived, reactivate and update properties!
        const restored = await prisma.category.update({
          where: { id: existing.id },
          data: {
            isArchived: false,
            ...(icon !== undefined ? { icon } : {}),
            ...(color !== undefined ? { color } : {}),
            isIncome: isIncome !== undefined ? isIncome : existing.isIncome,
          },
        });
        return reply.status(200).send(restored);
      }
      // If already active, return the existing category with 200 OK
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          isArchived: false,
          ...(icon !== undefined ? { icon } : {}),
          ...(color !== undefined ? { color } : {}),
          isIncome: isIncome !== undefined ? isIncome : existing.isIncome,
        },
      });
      return reply.status(200).send(updated);
    }

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        color,
        isIncome,
        userId,
      },
    });

    return reply.status(201).send(category);
  });

  // Update category
  app.patch('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.category.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Categoria não encontrada' });
    }

    const parseResult = updateCategorySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name } = parseResult.data;
    if (name) {
      const existing = await prisma.category.findFirst({
        where: { name, userId },
      });
      if (existing && existing.id !== id) {
        return reply.status(400).send({
          error: existing.isArchived
            ? `Já existe uma categoria arquivada com o nome "${name}". Reative-a ou escolha outro nome.`
            : `Já existe uma categoria ativa com o nome "${name}".`,
        });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: parseResult.data,
    });

    return reply.send(updated);
  });

  // Safe Delete / Archive category
  app.delete('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.category.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Categoria não encontrada' });
    }

    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id, userId },
    });

    if (transactionCount > 0) {
      // Soft-delete to protect historical financial records
      await prisma.category.update({
        where: { id },
        data: { isArchived: true },
      });
      return reply.send({
        archived: true,
        message: `A categoria possui ${transactionCount} transações no histórico e foi arquivada com segurança.`,
      });
    }

    // No transactions attached, can safely delete
    await prisma.category.delete({ where: { id } });
    return reply.status(204).send();
  });
};
