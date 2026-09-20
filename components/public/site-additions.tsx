import Image from "next/image";
import { BadgeCheck, Drill, MapPinned, Plus, ScanSearch, Settings2, ShieldCheck } from "lucide-react";
import { processSteps } from "@/lib/company";
import { ProcessStory } from "@/components/public/process-story";

export function Faq({ items }: { items: Array<[string, string]> }) {
  return (
    <section className="theme-public band-alt section-y">
      <div className="container-x">
        <p className="t-eyebrow">Questions, clearly answered</p>
        <h2 className="t-h2 mt-u2 text-block">Frequently asked questions</h2>
        <div className="mt-u6 max-w-[900px]">
          {items.map(([q, a]) => (
            <details key={q} className="group border-b border-stbs-hairline">
              <summary className="flex min-h-[72px] cursor-pointer list-none items-center justify-between gap-u3 py-u3 text-[1.25rem] font-medium leading-snug tracking-[-0.015em] text-stbs-ink transition-colors duration-300 hover:text-stbs-brand-mid [&::-webkit-details-marker]:hidden">
                {q}
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stbs-brand-mid/10 text-stbs-brand-mid transition-transform duration-300 ease-[cubic-bezier(0.28,0.11,0.32,1)] group-open:rotate-45">
                  <Plus size={18} strokeWidth={2} aria-hidden />
                </span>
              </summary>
              <p className="t-body measure pb-u4 text-stbs-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Five-step process, as a spec-sheet list (number | step | what happens). */
export function ProcessSteps() {
  return <ProcessStory eyebrow="Our process" heading="From surface conditions to working water infrastructure" steps={processSteps} />;
}

export function TrustMark() { return <ShieldCheck className="text-signal" aria-hidden="true" />; }
