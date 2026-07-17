import { redirect, notFound } from "next/navigation"; import { auth } from "@/auth"; import { getQuotation } from "@/lib/quotation-management"; import { QuotationEditor } from "@/components/quotation/QuotationEditor";
export const dynamic="force-dynamic";
export default async function EditPage({params}:{params:Promise<{id:string}>}){const s=await auth();if(!s?.user)redirect("/admin/login");const q=await getQuotation((await params).id);if(!q)notFound();if(q.status==="FINAL")redirect(`/admin/quotations/${q.id}`);return <QuotationEditor initial={q}/>}
