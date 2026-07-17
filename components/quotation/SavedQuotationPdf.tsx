"use client";
import { useState } from "react";
import { QuotationDocument } from "./QuotationDocument";
import { getValidItems, type QuotationState } from "./quotation-model";
import "./quotation.css";
import "./quotation-refinement.css";
export function SavedQuotationPdf({quotation}:{quotation:QuotationState}){const [message,setMessage]=useState("");const valid=getValidItems(quotation.items);const canPrint=Boolean(quotation.client.companyName.trim()&&quotation.serviceType.trim()&&quotation.subject.trim()&&valid.length>0);const print=()=>{if(!canPrint){setMessage("Complete the client, service, subject, and at least one valid price item before generating the PDF.");return;}setMessage("");window.print();};return <><div className="saved-pdf-screen"><button onClick={print} className="border border-signal bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">GENERATE / SAVE PDF</button>{message&&<p className="mt-3 max-w-sm text-sm text-red-300">{message}</p>}</div><div className="saved-quotation-print" aria-hidden="true"><QuotationDocument quotation={quotation}/></div></>}
