import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { QuotationState } from "@/components/quotation/quotation-model";
import { isQuotationPdfReady } from "@/components/quotation/quotation-model";

export async function requireAdmin() { const session = await auth(); if (!session?.user) throw new Error("UNAUTHORIZED"); }
function input(q: QuotationState) { return { date:q.quotationDate, validity:q.validity, serviceType:q.serviceType, customServiceType:q.customServiceType || null, subject:q.subject, clientCompanyName:q.client.companyName, clientContactPerson:q.client.contactPerson || null, clientAddressLine1:q.client.addressLine1 || null, clientAddressLine2:q.client.addressLine2 || null, clientCity:q.client.city || null, clientState:q.client.state || null, clientPinCode:q.client.pinCode || null, clientPhone:q.client.phone || null, clientEmail:q.client.email || null }; }
function state(x: any): QuotationState { return { id:x.id, clientId:x.clientId || undefined, quotationReference:x.reference, quotationDate:x.date, validity:x.validity, status:x.status, serviceType:x.serviceType, customServiceType:x.customServiceType || "", subject:x.subject, client:{companyName:x.clientCompanyName,contactPerson:x.clientContactPerson||"",addressLine1:x.clientAddressLine1||"",addressLine2:x.clientAddressLine2||"",city:x.clientCity||"",state:x.clientState||"",pinCode:x.clientPinCode||"",phone:x.clientPhone||"",email:x.clientEmail||""}, items:x.items.map((i:any)=>({id:i.id,description:i.description,unit:i.unit,quantity:Number(i.quantity),rate:Number(i.rate)}))}; }
async function reference(tx:any) { const year = new Date().getFullYear(); const c = await tx.quotationReferenceCounter.upsert({where:{year},create:{year,lastNumber:1},update:{lastNumber:{increment:1}}}); return `STBS/${year}/${String(c.lastNumber).padStart(3,"0")}`; }
export async function saveQuotation(q: QuotationState) { await requireAdmin(); return prisma.$transaction(async tx => { const data=input(q); const items={create:q.items.map((i,n)=>({position:n,description:i.description,unit:i.unit,quantity:i.quantity,rate:i.rate}))}; let clientId=q.clientId; if(q.saveClientForFuture && !clientId){ const existing=await tx.client.findFirst({where:{companyName:data.clientCompanyName,phone:data.clientPhone||undefined,email:data.clientEmail||undefined}}); const client=existing || await tx.client.create({data:{companyName:data.clientCompanyName,contactPerson:data.clientContactPerson,addressLine1:data.clientAddressLine1,addressLine2:data.clientAddressLine2,city:data.clientCity,state:data.clientState,pinCode:data.clientPinCode,phone:data.clientPhone,email:data.clientEmail}}); clientId=client.id; } if(q.id){ const old=await tx.quotation.findUnique({where:{id:q.id}}); if(!old) throw new Error("NOT_FOUND"); if(old.status !== "DRAFT") throw new Error("FINAL_READ_ONLY"); return state(await tx.quotation.update({where:{id:q.id},data:{...data,clientId,items:{deleteMany:{},...items}} ,include:{items:{orderBy:{position:"asc"}}}})); } const referenceValue=await reference(tx); return state(await tx.quotation.create({data:{...data,clientId,reference:referenceValue,items},include:{items:true}})); }); }
export async function getQuotation(id:string){await requireAdmin(); const x=await prisma.quotation.findUnique({where:{id},include:{items:{orderBy:{position:"asc"}}}}); return x?state(x):null;}
export async function getQuotationForPdfRender(id:string){const x=await prisma.quotation.findUnique({where:{id},include:{items:{orderBy:{position:"asc"}}}}); return x?state(x):null;}
export async function listQuotations(search = "", status = "ALL", page = 1, pageSize = 20) {
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
  // Offset pagination: staff navigate by page number and filtered views must
  // stay shareable URLs; datasets here are small enough that skip/take is
  // simpler and sufficient. id tiebreaker keeps ordering deterministic.
  const [rows, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { _count: { select: { items: true } } },
    }),
    prisma.quotation.count({ where }),
  ]);
  return {
    rows: rows.map((x: any) => ({
      ...state({ ...x, items: [] }),
      itemCount: x._count?.items ?? 0,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
  };
}
export async function finalizeQuotation(id:string){await requireAdmin(); const q=await getQuotation(id); if(!q) throw new Error("NOT_FOUND"); if(q.status==="FINAL") throw new Error("ALREADY_FINALIZED"); if(!isQuotationPdfReady(q)) throw new Error("INVALID"); await prisma.quotation.update({where:{id},data:{status:"FINAL",finalizedAt:new Date()}});}
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
        clientPinCode:x.clientPinCode,clientPhone:x.clientPhone,clientEmail:x.clientEmail,
        items:{create:x.items.map(i=>({position:i.position,description:i.description,unit:i.unit,quantity:i.quantity,rate:i.rate}))}
      },
      include:{items:{orderBy:{position:"asc"}}}
    }));
  });
}
export async function dashboardCounts(){await requireAdmin(); return prisma.quotation.groupBy({by:["status"],_count:true});}
export type ReusableClient = { id:string; companyName:string; contactPerson:string; addressLine1:string; addressLine2:string; city:string; state:string; pinCode:string; phone:string; email:string };
function clientState(c:any):ReusableClient{return {id:c.id,companyName:c.companyName,contactPerson:c.contactPerson||"",addressLine1:c.addressLine1||"",addressLine2:c.addressLine2||"",city:c.city||"",state:c.state||"",pinCode:c.pinCode||"",phone:c.phone||"",email:c.email||""};}
export async function listClients(search=""){await requireAdmin(); const clients=await prisma.client.findMany({where:search?{OR:[{companyName:{contains:search,mode:"insensitive"}},{contactPerson:{contains:search,mode:"insensitive"}},{phone:{contains:search,mode:"insensitive"}}]}:undefined,orderBy:{updatedAt:"desc"}});return clients.map(clientState);}
