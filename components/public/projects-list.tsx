import Image from "next/image";
import { MapPin } from "lucide-react";
import { projectPhoto, scopeLines, type ProjectCase } from "@/lib/website/projects-data";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/**
 * /projects index: a spec-sheet list rather than cards. Each project shows what was
 * delivered (summary), the facts the client documents state (depth / output / year, only
 * when present) and the ordered scope, one item per line. Nothing is shown for a field
 * that has no verified value.
 */
export function ProjectsList({ projects }: { projects: ReadonlyArray<ProjectCase> }) {
  return (
    <ol className="grid gap-u8">
      {projects.map((p, i) => {
        const lines = scopeLines(p.scope);
        const facts: Array<[string, string]> = [];
        if (p.depth) facts.push(["Depth", p.depth]);
        if (p.output) facts.push(["Output", p.output]);
        if (p.year) facts.push(["Ordered", p.year]); // the documents give the order date, not a completion date
        return (
          <li key={`${p.title}-${i}`} id={slug(p.title)} className="grid items-center gap-u4 lg:grid-cols-2 lg:gap-u8">
            <div className={`relative aspect-[4/3] overflow-hidden rounded-[18px] ${i % 2 ? "lg:order-2" : ""}`}>
              <Image src={projectPhoto(i).src} alt={projectPhoto(i).alt} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
              <span className="absolute bottom-u2 left-u2 rounded-full bg-stbs-ink/70 px-3 py-1 text-[.75rem] text-white/85 backdrop-blur">Illustrative site photo</span>
            </div>
            <div>
              {p.sector && <p className="t-eyebrow">{p.sector}</p>}
              <h2 className="t-h2 mt-u1 !text-[clamp(1.75rem,3vw,2.5rem)]">{p.title}</h2>
              <p className="mt-u2 flex items-start gap-u1 text-sm text-stbs-muted">
                <MapPin size={16} strokeWidth={1.75} className="mt-[2px] shrink-0 text-stbs-brand-mid" aria-hidden />
                {p.location}
              </p>
              {p.summary && <p className="t-body measure mt-u3">{p.summary}</p>}
              {facts.length > 0 && (
                <dl className="mt-u3 grid grid-cols-2 gap-u3 sm:grid-cols-3">
                  {facts.map(([k, v]) => (
                    <div key={k} className="flex flex-col-reverse gap-u1">
                      <dt className="t-eyebrow">{k}</dt>
                      <dd className="m-0 font-brand text-lg font-bold text-stbs-ink tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {lines.length > 0 && (
                <div className="mt-u3">
                  <p className="t-eyebrow">Scope</p>
                  <ul className="measure mt-u1 list-disc space-y-u1 pl-u3 marker:text-stbs-muted">
                    {lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
