const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!username) {
    throw new Error(
      'SUPER_ADMIN_USERNAME environment variable is not configured'
    );
  }

  if (!password) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD environment variable is not configured'
    );
  }

  const existing = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existing) {
    console.log('Super admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      name: 'System Administrator',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log('Super admin created');
}

main()
  .catch((error) => {
    console.error('Super admin seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
