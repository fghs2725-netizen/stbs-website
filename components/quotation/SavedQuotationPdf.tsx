"use client";
import { useState } from "react";
import { QuotationPrintDocument } from "./QuotationPrintDocument";
import { openQuotationPdf, pdfFailureMessage } from "./requestQuotationPdf";
import { isQuotationPdfReady, type QuotationState } from "./quotation-model";
import "./quotation.css";
import "./quotation-refinement.css";
export function SavedQuotationPdf({quotation}:{quotation:QuotationState}){const [message,setMessage]=useState("");const canPrint=isQuotationPdfReady(quotation);const print=async()=>{if(!canPrint){setMessage("Complete the client, service, subject, and at least one valid price item before generating the PDF.");return;}setMessage("Generating PDF...");try{await openQuotationPdf(quotation);setMessage("PDF ready. Use Share to save it to Files.")}catch(error){setMessage(pdfFailureMessage(error))}};return <><div className="saved-pdf-screen"><button onClick={print} disabled={message==="Generating PDF..."} className="border border-signal bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">{message==="Generating PDF..."?"GENERATING...":"SAVE TO PDF"}</button>{message&&<p className="mt-3 max-w-sm text-red-300">{message}</p>}</div><QuotationPrintDocument quotation={quotation}/></>}
