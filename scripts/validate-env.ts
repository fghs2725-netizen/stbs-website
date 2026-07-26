import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env' ) });

interface EnvVar {
  name: string;
  required: boolean;
  pattern?: RegExp;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { name: 'DATABASE_URL', required: true, pattern: /^postgresql:\/\//, description: 'PostgreSQL connection URL' },
  { name: 'DATABASE_URL_UNPOOLED', required: true, pattern: /^postgresql:\/\//, description: 'Direct PostgreSQL URL' },
  { name: 'AUTH_SECRET', required: true, pattern: /.{20,}/, description: 'NextAuth secret (min 20 chars)' },
  { name: 'NEXT_PUBLIC_SITE_URL', required: true, pattern: /^https?:\/\//, description: 'Public site URL' },
  { name: 'STORAGE_ENDPOINT', required: false, pattern: /^https?:\/\//, description: 'S3 storage endpoint' },
  { name: 'STORAGE_BUCKET', required: false, description: 'S3 bucket name' },
  { name: 'STORAGE_REGION', required: false, description: 'S3 region' },
  { name: 'STORAGE_ACCESS_KEY_ID', required: false, description: 'S3 access key' },
  { name: 'STORAGE_SECRET_ACCESS_KEY', required: false, description: 'S3 secret key' },
  { name: 'SMTP_HOST', required: false, description: 'SMTP server host' },
  { name: 'SMTP_PORT', required: false, pattern: /^\d+$/, description: 'SMTP port' },
  { name: 'SMTP_USER', required: false, description: 'SMTP username' },
  { name: 'SMTP_PASSWORD', required: false, description: 'SMTP password' },
  { name: 'SMTP_FROM', required: false, description: 'Default from address' },
  { name: 'REDIS_URL', required: false, pattern: /^redis:\/\//, description: 'Redis connection URL' },
];

function validate(): { success: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('Validating environment variables...\n');

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value || value.trim() === '') {
      if (envVar.required) {
        errors.push(`MISSING REQUIRED: ${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`  optional: ${envVar.name} - ${envVar.description}`);
      }
      continue;
    }

    if (envVar.pattern && !envVar.pattern.test(value)) {
      if (envVar.required) {
        errors.push(`INVALID FORMAT: ${envVar.name} - Expected: ${envVar.description}`);
      } else {
        warnings.push(`  invalid format: ${envVar.name} - ${envVar.description}`);
      }
      continue;
    }

    console.log(`  ✓ ${envVar.name}`);
  }

  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      warnings.push('  DATABASE_URL points to localhost - ensure this is correct for your environment');
    }
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      warnings.push('  NEXT_PUBLIC_SITE_URL points to localhost - not suitable for production');
    }
  }

  return { success: errors.length === 0, errors, warnings };
}

const result = validate();

console.log('\n──────────────────────────────────────────');

if (result.warnings.length > 0) {
  console.log('\nWarnings:');
  result.warnings.forEach(w => console.log(w));
}

if (result.errors.length > 0) {
  console.log('\nErrors:');
  result.errors.forEach(e => console.log(`  ✗ ${e}`));
  console.log(`\nValidation failed with ${result.errors.length} error(s)`);
  process.exit(1);
} else {
  console.log('\nAll required environment variables are valid.');
  process.exit(0);
}
