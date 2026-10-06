import "dotenv/config";
import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../lib/prisma";
import { deleteDocumentObject } from "../lib/company-documents/storage";

const base = process.env.TEST_BASE_URL || "http://localhost:3010";
const url = new URL(base);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "These tests must target a local server.");
const ids: string[] = [];
let passed = 0;
function check(label: string, value: unknown) { assert.ok(value, label); console.log(`PASS: ${label}`); passed++; }

async function main() {
  const user = await prisma.user.findFirst({ where: { deletedAt: null, role: { name: "SUPER_ADMIN" }, password: { not: null } }, select: { id: true, name: true, email: true } });
  assert.ok(user, "An existing admin account is required.");
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  assert.ok(secret, "AUTH_SECRET is required.");
  const cookieName = "authjs.session-token";
  const token = await encode({ secret, salt: cookieName, maxAge: 1800, token: { sub: user.id, role: "SUPER_ADMIN", name: user.name, email: user.email } });
  const lowRole = await encode({ secret, salt: cookieName, maxAge: 300, token: { sub: user.id, role: "VIEWER" } });
  const authHeaders = { Cookie: `${cookieName}=${token}` };
  const request = (path: string, init: RequestInit = {}) => fetch(`${base}/api/company-documents${path}`, { ...init, headers: { ...authHeaders, ...init.headers } });
  const create = async (name: string, bytes: Uint8Array) => {
    const response = await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originalName: name, title: `QA ${name}`, category: "Other", size: bytes.length }) });
    const ticket = await response.json();
    assert.equal(response.status, 201, JSON.stringify(ticket)); ids.push(ticket.id);
    assert.equal(ticket.provider, "local", "Run the local suite without a private Blob token.");
    return ticket;
  };
  const sendFile = async (id: string, name: string, bytes: Uint8Array) => {
    const form = new FormData(); form.set("file", new File([new Uint8Array(bytes)], name));
    return request(`/${id}/local`, { method: "POST", body: form });
  };
  try {
    const unauth = await fetch(`${base}/api/company-documents`);
    check("unauthenticated listing denied", unauth.status === 401);
    const low = await fetch(`${base}/api/company-documents`, { headers: { Cookie: `${cookieName}=${lowRole}` } });
    check("non-admin access denied", low.status === 403);
    const pdf = await PDFDocument.create(); pdf.addPage([200, 200]); const bytes = await pdf.save();
    const ticket = await create("company-qa.pdf", bytes);
    let listing = await (await request("")).json();
    check("pending uploads hidden", !listing.documents.some((doc: { id: string }) => doc.id === ticket.id));
    const uploaded = await sendFile(ticket.id, "company-qa.pdf", bytes);
    assert.equal(uploaded.status, 200, await uploaded.text());
    const repeated = await request(`/${ticket.id}/complete`, { method: "POST" });
    check("completion can be repeated", repeated.status === 200);
    listing = await (await request("")).json();
    const saved = listing.documents.find((doc: { id: string }) => doc.id === ticket.id);
    check("uploaded document persists", saved && saved.size === bytes.length && !saved.storageKey && !saved.provider);
    const downloaded = await request(`/${ticket.id}/file`);
    check("authenticated download bytes match", Buffer.from(await downloaded.arrayBuffer()).equals(Buffer.from(bytes)));
    check("download is private and attachment", downloaded.headers.get("cache-control")?.includes("no-store") && downloaded.headers.get("content-disposition")?.startsWith("attachment"));
    const preview = await request(`/${ticket.id}/file?preview=1`);
    check("PDF can be previewed", preview.headers.get("content-disposition")?.startsWith("inline")); await preview.body?.cancel();
    for (const [path, method] of [[`/${ticket.id}/file`, "GET"], [`/${ticket.id}`, "DELETE"], [`/${ticket.id}`, "PATCH"], [`/${ticket.id}/complete`, "POST"], [`/${ticket.id}/local`, "POST"], ["", "POST"]]) {
      check(`${method} ${path} requires authentication`, (await fetch(`${base}/api/company-documents${path}`, { method })).status === 401);
    }
    check("cross-origin writes denied", (await request(`/${ticket.id}`, { method: "DELETE", headers: { Origin: "https://example.invalid" } })).status === 403);
    const edited = await request(`/${ticket.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "QA GST certificate", category: "GSTIN" }) });
    check("rename and category saved", (await edited.json()).document?.category === "GSTIN");
    for (const invalid of [{ originalName: "bad.exe", size: 10 }, { originalName: "big.pdf", size: 20971521 }, { originalName: "empty.pdf", size: 0 }]) {
      check(`reject ${invalid.originalName}`, (await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...invalid, title: "QA invalid", category: "Other" }) })).status === 400);
    }
    const badBytes = Buffer.from("This is not a PDF"); const bad = await create("spoof.pdf", badBytes);
    check("spoofed file rejected after upload", (await sendFile(bad.id, "spoof.pdf", badBytes)).status === 400);
    const csvBytes = Buffer.from("account,bank\nexample,QA bank"); const csv = await create("company-qa.csv", csvBytes);
    check("CSV upload", (await sendFile(csv.id, "company-qa.csv", csvBytes)).status === 200);
    const csvPreview = await request(`/${csv.id}/file?preview=1`);
    check("CSV always downloads", csvPreview.headers.get("content-disposition")?.startsWith("attachment")); await csvPreview.body?.cancel();
    for (let n = 0; n < 2; n++) check("deletion is retry-safe", (await request(`/${ticket.id}`, { method: "DELETE" })).status === 200);
    check("deleted file cannot be downloaded", (await request(`/${ticket.id}/file`)).status === 404);
    check("deleted file cannot be revived", (await request(`/${ticket.id}/complete`, { method: "POST" })).status === 404);
    if (process.env.TEST_WRITE_BROWSER_STATE === "1") {
      const root = join(process.cwd(), ".storage", "company-documents-qa"); await mkdir(root, { recursive: true });
      await writeFile(join(root, "auth.json"), JSON.stringify({ cookies: [{ name: cookieName, value: token, domain: url.hostname, path: "/", expires: Math.floor(Date.now() / 1000) + 1800, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] }));
      await writeFile(join(root, "QA-GSTIN.pdf"), bytes); await writeFile(join(root, "QA-Bank.csv"), csvBytes);
      console.log("Browser fixtures and short-lived local session prepared in .storage/company-documents-qa.");
    }
    console.log(`${passed} API checks passed.`);
  } finally {
    for (const id of ids) {
      const row = await prisma.companyDocument.findUnique({ where: { id } });
      if (row) { await deleteDocumentObject(row.provider, row.storageKey); await prisma.companyDocument.delete({ where: { id } }); }
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
