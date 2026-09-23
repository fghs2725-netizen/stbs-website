import type { Metadata } from "next";
import { ProjectsList } from "@/components/public/projects-list";
import { pageMetadata } from "@/lib/page-metadata";
import { SEO } from "@/lib/website/seo-copy";
import { resolveProjects } from "@/lib/website/projects-data";
import { getPublishedPage } from "@/lib/website/queries";

export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({ ...SEO.projects, path: "/projects", absoluteTitle: true });

/**
 * The project list is edited once, in the homepage's Featured Projects section
 * (Website -> Home). This page reads the same published rows, so the two never disagree.
 * Falls back to the built-in defaults when nothing is published.
 */
export default async function ProjectsPage() {
  const home = await getPublishedPage("home");
  const section = home?.sections.find((s) => s.type === "case_studies");
  const projects = resolveProjects((section?.content as Record<string, unknown> | undefined)?.projects);

  return (
    <div className="theme-public">
      <section className="section-y">
        <div className="container-x">
          <p className="t-eyebrow">Projects</p>
          <h1 className="t-h2 mt-u2 text-block">Selected projects</h1>
          <p className="t-body measure mt-u3">
            Rainwater harvesting and groundwater recharge work for industrial, institutional and commercial sites in Sonipat and Kundli, Haryana.
          </p>
          <div className="mt-u6 lg:mt-u8">
            <ProjectsList projects={projects} />
          </div>
          <p className="mt-u4 text-sm text-stbs-muted measure">Scope is shown as ordered by the client; figures come from the work order or purchase order.</p>
        </div>
      </section>
    </div>
  );
}
