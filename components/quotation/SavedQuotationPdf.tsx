"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { QuotationPrintDocument } from "./QuotationPrintDocument";
import { openQuotationPdf, pdfActionMessage, pdfFailureMessage, isPdfSuccessMessage } from "./requestQuotationPdf";
import { isQuotationPdfReady, type QuotationState } from "./quotation-model";
import { downloadQuotationDocx } from "./requestQuotationDocx";
import "./quotation.css";
import "./quotation-refinement.css";
export function SavedQuotationPdf({quotation}:{quotation:QuotationState}){
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const saveInFlight=useRef(false);
  const [wordBusy,setWordBusy]=useState(false);
  const canSave=isQuotationPdfReady(quotation);
  const saveWord=async()=>{
    if(wordBusy||!canSave)return;
    setWordBusy(true); setMessage("");
    try { setMessage(`Word document downloaded: ${await downloadQuotationDocx(quotation)}`); }
    catch(error) { setMessage(error instanceof Error ? error.message : "Word export failed. Please try again."); }
    finally { setWordBusy(false); }
  };
  const savePdf=async()=>{
    if (saveInFlight.current) return;
    if(!canSave){setMessage("Complete the client, service, subject, and at least one valid price item before generating the PDF.");return;}
    saveInFlight.current=true; setSaving(true); setMessage("");
    try { setMessage(pdfActionMessage(await openQuotationPdf(quotation))); }
    catch(error) { setMessage(pdfFailureMessage(error)); }
    finally { saveInFlight.current=false; setSaving(false); }
  };
  return <>
    <div className="saved-pdf-screen mx-auto max-w-5xl">
      <div className="flex min-h-[56px] items-center gap-2 border-y border-white/15 py-2">
        <Link href="/admin/quotations" aria-label="Back to quotations" className="inline-flex min-h-[40px] shrink-0 items-center px-2 text-sm text-white/80 hover:text-white">← <span className="ml-1 hidden sm:inline">Back</span></Link>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold text-signal" title={quotation.quotationReference}>{quotation.quotationReference}</p>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={savePdf} disabled={saving || !canSave} title={canSave ? "Generate and download the current quotation PDF" : "Complete the quotation before generating a PDF"} className="inline-flex min-h-[40px] items-center bg-signal px-3 text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-55">
            {saving ? "Saving…" : "Save PDF"}
          </button>
          <button onClick={saveWord} disabled={wordBusy || !canSave} title={canSave ? "Download an editable Word version" : "Complete the quotation before exporting"} className="inline-flex min-h-[40px] items-center border border-white/25 px-3 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-55">{wordBusy ? "Preparing…" : "Word"}</button>
          <button onClick={()=>window.print()} className="inline-flex min-h-[40px] items-center border border-white/25 px-3 text-xs font-bold uppercase tracking-wider text-white">Print</button>
        </div>
      </div>
      {message&&<p role="status" className={`mt-3 max-w-lg text-sm ${isPdfSuccessMessage(message) || message.startsWith("Word document downloaded") ? "text-emerald-300" : "text-red-300"}`}>{message}</p>}
    </div>
    <QuotationPrintDocument quotation={quotation}/>
  </>
}
