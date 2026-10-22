import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { businessInfo } from "@/lib/company";
import * as gbp from "@/lib/google-business/api";
import { HELP_LINKS } from "@/lib/google-business/config";
import { getGbpState } from "@/lib/google-business/connection";
import { GbpError, errorMessage } from "@/lib/google-business/errors";
import { fieldText, formatAddress, infoFromLocation, splitMask } from "@/lib/google-business/model";
import { GbpErrorCard, GbpFrame, Notice } from "@/components/admin/google-business/GbpFrame";
import { GbpSetup } from "@/components/admin/google-business/GbpSetup";
import { GoogleUpdateReview, InfoForm } from "@/components/admin/google-business/InfoForm";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <p className="a-label">{label}</p>
      <div className="mt-1 text-[0.9375rem]" style={{ color: "var(--a-body)" }}>{children}</div>
    </div>
  );
}

export default async function GoogleInfoPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const state = await getGbpState();
  if (state.kind !== "ready") return <GbpSetup state={state} />;

  let loc;
  try {
    loc = await gbp.getLocation(state.locationName);
  } catch (e) {
    if (!(e instanceof GbpError)) console.error("[google-business] info failed:", e);
    return (
      <GbpFrame tab="info" title={state.locationTitle}>
        <GbpErrorCard message={errorMessage(e)} activationUrl={e instanceof GbpError ? e.extra.activationUrl : undefined} retryHref="/admin/google-business/info" />
      </GbpFrame>
    );
  }

  // Only asked when Google says it changed something, to keep the page to one call normally.
  let googleDiff: { fields: Array<{ path: string; label: string; google: string; yours: string }>; other: string[] } | null = null;
  if (loc.metadata?.hasGoogleUpdated) {
    try {
      const updated = await gbp.getGoogleUpdated(state.locationName);
      const { managed, other } = splitMask(updated.diffMask);
      if (updated.location && (managed.length || other.length)) {
        googleDiff = { fields: managed.map((f) => ({ ...f, google: fieldText(updated.location!, f.path), yours: fieldText(loc!, f.path) })), other };
      }
    } catch (e) {
      console.warn("[google-business] getGoogleUpdated failed:", e instanceof Error ? e.message : e);
    }
  }

  const address = formatAddress(loc);
  const places = loc.serviceArea?.places?.placeInfos?.map((p) => p.placeName).filter(Boolean) ?? [];
  const categories = [loc.categories?.primaryCategory?.displayName, ...(loc.categories?.additionalCategories?.map((c) => c.displayName) ?? [])].filter(Boolean);

  return (
    <GbpFrame tab="info" title={loc.title ?? state.locationTitle} mapsUri={loc.metadata?.mapsUri}>
      {googleDiff && <GoogleUpdateReview fields={googleDiff.fields} other={googleDiff.other} />}
      {loc.metadata?.hasPendingEdits && <Notice tone="brand">Some of your edits are still waiting for Google&apos;s review, so the live listing may show the old details for now.</Notice>}

      <InfoForm initial={infoFromLocation(loc)} websiteHours={businessInfo.hours.join(", ")} />

      <section className="a-card p-4 sm:p-5" aria-labelledby="fixed-info-heading">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id="fixed-info-heading" className="a-h2">Changed in Google itself</h2>
          <a href={HELP_LINKS.businessProfile} target="_blank" rel="noopener noreferrer" className="a-link inline-flex items-center gap-1 text-[0.875rem]">Open Business Profile <ExternalLink className="size-3.5" aria-hidden /></a>
        </div>
        <p className="a-sub mt-1">Google may ask you to verify the business again when these change, so they are edited on Google directly.</p>
        <div className="a-divide mt-4">
          <Row label="Categories">{categories.length ? categories.join(", ") : "Not set"}</Row>
          <Row label="Address">{address || "Hidden (service-area business)"}</Row>
          <Row label="Service areas">{places.length ? places.join(", ") : "Not set"}</Row>
          {loc.openInfo?.status && loc.openInfo.status !== "OPEN" && <Row label="Status">{loc.openInfo.status.toLowerCase().replace(/_/g, " ")}</Row>}
        </div>
      </section>
    </GbpFrame>
  );
}
