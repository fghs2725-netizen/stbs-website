import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { prisma } from "@/lib/prisma";
import { passwordFingerprint } from "@/lib/password-fingerprint";

/**
 * Face ID / Touch ID sign-in for the admin (WebAuthn passkeys).
 *
 * A passkey can only be added by someone already signed in, and signing in with one applies the same
 * rules as the password: an active account, SUPER_ADMIN only, and the password fingerprint stamped into
 * the session, so changing the password still ends every session.
 *
 * Challenges live in the database and are deleted when answered, so a captured response can never be
 * replayed. That matters here because iPhone passkeys always report a signature counter of 0.
 */

export type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]["response"];
export type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]["response"];

export const CHALLENGE_COOKIE = "stbs_webauthn";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * The relying party for a request's host. On the live site the ID is the bare domain, so a passkey made
 * on www.stbs.in also works on stbs.in; anywhere else (localhost, previews) it is that host alone.
 */
export function relyingParty(host: string | null, proto: string | null): { rpID: string; origins: string[] } {
  const hostname = (host ?? "localhost").split(":")[0].toLowerCase();
  if (hostname === "stbs.in" || hostname.endsWith(".stbs.in")) {
    return { rpID: "stbs.in", origins: ["https://www.stbs.in", "https://stbs.in"] };
  }
  const scheme = proto ?? (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https");
  return { rpID: hostname, origins: [`${scheme}://${host}`] };
}

export function relyingPartyFrom(headers: Headers) {
  return relyingParty(headers.get("x-forwarded-host") ?? headers.get("host"), headers.get("x-forwarded-proto")?.split(",")[0] ?? null);
}

async function saveChallenge(challenge: string, userId: string | null): Promise<string> {
  await prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  const row = await prisma.webAuthnChallenge.create({
    data: { challenge, userId, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
    select: { id: true },
  });
  return row.id;
}

/** Takes a challenge out of the database: it can be answered once, and only before it expires. */
async function consumeChallenge(id: string | undefined | null) {
  if (!id) return null;
  const row = await prisma.webAuthnChallenge.delete({ where: { id } }).catch(() => null);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

// ─── Adding a passkey (signed in) ────────────────────────────────────────────

export async function registrationOptions(userId: string, rp: { rpID: string }) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, email: true, name: true, passkeys: { select: { credentialId: true, transports: true } } } });
  if (!user) throw new Error("Account not found");
  const options = await generateRegistrationOptions({
    rpName: "STBS Admin",
    rpID: rp.rpID,
    userID: user.id,
    userName: user.email ?? user.id,
    userDisplayName: user.name ?? user.email ?? "STBS Admin",
    attestationType: "none",
    excludeCredentials: user.passkeys.map((p) => ({
      id: isoBase64URL.toBuffer(p.credentialId),
      type: "public-key" as const,
      transports: p.transports as NonNullable<Parameters<typeof generateRegistrationOptions>[0]["excludeCredentials"]>[number]["transports"],
    })),
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
  });
  const challengeId = await saveChallenge(options.challenge, user.id);
  return { options, challengeId };
}

export async function registerPasskey(input: {
  userId: string;
  challengeId: string | undefined;
  response: RegistrationResponse;
  deviceName: string | null;
  rp: { rpID: string; origins: string[] };
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const challenge = await consumeChallenge(input.challengeId);
  if (!challenge || challenge.userId !== input.userId) return { ok: false, error: "That took too long. Try again." };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: input.rp.origins,
      expectedRPID: input.rp.rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    console.warn("[passkey] registration rejected:", (e as Error).message);
    return { ok: false, error: "Face ID could not be set up. Try again." };
  }
  if (!verification.verified || !verification.registrationInfo) return { ok: false, error: "Face ID could not be set up. Try again." };

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  const row = await prisma.passkey.create({
    select: { id: true },
    data: {
      userId: input.userId,
      credentialId: isoBase64URL.fromBuffer(credentialID),
      publicKey: Buffer.from(credentialPublicKey),
      counter,
      transports: input.response.response.transports ?? [],
      deviceName: input.deviceName?.slice(0, 60) || null,
    },
  });
  return { ok: true, id: row.id };
}

// ─── Signing in with a passkey ───────────────────────────────────────────────

export async function authenticationOptions(rp: { rpID: string }) {
  // No allowCredentials: the phone offers whichever passkey it holds for this site (a discoverable credential).
  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required" });
  const challengeId = await saveChallenge(options.challenge, null);
  return { options, challengeId };
}

/** Verifies a sign-in and returns the user for the session, or null. Same account rules as the password. */
export async function verifyPasskeySignIn(input: {
  challengeId: string | undefined;
  response: AuthenticationResponse;
  rp: { rpID: string; origins: string[] };
}) {
  const challenge = await consumeChallenge(input.challengeId);
  if (!challenge) return null;

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: input.response.id },
    include: { user: { include: { role: true } } },
  });
  if (!passkey) return null;
  const user = passkey.user;
  if (user.deletedAt || !user.password || user.role?.name !== "SUPER_ADMIN") {
    console.warn(`[Auth] Passkey sign-in refused for user ${user.id}: account not active or not SUPER_ADMIN`);
    return null;
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: input.rp.origins,
      expectedRPID: input.rp.rpID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(passkey.credentialId),
        credentialPublicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
      },
      requireUserVerification: true,
    });
  } catch (e) {
    console.warn("[Auth] Passkey sign-in rejected:", (e as Error).message);
    return null;
  }
  if (!verification.verified) return null;

  const now = new Date();
  await prisma.passkey.update({ where: { id: passkey.id }, data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: now } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  console.log(`[Auth] Successful passkey login: ${user.email}`);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role!.name,
    pwf: passwordFingerprint(user.password),
  };
}
