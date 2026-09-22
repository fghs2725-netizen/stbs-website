import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { financialYearStart, formatQuotationReference } from "@/lib/quotation-reference";
import type { QuotationState } from "@/components/quotation/quotation-model";
import { calcTotal, calcTotals, getValidItems, isQuotationPdfReady } from "@/components/quotation/quotation-model";
import { resolveQuotationTemplate, storableTemplateId } from "@/lib/quotation-templates";
import { decodeItemText, encodeItemText } from "@/components/quotation/item-text";

export async function requireAdmin() { const session = await auth(); if (!session?.user) throw new Error("UNAUTHORIZED"); }
function input(q: QuotationState) { return { date:q.quotationDate, validity:q.validity, serviceType:q.serviceType, customServiceType:q.customServiceType || null, subject:q.subject, clientCompanyName:q.client.companyName, clientContactPerson:q.client.contactPerson || null, clientAddressLine1:q.client.addressLine1 || null, clientAddressLine2:q.client.addressLine2 || null, clientCity:q.client.city || null, clientState:q.client.state || null, clientPinCode:q.client.pinCode || null, clientPhone:q.client.phone || null, clientEmail:q.client.email || null, clientGstin:q.client.gstin?.trim() || null, discountType:q.discountType || null, discountValue:q.discountType ? (q.discountValue ?? 0) : 0, gstEnabled:Boolean(q.gstEnabled), gstMode:q.gstEnabled ? (q.gstMode || "CGST_SGST") : null, gstRate:q.gstRate ?? 18, templateId:storableTemplateId(q.templateId) }; }
function state(x: any): QuotationState { return { id:x.id, clientId:x.clientId || undefined, quotationReference:x.reference, quotationDate:x.date, validity:x.validity, status:x.status, serviceType:x.serviceType, customServiceType:x.customServiceType || "", subject:x.subject, client:{gstin:x.clientGstin||"",companyName:x.clientCompanyName,contactPerson:x.clientContactPerson||"",addressLine1:x.clientAddressLine1||"",addressLine2:x.clientAddressLine2||"",city:x.clientCity||"",state:x.clientState||"",pinCode:x.clientPinCode||"",phone:x.clientPhone||"",email:x.clientEmail||""}, items:x.items.map((i:any)=>({id:i.id,...decodeItemText(i.description),unit:i.unit,quantity:Number(i.quantity),rate:Number(i.rate),presetItemId:i.presetItemId ?? undefined})), discountType:(x.discountType as any)||null, discountValue:Number(x.discountValue ?? 0), gstEnabled:Boolean(x.gstEnabled), gstMode:(x.gstMode as any)||"CGST_SGST", gstRate:Number(x.gstRate ?? 18), templateId:x.templateId || undefined}; }
// Detail reads carry the wording the quotation renders with (its template, its frozen snapshot, or the default).
async function withTemplate(x:any):Promise<QuotationState>{ const s=state(x); s.template=await resolveQuotationTemplate({status:x.status,templateId:x.templateId??null,templateSnapshot:x.templateSnapshot??null}); return s; }
async function reference(tx:any) { const year = financialYearStart(); const c = await tx.quotationReferenceCounter.upsert({where:{year},create:{year,lastNumber:1},update:{lastNumber:{increment:1}}}); return formatQuotationReference(year, c.lastNumber); }
export async function saveQuotation(q: QuotationState) { await requireAdmin(); return prisma.$transaction(async tx => { const data=input(q); if(data.templateId && !(await tx.quotationTemplate.findUnique({where:{id:data.templateId},select:{id:true}}))) throw new Error("TEMPLATE_UNAVAILABLE"); const items={create:q.items.map((i,n)=>({position:n,description:encodeItemText(i.description,i.details),unit:i.unit,quantity:i.quantity,rate:i.rate,presetItemId:i.presetItemId ?? null}))}; let clientId=q.clientId; if(q.saveClientForFuture && !clientId){ const existing=await tx.client.findFirst({where:{companyName:data.clientCompanyName,phone:data.clientPhone||undefined,email:data.clientEmail||undefined}}); const client=existing || await tx.client.create({data:{companyName:data.clientCompanyName,contactPerson:data.clientContactPerson,addressLine1:data.clientAddressLine1,addressLine2:data.clientAddressLine2,city:data.clientCity,state:data.clientState,pinCode:data.clientPinCode,phone:data.clientPhone,email:data.clientEmail,gstNumber:data.clientGstin}}); clientId=client.id; } if(q.id){ const old=await tx.quotation.findUnique({where:{id:q.id}}); if(!old) throw new Error("NOT_FOUND"); if(old.status !== "DRAFT") throw new Error("FINAL_READ_ONLY"); return state(await tx.quotation.update({where:{id:q.id},data:{...data,clientId,items:{deleteMany:{},...items}} ,include:{items:{orderBy:{position:"asc"}}}})); } const referenceValue=await reference(tx); return state(await tx.quotation.create({data:{...data,clientId,reference:referenceValue,items},include:{items:true}})); }); }
export async function getQuotation(id:string){await requireAdmin(); const x=await prisma.quotation.findUnique({where:{id},include:{items:{orderBy:{position:"asc"}}}}); return x?withTemplate(x):null;}
export async function getQuotationForPdfRender(id:string){const x=await prisma.quotation.findUnique({where:{id},include:{items:{orderBy:{position:"asc"}}}}); return x?withTemplate(x):null;}
export type QuotationSort = "updated" | "created" | "reference" | "client" | "amount";
export type QuotationListOptions = { sort?: QuotationSort; dir?: "asc" | "desc"; from?: string; to?: string };
const SORT_FIELDS: Record<Exclude<QuotationSort, "amount">, string> = { updated: "updatedAt", created: "createdAt", reference: "reference", client: "clientCompanyName" };
const isoDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export async function listQuotations(search = "", status = "ALL", page = 1, pageSize = 20, opts: QuotationListOptions = {}) {
  await requireAdmin();
  const where: any = { deletedAt: null };
  if (status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { clientCompanyName: { contains: search, mode: "insensitive" } },
      { serviceType: { contains: search, mode: "insensitive" } },
    ];
  }
  // Date range applies to when the quotation was created.
  const from = isoDay(opts.from), to = isoDay(opts.to);
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  const dir = opts.dir === "asc" ? "asc" : "desc";
  const sort = opts.sort && opts.sort !== "amount" && opts.sort in SORT_FIELDS ? opts.sort : "updated";
  // Offset pagination: staff navigate by page number and filtered views must stay shareable URLs.
  // id tiebreaker keeps ordering deterministic. Amount is derived from items, so it is display-only (not a sort key).
  const [rows, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: [{ [SORT_FIELDS[sort as keyof typeof SORT_FIELDS]]: dir }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { items: { select: { quantity: true, rate: true } } },
    }),
    prisma.quotation.count({ where }),
  ]);
  return {
    rows: rows.map((x: any) => {
      const items = x.items.map((i: any) => ({ id: "", description: "x", unit: "x", quantity: Number(i.quantity), rate: Number(i.rate) }));
      const base = state({ ...x, items: [] });
      const valid = getValidItems(items);
      return { ...base, createdAt: x.createdAt.toISOString(), itemCount: items.length, amount: calcTotal(valid), grandTotal: calcTotals({ ...base, items: valid }).grandTotal };
    }),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
  };
}
export async function deleteQuotation(id: string) {
  await requireAdmin();
  const found = await prisma.quotation.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!found) throw new Error("NOT_FOUND");
  // Soft delete: the row and its items stay in the database and can be restored by clearing deletedAt.
  await prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
}
export async function finalizeQuotation(id:string){await requireAdmin(); const q=await getQuotation(id); if(!q) throw new Error("NOT_FOUND"); if(q.status==="FINAL") throw new Error("ALREADY_FINALIZED"); if(!isQuotationPdfReady(q)) throw new Error("INVALID"); // Freeze the wording: from here on the quotation renders from this copy, whatever happens to the template.
  const template=q.template; await prisma.quotation.update({where:{id},data:{status:"FINAL",finalizedAt:new Date(),templateId:storableTemplateId(template?.id),templateSnapshot:template?(template as object):undefined}});
  // What each generated line actually went out at, so the next quotation starts from a real number.
  await rememberQuotedRates(id);}
export async function duplicateQuotation(id:string){
  await requireAdmin();
  return prisma.$transaction(async tx=>{
    // Copy only business data. IDs, lifecycle timestamps and soft-delete state
    // intentionally remain database defaults on the independent draft.
    const x=await tx.quotation.findFirst({where:{id,deletedAt:null},include:{items:{orderBy:{position:"asc"}}}});
    if(!x) throw new Error("NOT_FOUND");
    const ref=await reference(tx);
    return state(await tx.quotation.create({
      data:{
        reference:ref,status:"DRAFT",date:x.date,validity:x.validity,
        serviceType:x.serviceType,customServiceType:x.customServiceType,subject:x.subject,
        clientId:x.clientId,clientCompanyName:x.clientCompanyName,
        clientContactPerson:x.clientContactPerson,clientAddressLine1:x.clientAddressLine1,
        clientAddressLine2:x.clientAddressLine2,clientCity:x.clientCity,clientState:x.clientState,
        clientPinCode:x.clientPinCode,clientPhone:x.clientPhone,clientEmail:x.clientEmail,clientGstin:x.clientGstin,discountType:x.discountType,discountValue:x.discountValue,gstEnabled:x.gstEnabled,gstMode:x.gstMode,gstRate:x.gstRate,templateId:x.templateId,
        items:{create:x.items.map(i=>({position:i.position,description:i.description,unit:i.unit,quantity:i.quantity,rate:i.rate,presetItemId:i.presetItemId}))}
      },
      include:{items:{orderBy:{position:"asc"}}}
    }));
  });
}
export async function dashboardCounts(){await requireAdmin(); return prisma.quotation.groupBy({by:["status"],_count:true});}
export type ReusableClient = { id:string; gstin:string; companyName:string; contactPerson:string; addressLine1:string; addressLine2:string; city:string; state:string; pinCode:string; phone:string; email:string };
function clientState(c:any):ReusableClient{return {id:c.id,gstin:c.gstNumber||"",companyName:c.companyName,contactPerson:c.contactPerson||"",addressLine1:c.addressLine1||"",addressLine2:c.addressLine2||"",city:c.city||"",state:c.state||"",pinCode:c.pinCode||"",phone:c.phone||"",email:c.email||""};}
export async function listClients(search=""){await requireAdmin(); const clients=await prisma.client.findMany({where:search?{OR:[{companyName:{contains:search,mode:"insensitive"}},{contactPerson:{contains:search,mode:"insensitive"}},{phone:{contains:search,mode:"insensitive"}}]}:undefined,orderBy:{updatedAt:"desc"}});return clients.map(clientState);}

/**
 * Records what each generated line was actually quoted at, so the next quotation starts from a real
 * number. Called on finalise rather than on every save: a half-typed rate must not become the
 * default, and only a quotation that went out is evidence of anything.
 */
export async function rememberQuotedRates(quotationId: string): Promise<void> {
  const rows = await prisma.quotationItem.findMany({
    where: { quotationId, presetItemId: { not: null } },
    select: { presetItemId: true, rate: true },
  });
  await Promise.all(
    rows
      .filter((r) => Number(r.rate) > 0)
      .map((r) => prisma.quotationPresetItem.update({
        where: { id: r.presetItemId as string },
        data: { lastRate: r.rate },
      })),
  );
}
