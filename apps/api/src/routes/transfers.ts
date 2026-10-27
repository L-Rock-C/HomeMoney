import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { getRequestUserId } from '../lib/auth.js';

export const transfersRoutes: FastifyPluginAsync = async (app) => {
  // Helper to extract authenticated user
  async function getAuthUser(request: any) {
    const userId = await getRequestUserId(request);
    if (!userId) return null;
    return await prisma.user.findUnique({ where: { id: userId } });
  }

  // List pending transfer/reimbursement notifications received by the current user
  app.get('/pending', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    const pending = await prisma.transferNotification.findMany({
      where: {
        receiverId: user.id,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pending.map((item) => ({
      id: item.id,
      transactionId: item.transactionId,
      description: item.description,
      amount: item.amount,
      type: item.type,
      date: item.date.toISOString(),
      paymentMethod: item.paymentMethod || 'Pix',
      notes: item.notes,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      sender: item.sender,
    }));
  });

  // List all transfer/reimbursement notifications (sent and received)
  app.get('/history', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    const [received, sent] = await Promise.all([
      prisma.transferNotification.findMany({
        where: { receiverId: user.id },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transferNotification.findMany({
        where: { senderId: user.id },
        include: {
          receiver: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      received: received.map((t) => ({ ...t, date: t.date.toISOString(), createdAt: t.createdAt.toISOString() })),
      sent: sent.map((t) => ({ ...t, date: t.date.toISOString(), createdAt: t.createdAt.toISOString() })),
    };
  });

  // Respond to a transfer notification (ACCEPT or REJECT)
  app.post('/:id/respond', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    const { id } = request.params as { id: string };
    const { action, accountId } = (request.body as any) || {};

    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return reply.status(400).send({ error: 'Ação inválida. Utilize ACCEPT ou REJECT.' });
    }

    const notification = await prisma.transferNotification.findUnique({
      where: { id },
      include: { sender: true },
    });

    if (!notification) {
      return reply.status(404).send({ error: 'Notificação de transferência não encontrada.' });
    }

    if (notification.receiverId !== user.id) {
      return reply.status(403).send({ error: 'Você não tem permissão para responder a esta transferência.' });
    }

    if (notification.status !== 'PENDING') {
      return reply.status(400).send({ error: `Esta transferência já foi respondida (${notification.status}).` });
    }

    // Atualiza status da notificação
    const updated = await prisma.transferNotification.update({
      where: { id },
      data: {
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      },
    });

    // Se aceito e foi informado uma carteira/conta de destino do usuário destinatário:
    if (action === 'ACCEPT' && accountId) {
      try {
        const { targetType } = (request.body as any) || {};
        const finalType = targetType === 'INCOME' || targetType === 'EXPENSE'
          ? targetType
          : (notification.type === 'INCOME' || notification.type === 'SETTLEMENT' || notification.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE');
        const isInc = finalType === 'INCOME';

        // Encontra ou cria categoria correspondente com isIncome adequado
        let category = await prisma.category.findFirst({
          where: {
            userId: user.id,
            isIncome: isInc,
            name: { in: ['Reembolsos', 'Reembolso', 'Reembolso Recebido', 'Acerto de Contas', 'Outros'] },
          },
        });

        if (!category) {
          category = await prisma.category.create({
            data: {
              name: isInc ? 'Reembolso Recebido' : 'Reembolso',
              isIncome: isInc,
              color: isInc ? '#10B981' : '#F59E0B',
              userId: user.id,
            },
          });
        }

        // Encontra o contato no catálogo do usuário destinatário que aponta para o remetente
        const senderContact = await prisma.person.findFirst({
          where: {
            userId: user.id,
            OR: [
              { linkedUserId: notification.senderId },
              { name: { contains: notification.sender.name, mode: 'insensitive' } },
            ],
          },
        });

        // Cria a transação correspondente no extrato do destinatário
        await prisma.transaction.create({
          data: {
            description: `${notification.description} (${isInc ? 'Reembolso recebido de' : 'Reembolso pago a'} ${notification.sender.name})`,
            amount: notification.amount,
            type: finalType,
            purchaseDate: notification.date,
            dueDate: notification.date,
            paid: true,
            paymentMethod: notification.paymentMethod || 'Pix',
            accountId,
            categoryId: category.id,
            personId: senderContact ? senderContact.id : null,
            notes: `Transferência reconhecida e aceita via HomeMoney (${notification.sender.name})`,
            userId: user.id,
          },
        });
      } catch (err) {
        console.error('Erro ao gerar transação automática para o destinatário:', err);
      }
    }

    return reply.send({
      message: action === 'ACCEPT' ? 'Transferência aceita e confirmada!' : 'Transferência recusada.',
      notification: updated,
    });
  });

  // Rota de Simulação (apenas para testes / desenvolvimento)
  app.post('/simulate', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    const { direction = 'INCOMING', amount = 65.5, description = 'Simulação: Almoço compartilhado', otherEmail } =
      (request.body as any) || {};

    let otherUser = null;
    if (otherEmail) {
      otherUser = await prisma.user.findUnique({ where: { email: otherEmail.toLowerCase().trim() } });
    } else {
      // Procura primeiro Letícia ou qualquer outro usuário registrado
      otherUser = await prisma.user.findFirst({
        where: {
          id: { not: user.id },
          email: { contains: 'leticia', mode: 'insensitive' },
        },
      });

      if (!otherUser) {
        otherUser = await prisma.user.findFirst({
          where: { id: { not: user.id } },
        });
      }
    }

    if (!otherUser) {
      return reply.status(400).send({ error: 'Nenhum outro usuário cadastrado para simular transferência.' });
    }

    const senderId = direction === 'INCOMING' ? otherUser.id : user.id;
    const receiverId = direction === 'INCOMING' ? user.id : otherUser.id;

    const notif = await prisma.transferNotification.create({
      data: {
        senderId,
        receiverId,
        description: String(description),
        amount: Number(amount) || 50.0,
        type: 'REIMBURSEMENT',
        date: new Date(),
        paymentMethod: 'Pix',
        notes: `Simulação de teste criada em ${new Date().toLocaleTimeString('pt-BR')}`,
        status: 'PENDING',
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return reply.status(201).send({
      message: `Simulação de transferência (${direction === 'INCOMING' ? 'Recebida' : 'Enviada'}) criada com sucesso!`,
      notification: notif,
    });
  });
};
