import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { seedPresets } from "../lib/quotation-preset-store";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@stbs.com";
// No built-in password: a default that is written in the repo is a password everyone knows. If none is
// supplied, a random one is generated and shown once below.
const GENERATED = !process.env.ADMIN_SEED_PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || randomBytes(12).toString("base64url");
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
  console.log(`  password: ${ADMIN_PASSWORD}${GENERATED ? " (generated: shown only now, so save it)" : ""}`);
  console.log("  Change it any time from Admin > Account & password.");

  // The two jobs the owner quotes over and over. Only ever added, never written back over, so a
  // preset he has since reworded survives a re-seed.
  const presets = await seedPresets();
  console.log(presets ? `Quotation presets created: ${presets}` : "Quotation presets already present.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
