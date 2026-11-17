import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { AiHelper } from "@/components/admin/ai/AiHelper";
import { assistantEnabled } from "@/lib/assistant/providers";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI helper" };

export default async function AiPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "SUPER_ADMIN") redirect("/admin/login");
  return (
    <div className="a-page">
      <PageHeader eyebrow="Assistant" title="AI helper" description="Ask about your figures, or turn a customer's requirement or a PO into a draft." />
      {assistantEnabled() ? (
        <AiHelper />
      ) : (
        <div role="alert" className="a-card p-4 text-[0.9375rem]">
          The AI is not switched on yet. Add <strong>GROQ_API_KEY</strong> (and <strong>GEMINI_API_KEY</strong> as backup) in Vercel → Settings → Environment Variables, then redeploy.
        </div>
      )}
    </div>
  );
}
