import { QuotationEditor } from "@/components/quotation/QuotationEditor";
import { listClients } from "@/lib/quotation-management";
import { initialQuotation, type QuotationState } from "@/components/quotation/quotation-model";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
export const metadata = { title: "New Quotation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function NewQuotationPage({searchParams}:{searchParams:Promise<{clientId?:string}>}) { const session=await auth(); if(!session?.user) redirect("/admin/login"); const clients=await listClients(); const id=(await searchParams).clientId; const client=clients.find(x=>x.id===id); const base={...initialQuotation,quotationDate:new Date().toLocaleDateString("en-GB")}; const initial:QuotationState=client?{...base,clientId:client.id,client:{companyName:client.companyName,contactPerson:client.contactPerson,addressLine1:client.addressLine1,addressLine2:client.addressLine2,city:client.city,state:client.state,pinCode:client.pinCode,phone:client.phone,email:client.email}}:base; return <QuotationEditor initial={initial} clients={clients} backHref="/admin/quotations" backLabel="Back to quotations" />; }
