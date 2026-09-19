"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Mail, MessageCircle, Phone } from "lucide-react";
import { company } from "@/lib/company";
import { formatIndianPhone, telHref } from "@/lib/phone";
import { SERVICE_CHOICES, fieldErrors, quoteSchema, quoteWhatsAppUrl, type QuoteFieldErrors, type QuoteRequest } from "@/lib/quote-request";

type Status = "idle" | "sending" | "sent" | "failed";

function readForm(form: HTMLFormElement): Record<string, string> {
  const fd = new FormData(form);
  return Object.fromEntries(Array.from(fd.entries()).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

/**
 * Proposal request form. Validates inline with the same schema the server uses, really sends
 * (POST /api/quote), and never claims success unless the server said so. If online sending is
 * unavailable it says so and offers Call / WhatsApp / Email with the visitor's details ready.
 */
export function QuoteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<QuoteFieldErrors>({});
  const [serverMessage, setServerMessage] = useState("");
  const [draft, setDraft] = useState<Partial<QuoteRequest>>({});

  // Move focus to the confirmation once it has actually rendered (a timeout fires before React mounts it).
  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const clearError = (name: keyof QuoteRequest) => errors[name] && setErrors((e) => ({ ...e, [name]: undefined }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const values = readForm(e.currentTarget);
    setDraft(values as Partial<QuoteRequest>);
    const parsed = quoteSchema.safeParse(values);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error.issues);
      setErrors(errs);
      setStatus("idle");
      const first = (Object.keys(errs) as Array<keyof QuoteRequest>)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: QuoteFieldErrors };
      if (res.ok && body.ok) {
        setStatus("sent");
        return;
      }
      if (res.status === 422 && body.fields) {
        setErrors(body.fields);
        setStatus("idle");
        return;
      }
      setServerMessage(body.error || "We could not send your request online.");
      setStatus("failed");
    } catch {
      setServerMessage("We could not reach the server.");
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="tile p-u4">
        <Check size={32} strokeWidth={1.75} className="text-stbs-verified" aria-hidden />
        <h2 ref={successRef} tabIndex={-1} className="t-h3 mt-u2 outline-none">Request sent</h2>
        <p className="t-body measure mt-u1">Thank you. We will review your site and scope and get back to you on the number you gave.</p>
        <button type="button" className="btn btn-secondary mt-u3" onClick={() => { setStatus("idle"); formRef.current?.reset(); setDraft({}); }}>Send another request</button>
      </div>
    );
  }

  const count = Object.values(errors).filter(Boolean).length;
  const err = (n: keyof QuoteRequest) => ({ "aria-invalid": errors[n] ? true : undefined, "aria-describedby": errors[n] ? `qf-${n}-err` : undefined });
  const Err = ({ n }: { n: keyof QuoteRequest }) => (errors[n] ? <p id={`qf-${n}-err`} className="error-text">{errors[n]}</p> : null);

  return (
    <div>
      {status === "failed" && (
        <div role="alert" className="tile mb-u4 p-u3" style={{ borderColor: "var(--danger)" }}>
          <p className="font-medium text-stbs-ink">{serverMessage} Your details have not been lost: use one of these instead.</p>
          <div className="mt-u2 flex flex-col gap-u1 sm:flex-row sm:flex-wrap">
            <a className="btn btn-secondary" href={telHref(company.phones[0])}><Phone size={18} strokeWidth={1.75} aria-hidden />Call {formatIndianPhone(company.phones[0])}</a>
            <a className="btn btn-secondary" href={quoteWhatsAppUrl(draft)} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} strokeWidth={1.75} aria-hidden />WhatsApp with these details</a>
            <a className="btn btn-secondary" href={`mailto:${company.email}?subject=${encodeURIComponent("Proposal request")}`}><Mail size={18} strokeWidth={1.75} aria-hidden />Email us</a>
          </div>
        </div>
      )}
      {count > 0 && (
        <p role="alert" className="error-text mb-u3 font-medium">Please fix {count} {count === 1 ? "field" : "fields"} below.</p>
      )}
      <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-u3 sm:grid-cols-2">
        <div>
          <label className="label-public" htmlFor="qf-name">Full name <span aria-hidden>*</span></label>
          <input id="qf-name" name="name" required autoComplete="name" className="field-public" onChange={() => clearError("name")} {...err("name")} />
          <Err n="name" />
        </div>
        <div>
          <label className="label-public" htmlFor="qf-organisation">Organisation</label>
          <input id="qf-organisation" name="organisation" autoComplete="organization" className="field-public" {...err("organisation")} />
          <Err n="organisation" />
        </div>
        <div>
          <label className="label-public" htmlFor="qf-phone">Phone number <span aria-hidden>*</span></label>
          <input id="qf-phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" className="field-public tabular-nums" onChange={() => clearError("phone")} {...err("phone")} />
          <Err n="phone" />
        </div>
        <div>
          <label className="label-public" htmlFor="qf-email">Email</label>
          <input id="qf-email" name="email" type="email" autoComplete="email" className="field-public" onChange={() => clearError("email")} {...err("email")} />
          <Err n="email" />
        </div>
        <div>
          <label className="label-public" htmlFor="qf-service">Service <span aria-hidden>*</span></label>
          <select id="qf-service" name="service" required defaultValue="" className="field-public" onChange={() => clearError("service")} {...err("service")}>
            <option value="" disabled>Select a service</option>
            {SERVICE_CHOICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Err n="service" />
        </div>
        <div>
          <label className="label-public" htmlFor="qf-location">Site location <span aria-hidden>*</span></label>
          <input id="qf-location" name="location" required autoComplete="off" className="field-public" onChange={() => clearError("location")} {...err("location")} />
          <Err n="location" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-public" htmlFor="qf-details">Project details</label>
          <textarea id="qf-details" name="details" rows={5} className="field-public" placeholder="Site, scope, known depth or capacity, preferred timeline" onChange={() => clearError("details")} {...err("details")} />
          <Err n="details" />
        </div>
        {/* Honeypot: hidden from people and assistive tech; bots that fill it are dropped server-side. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="qf-website">Leave this field empty</label>
          <input id="qf-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={status === "sending"} aria-busy={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send request"}
          </button>
          <p className="mt-u2 text-sm text-stbs-muted">Fields marked * are required. We use these details only to respond to your request.</p>
        </div>
      </form>
    </div>
  );
}
