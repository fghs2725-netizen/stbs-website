import { get, head, put, del, BlobNotFoundError } from "@vercel/blob";
import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { join } from "node:path";

export function privateBlobToken() {
  const token = process.env.COMPANY_DOCUMENTS_BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Private document storage has not been configured.");
  return token;
}
export function documentStorageProvider(): "local" | "blob" {
  if (process.env.COMPANY_DOCUMENTS_BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.VERCEL || process.env.NODE_ENV === "production") throw new Error("Private document storage has not been configured.");
  return "local";
}
function localPath(key: string) {
  if (!/^company-documents\/[a-zA-Z0-9-]+\.[a-z]+$/.test(key)) throw new Error("Invalid document key.");
  return join(process.env.COMPANY_DOCUMENTS_LOCAL_DIR || join(process.cwd(), ".storage", "private"), key);
}
export async function writeLocalDocument(key: string, data: Buffer) {
  const path = localPath(key);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, data, { flag: "wx" });
}
export async function documentObjectInfo(provider: string, key: string) {
  if (provider === "local") return { size: (await stat(localPath(key))).size, pathname: key, private: true };
  const result = await head(key, { token: privateBlobToken() });
  return { size: result.size, pathname: result.pathname, private: new URL(result.url).hostname.endsWith(".private.blob.vercel-storage.com") };
}
export async function readDocumentObject(provider: string, key: string): Promise<ReadableStream<Uint8Array> | null> {
  if (provider === "local") {
    const data = await readFile(localPath(key));
    return new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(data)); controller.close(); } });
  }
  const result = await get(key, { access: "private", token: privateBlobToken(), useCache: false });
  return result?.statusCode === 200 ? result.stream : null;
}
export async function deleteDocumentObject(provider: string, key: string) {
  try {
    if (provider === "local") await unlink(localPath(key));
    else await del(key, { token: privateBlobToken() });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof BlobNotFoundError)) throw error;
  }
}
export async function writeDocumentObject(provider: "local" | "blob", key: string, data: Buffer) {
  if (provider === "local") return writeLocalDocument(key, data);
  await put(key, data, { access: "private", token: privateBlobToken(), addRandomSuffix: false, allowOverwrite: false, contentType: "application/pdf" });
}
