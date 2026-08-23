import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyDocumentRenderToken } from "@/lib/document-render-auth";
import { DocumentRenderer } from "@/components/documents/DocumentRenderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DocumentPdfRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!verifyDocumentRenderToken(token, id)) notFound();

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: "asc" } },
      sections: { orderBy: { position: "asc" } },
    },
  });

  if (!document) notFound();

  return (
    <main
      id="document-pdf-render"
      data-pdf-ready="true"
      style={{ background: "#ffffff" }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .doc-page { display: block !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 0 !important; position: relative !important; break-inside: auto !important; break-after: page !important; background: #ffffff !important; }
        .doc-page:last-child { break-after: auto !important; }
        @page { size: A4 portrait; margin: 0; }
      `}</style>
      <DocumentRenderer
        document={document}
        items={document.items}
        sections={document.sections}
      />
    </main>
  );
}
