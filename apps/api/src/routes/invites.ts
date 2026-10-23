import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { getRequestUserId } from '../lib/auth.js';

export const invitesRoutes: FastifyPluginAsync = async (app) => {
  // Helper to extract authenticated user
  async function getAuthUser(request: any) {
    const userId = await getRequestUserId(request);
    if (!userId) return null;
    return await prisma.user.findUnique({ where: { id: userId } });
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
            { receiverEmail: { equals: user.email.toLowerCase().trim(), mode: 'insensitive' } },
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

  // Create / Send Invite
  app.post('/', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'Usuário não identificado.' });

    const { email, personId } = (request.body as any) || {};
    if (!email || !email.includes('@')) {
      return reply.status(400).send({ error: 'Informe um e-mail válido.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === user.email.toLowerCase().trim()) {
      return reply.status(400).send({ error: 'Você não pode enviar um convite para si mesmo.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Check if pending invite already exists
    const existing = await prisma.contactInvite.findFirst({
      where: {
        senderId: user.id,
        receiverEmail: cleanEmail,
        status: 'PENDING',
      },
    });

    if (existing) {
      return reply.send({
        message: `Já existe um convite pendente para ${cleanEmail}.`,
        invite: existing,
      });
    }

    const invite = await prisma.contactInvite.create({
      data: {
        senderId: user.id,
        receiverEmail: cleanEmail,
        receiverId: targetUser?.id || null,
        personId: personId || null,
        status: 'PENDING',
      },
    });

    return reply.send({
      message: `Convite de conexão enviado com sucesso para ${cleanEmail}!`,
      invite,
    });
  });

  // Accept invite
  app.post('/:id/accept', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }
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
        receiverId: user.id,
      },
    });

    // If sender had a Person record attached to this invite, link it
    if (invite.personId) {
      await prisma.person.update({
        where: { id: invite.personId },
        data: { linkedUserId: user.id },
      }).catch(() => {});
    }

    // Also check if current user has a Person record for sender, link it reciprocally
    if (invite.sender) {
      const myContactForSender = await prisma.person.findFirst({
        where: {
          userId: user.id,
          OR: [
            { linkedUserId: invite.sender.id },
            { name: { contains: invite.sender.name, mode: 'insensitive' } },
          ],
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
