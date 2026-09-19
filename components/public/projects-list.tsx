import { MapPin } from "lucide-react";
import { scopeLines, type ProjectCase } from "@/lib/website/projects-data";

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
    <ol className="rule">
      {projects.map((p, i) => {
        const lines = scopeLines(p.scope);
        const facts: Array<[string, string]> = [];
        if (p.depth) facts.push(["Depth", p.depth]);
        if (p.output) facts.push(["Output", p.output]);
        if (p.year) facts.push(["Ordered", p.year]); // the documents give the order date, not a completion date
        return (
          <li key={`${p.title}-${i}`} id={slug(p.title)} className="rule grid gap-u3 py-u5 first:border-t-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-u6 lg:py-u7">
            <div>
              {p.sector && <p className="t-eyebrow">{p.sector}</p>}
              <h2 className="t-h3 mt-u1">{p.title}</h2>
              <p className="mt-u2 flex items-start gap-u1 text-sm text-stbs-muted">
                <MapPin size={16} strokeWidth={1.75} className="mt-[2px] shrink-0 text-stbs-brand-mid" aria-hidden />
                {p.location}
              </p>
            </div>
            <div>
              {p.summary && <p className="t-body measure">{p.summary}</p>}
              {facts.length > 0 && (
                <dl className="mt-u3 grid grid-cols-2 gap-u3 sm:grid-cols-3">
                  {facts.map(([k, v]) => (
                    <div key={k} className="flex flex-col-reverse gap-u1">
                      <dt className="t-eyebrow">{k}</dt>
                      <dd className="m-0 font-heading text-lg font-bold text-stbs-ink tabular-nums">{v}</dd>
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
