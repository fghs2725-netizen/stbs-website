import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuotationEditor } from "@/components/quotation/QuotationEditor";
export const dynamic = "force-dynamic";
export default async function EditQuotationPage() { const session = await auth(); if (!session?.user) redirect("/admin/login"); return <QuotationEditor />; }
