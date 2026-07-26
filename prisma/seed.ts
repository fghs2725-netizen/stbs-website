import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@stbs.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "STBS@admin123";
const ADMIN_NAME = process.env.ADMIN_SEED_NAME || "STBS Administrator";

async function main() {
  console.log("Seeding database...");

  const role = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: {
      name: "SUPER_ADMIN",
      hierarchy: 100,
    },
  });
  console.log(`Role SUPER_ADMIN ready (id: ${role.id})`);

  const existingAdmin = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL.toLowerCase() },
  });

  if (existingAdmin) {
    console.log(`Admin user ${ADMIN_EMAIL} already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: passwordHash,
      roleId: role.id,
    },
  });

  console.log(`Admin user created:`);
  console.log(`  email:    ${admin.email}`);
  console.log(`  id:       ${admin.id}`);
  console.log(`  role:     SUPER_ADMIN`);
  console.log(`  password: ${ADMIN_PASSWORD} (change on first login)`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
