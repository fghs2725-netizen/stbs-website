import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { DOCUMENT_TYPES, documentMime, documentUploadSchema, MAX_DOCUMENT_BYTES, uniqueDocumentNames, validDocumentSignature } from "../lib/company-documents/shared";
import { deleteDocumentObject, documentObjectInfo, documentStorageProvider, readDocumentObject, writeLocalDocument } from "../lib/company-documents/storage";

async function main() {
  const original = { token: process.env.COMPANY_DOCUMENTS_BLOB_READ_WRITE_TOKEN, vercel: process.env.VERCEL, mode: process.env.NODE_ENV, root: process.env.COMPANY_DOCUMENTS_LOCAL_DIR };
  const root = await mkdtemp(join(tmpdir(), "company-documents-"));
  try {
    process.env.COMPANY_DOCUMENTS_LOCAL_DIR = root;
    delete process.env.COMPANY_DOCUMENTS_BLOB_READ_WRITE_TOKEN; delete process.env.VERCEL;
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(documentStorageProvider(), "local");
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(documentStorageProvider, /not been configured/);
    Object.assign(process.env, { NODE_ENV: "development", VERCEL: "1" });
    assert.throws(documentStorageProvider, /not been configured/);
    delete process.env.VERCEL;
    const valid = { originalName: "GSTIN.PDF", title: "GSTIN", category: "GSTIN", size: 128 };
    assert.equal(documentMime(valid.originalName), "application/pdf");
    assert.equal(documentMime("file.exe"), null);
    assert.equal(documentUploadSchema.safeParse(valid).success, true);
    for (const input of [{ ...valid, size: 0 }, { ...valid, size: MAX_DOCUMENT_BYTES + 1 }, { ...valid, originalName: "../secret.pdf" }, { ...valid, title: " " }, { ...valid, category: "unknown" }]) assert.equal(documentUploadSchema.safeParse(input).success, false);
    const samples: Record<string, Uint8Array> = {
      pdf: Buffer.from("%PDF-1.4\n"), jpg: Buffer.from([255, 216, 255]), jpeg: Buffer.from([255, 216, 255]),
      png: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), webp: Buffer.from("RIFF1234WEBP"),
      doc: Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]), xls: Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]),
      docx: Buffer.from([80, 75, 3, 4]), xlsx: Buffer.from([80, 75, 3, 4]), csv: Buffer.from("name,value\nbank,example"),
    };
    for (const [ext, mime] of Object.entries(DOCUMENT_TYPES)) {
      assert.ok(validDocumentSignature(samples[ext], mime), ext);
      assert.equal(validDocumentSignature(new Uint8Array([0, 1]), mime), false, ext);
    }
    assert.deepEqual(uniqueDocumentNames(["bank.pdf", "BANK.pdf", "bank (2).pdf", "bank.pdf"]), ["bank.pdf", "BANK (2).pdf", "bank (2) (2).pdf", "bank (3).pdf"]);
    assert.equal(uniqueDocumentNames(["../bank\r\n.pdf"])[0].includes("/"), false);
    const key = "company-documents/test-123.pdf";
    await writeLocalDocument(key, Buffer.from(samples.pdf));
    assert.equal((await documentObjectInfo("local", key)).size, samples.pdf.length);
    const stream = await readDocumentObject("local", key);
    assert.equal(await new Response(stream).text(), "%PDF-1.4\n");
    await assert.rejects(() => writeLocalDocument(key, Buffer.from("overwrite")), /EEXIST/);
    await assert.rejects(() => readDocumentObject("local", "../secret"), /Invalid document key/);
    await deleteDocumentObject("local", key); await deleteDocumentObject("local", key);
    console.log("PASS: document validation, all formats, duplicate filenames, private storage, deletion and traversal protection");
  } finally {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep) && root.includes("company-documents-"));
    await rm(root, { recursive: true, force: true });
    for (const [key, value] of Object.entries({ COMPANY_DOCUMENTS_BLOB_READ_WRITE_TOKEN: original.token, VERCEL: original.vercel, NODE_ENV: original.mode, COMPANY_DOCUMENTS_LOCAL_DIR: original.root })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
