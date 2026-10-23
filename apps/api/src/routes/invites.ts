import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../lib/auth.js';

export const invitesRoutes: FastifyPluginAsync = async (app) => {
  // Helper to extract authenticated user
  async function getAuthUser(request: any) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback to default Lucas user if running without login
      return await prisma.user.findFirst();
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = verifyToken(token);
    if (!payload?.id) {
      return await prisma.user.findFirst();
    }
    return await prisma.user.findUnique({ where: { id: payload.id } });
  }

  // List invites for current user
  app.get('/', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não identificado.' });
    }

    const [received, sent] = await Promise.all([
      prisma.contactInvite.findMany({
        where: {
          OR: [
            { receiverId: user.id },
            { receiverEmail: user.email.toLowerCase() },
          ],
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactInvite.findMany({
        where: { senderId: user.id },
        include: {
          receiver: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      received: received.map((inv) => ({
        id: inv.id,
        senderId: inv.senderId,
        senderName: inv.sender?.name || 'Usuário',
        senderEmail: inv.sender?.email || '',
        receiverEmail: inv.receiverEmail,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
      })),
      sent: sent.map((inv) => ({
        id: inv.id,
        senderId: inv.senderId,
        receiverId: inv.receiverId,
        receiverName: inv.receiver?.name,
        receiverEmail: inv.receiverEmail,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
      })),
    };
  });

  // Accept invite
  app.post('/:id/accept', async (request, reply) => {
    const user = await getAuthUser(request);
    const { id } = request.params as { id: string };

    const invite = await prisma.contactInvite.findUnique({
      where: { id },
      include: { sender: true },
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Convite não encontrado.' });
    }

    const updated = await prisma.contactInvite.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        receiverId: user ? user.id : invite.receiverId,
      },
    });

    // If sender had a Person record attached to this invite, link it
    if (invite.personId && user) {
      await prisma.person.update({
        where: { id: invite.personId },
        data: { linkedUserId: user.id },
      }).catch(() => {});
    }

    // Also check if current user has a Person record for sender, link it reciprocally
    if (user && invite.sender) {
      const myContactForSender = await prisma.person.findFirst({
        where: {
          name: { contains: invite.sender.name },
          linkedUserId: null,
        },
      });
      if (myContactForSender) {
        await prisma.person.update({
          where: { id: myContactForSender.id },
          data: { linkedUserId: invite.sender.id },
        }).catch(() => {});
      }
    }

    return reply.send({
      message: 'Convite de conexão aceito com sucesso!',
      invite: updated,
    });
  });

  // Reject invite
  app.post('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const invite = await prisma.contactInvite.findUnique({ where: { id } });
    if (!invite) {
      return reply.status(404).send({ error: 'Convite não encontrado.' });
    }

    const updated = await prisma.contactInvite.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    return reply.send({
      message: 'Convite recusado.',
      invite: updated,
    });
  });
};
