import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function main() {
  const targetDbUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!targetDbUrl || !targetDbUrl.startsWith('postgres')) {
    console.error('Usage: npx tsx src/scripts/import_to_postgres.ts "<POSTGRES_DATABASE_URL>"');
    console.error('Please provide a valid PostgreSQL connection string (e.g. from Neon).');
    process.exit(1);
  }

  console.log(`Connecting to PostgreSQL database...`);
  const prisma = new PrismaClient({
    datasourceUrl: targetDbUrl,
  });

  const candidates = [
    path.resolve(__dirname, '../../../../data/sqlite_export.json'),
    path.resolve(process.cwd(), 'data/sqlite_export.json'),
    path.resolve(process.cwd(), '../../data/sqlite_export.json'),
  ];
  const jsonPath = candidates.find((p) => fs.existsSync(p));
  if (!jsonPath) {
    console.error('Export file sqlite_export.json not found. Looked in:', candidates);
    process.exit(1);
  }
  console.log(`Using data source: ${jsonPath}`);

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('--- Cleaning any initial empty records in Neon ---');
  await prisma.transaction.deleteMany();
  await prisma.person.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.contactInvite.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- 1. Importing Users ---');
  for (const u of data.User) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        avatar: u.avatar,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }
  console.log(`Imported ${data.User.length} users.`);

  console.log('--- 2. Importing Accounts ---');
  for (const a of data.Account) {
    await prisma.account.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        name: a.name,
        type: a.type || 'CHECKING',
        color: a.color,
        initialBalance: Number(a.initialBalance || 0),
        isArchived: Boolean(a.isArchived),
        userId: a.userId,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
      },
    });
  }
  console.log(`Imported ${data.Account.length} accounts.`);

  console.log('--- 3. Importing Categories ---');
  for (const c of data.Category) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isIncome: Boolean(c.isIncome),
        isArchived: Boolean(c.isArchived),
        userId: c.userId,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  console.log(`Imported ${data.Category.length} categories.`);

  console.log('--- 4. Importing People ---');
  for (const p of data.Person) {
    await prisma.person.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        notes: p.notes,
        isArchived: Boolean(p.isArchived),
        userId: p.userId,
        linkedUserId: p.linkedUserId,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }
  console.log(`Imported ${data.Person.length} people.`);

  console.log('--- 5. Importing Payment Methods ---');
  for (const pm of data.PaymentMethod) {
    await prisma.paymentMethod.upsert({
      where: { id: pm.id },
      update: {},
      create: {
        id: pm.id,
        name: pm.name,
        icon: pm.icon,
        isArchived: Boolean(pm.isArchived),
        userId: pm.userId,
        createdAt: new Date(pm.createdAt),
        updatedAt: new Date(pm.updatedAt),
      },
    });
  }
  console.log(`Imported ${data.PaymentMethod.length} payment methods.`);

  console.log('--- 6. Importing Transactions ---');
  let txCount = 0;
  for (const t of data.Transaction) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        purchaseDate: new Date(t.purchaseDate),
        dueDate: new Date(t.dueDate),
        paid: Boolean(t.paid),
        paymentMethod: t.paymentMethod,
        notes: t.notes,
        currentInstallment: t.currentInstallment,
        totalInstallments: t.totalInstallments,
        installmentGroupId: t.installmentGroupId,
        userId: t.userId,
        accountId: t.accountId,
        categoryId: t.categoryId,
        personId: t.personId,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
    txCount++;
  }
  console.log(`Imported ${txCount} transactions.`);

  console.log('\n>>> All data successfully migrated to PostgreSQL/Neon! <<<');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
