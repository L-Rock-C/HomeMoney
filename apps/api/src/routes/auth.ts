import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../lib/auth.js';
import { loginSchema, registerSchema, updateProfileSchema } from '@homemoney/shared';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Ensure default Lucas user exists on initial launch
  async function ensureDefaultLucasUser() {
    const count = await prisma.user.count();
    if (count === 0) {
      await prisma.user.create({
        data: {
          name: 'Lucas',
          email: 'lucas@homemoney.com',
          passwordHash: hashPassword('lucas123'),
        },
      });
    }
  }
  await ensureDefaultLucasUser();

  // Register
  app.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name, email, password } = parseResult.data;

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return reply.status(400).send({ error: 'Este e-mail já está cadastrado.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
      },
    });

    // Initialize default starter accounts, categories, and payment methods
    await prisma.account.createMany({
      data: [
        { name: 'Carteira Principal', type: 'CHECKING', color: '#10B981', initialBalance: 0, userId: user.id },
        { name: 'Reserva de Emergência', type: 'SAVINGS', color: '#06B6D4', initialBalance: 0, userId: user.id },
      ],
    });

    await prisma.category.createMany({
      data: [
        { name: 'Alimentação', color: '#F59E0B', isIncome: false, userId: user.id },
        { name: 'Moradia & Contas', color: '#6366F1', isIncome: false, userId: user.id },
        { name: 'Transporte', color: '#3B82F6', isIncome: false, userId: user.id },
        { name: 'Lazer & Entretenimento', color: '#EC4899', isIncome: false, userId: user.id },
        { name: 'Saúde & Farmácia', color: '#EF4444', isIncome: false, userId: user.id },
        { name: 'Salário & Renda', color: '#10B981', isIncome: true, userId: user.id },
        { name: 'Outras Entradas', color: '#14B8A6', isIncome: true, userId: user.id },
        { name: 'Acerto de Contas', color: '#10B981', isIncome: true, userId: user.id },
      ],
    });

    await prisma.paymentMethod.createMany({
      data: [
        { name: 'Pix', userId: user.id },
        { name: 'Cartão de Crédito', userId: user.id },
        { name: 'Cartão de Débito', userId: user.id },
        { name: 'Dinheiro', userId: user.id },
      ],
    });

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  // Login (by Name or Email)
  app.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { identifier, password } = parseResult.data;
    const cleanId = identifier.trim();

    // Look for user by email or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { name: cleanId },
        ],
      },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Usuário ou e-mail não encontrado.' });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Senha incorreta.' });
    }

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  // Get current authenticated user
  app.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Não autorizado. Token não informado.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return reply.status(401).send({ error: 'Sessão expirada ou inválida.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  // Update Profile & Password
  app.patch('/profile', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Não autorizado. Token não informado.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const payload = verifyToken(token);
    if (!payload || !payload.id) {
      return reply.status(401).send({ error: 'Sessão expirada ou inválida.' });
    }

    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name, email, currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (email && email.trim() && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existing) {
        return reply.status(400).send({ error: 'Este e-mail já está em uso por outro usuário.' });
      }
      updateData.email = email.toLowerCase().trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return reply.status(400).send({ error: 'Para alterar a senha, informe sua senha atual.' });
      }
      const isValid = verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.status(400).send({ error: 'Senha atual incorreta.' });
      }
      updateData.passwordHash = hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const newToken = createToken({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
    });

    return reply.send({
      token: newToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt.toISOString(),
      },
    });
  });
};

