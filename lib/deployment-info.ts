/**
 * Deployment identity derived exclusively from Vercel/Next.js system
 * environment variables. Contains no secrets. Surfaced in server-side PDF
 * logs so a deployment mismatch (the August 2026 outage root cause) becomes
 * immediately visible instead of masquerading as an application bug.
 */
export function deploymentContext(): { environment: string; deploymentVersion: string; deploymentId?: string } {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  return {
    environment,
    deploymentVersion: commit ? `${environment}@${commit.slice(0, 7)}` : environment,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  };
}
