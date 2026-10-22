import { headers } from "next/headers";
import { CheckCircle2, ExternalLink, Link2, MapPin, Store } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { CALLBACK_NOTICES, CALLBACK_PATH, HELP_LINKS } from "@/lib/google-business/config";
import type { GbpState } from "@/lib/google-business/connection";
import { chooseLocationAction, disconnectAction } from "@/app/admin/(dashboard)/google-business/actions";
import { Notice } from "./GbpFrame";

async function callbackUri(): Promise<string> {
  const configured = process.env.GOOGLE_BUSINESS_REDIRECT_URI?.trim();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.stbs.in";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${CALLBACK_PATH}`;
}

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="a-link inline-flex items-center gap-1">
    {children} <ExternalLink className="size-3.5" aria-hidden />
  </a>
);

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="a-num mt-[1px] inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-semibold" style={{ background: "var(--a-brand-soft)", color: "var(--a-brand)" }}>{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{title}</p>
        <div className="mt-1 space-y-1 text-[0.875rem]" style={{ color: "var(--a-body)" }}>{children}</div>
      </div>
    </li>
  );
}

/** The one-time Google Cloud setup, written for the owner rather than a developer. */
async function SetupSteps({ missing }: { missing?: string[] }) {
  const uri = await callbackUri();
  return (
    <section className="a-card p-4 sm:p-5" aria-labelledby="gbp-setup-heading">
      <h2 id="gbp-setup-heading" className="a-h2">One-time setup with Google</h2>
      <p className="a-sub mt-1">Google only lets approved projects manage listings through its API. This takes about 20 minutes of clicks, then a wait of up to 14 days for Google&apos;s approval.</p>
      <ol className="mt-4 space-y-4">
        <Step n={1} title="Create a Google Cloud project">
          <p>Sign in at <Ext href="https://console.cloud.google.com/projectcreate">console.cloud.google.com</Ext> with the Google account that owns the listing and create a project named “STBS website”.</p>
        </Step>
        <Step n={2} title="Apply for Business Profile API access">
          <p>Fill in <Ext href={HELP_LINKS.accessForm}>Google&apos;s API access form</Ext>, choosing “Application for Basic API Access”. Give the project number from step 1, the website https://www.stbs.in and say it is to manage your own listing.</p>
          <p style={{ color: "var(--a-faint)" }}>Google reviews it within 14 days and emails you. Everything below can be done while you wait.</p>
        </Step>
        <Step n={3} title="Switch on the four APIs">
          <ul className="space-y-1">
            {Object.entries(HELP_LINKS.enable).map(([name, href]) => <li key={name}><Ext href={href}>{name}</Ext></li>)}
          </ul>
          <p style={{ color: "var(--a-faint)" }}>Some only appear in the library after Google approves step 2.</p>
        </Step>
        <Step n={4} title="Set up the sign-in screen">
          <p>In <Ext href={HELP_LINKS.consentScreen}>Google Auth Platform</Ext>, choose External, add your email as a test user, then press <strong>Publish app</strong> so the sign-in does not expire every 7 days. Google will warn the app is unverified; that is expected for your own use.</p>
        </Step>
        <Step n={5} title="Create the sign-in keys">
          <p>In <Ext href={HELP_LINKS.credentials}>Credentials</Ext>, create an <strong>OAuth client ID</strong> of type “Web application” with this authorised redirect URI:</p>
          <code className="block break-all rounded-[10px] p-2 text-[0.8125rem]" style={{ background: "rgba(0,0,0,.05)", color: "var(--a-ink)" }}>{uri}</code>
        </Step>
        <Step n={6} title="Add the keys to Vercel and redeploy">
          <p>In the Vercel project&apos;s Environment Variables add <code>GOOGLE_BUSINESS_CLIENT_ID</code> and <code>GOOGLE_BUSINESS_CLIENT_SECRET</code> from step 5, then redeploy.</p>
          {missing?.length ? <p style={{ color: "var(--a-warn)" }}>Not set yet: {missing.join(", ")}</p> : null}
        </Step>
      </ol>
    </section>
  );
}

function ConnectButton({ label = "Connect Google account" }: { label?: string }) {
  // A plain link: the route redirects to Google, which a client-side navigation cannot follow.
  return (
    <a href="/api/google-business/connect" className="a-btn a-btn-primary">
      <Link2 className="size-4" aria-hidden /> {label}
    </a>
  );
}

function DisconnectButton() {
  return (
    <form action={disconnectAction}>
      <button type="submit" className="a-btn a-btn-danger a-btn-sm">Disconnect</button>
    </form>
  );
}

/** Shown on every Google Business page until a listing is connected and chosen. */
export async function GbpSetup({ state, notice }: { state: Exclude<GbpState, { kind: "ready" }>; notice?: { error?: string; connected?: string } }) {
  const noticeText = notice?.error ? CALLBACK_NOTICES[notice.error] ?? "Connecting to Google did not work. Try again." : null;
  return (
    <div className="a-page">
      <PageHeader eyebrow="Online" title="Google Business" description="Manage your Google Search and Maps listing — reviews, posts, hours, photos and how people find you — without leaving the admin." />
      {noticeText && <Notice tone="danger">{noticeText}</Notice>}

      {state.kind === "not-configured" && <SetupSteps missing={state.missing} />}

      {state.kind === "no-table" && (
        <section className="a-card p-4 sm:p-5">
          <h2 className="a-h2">Database update needed</h2>
          <p className="a-sub mt-1">Apply the new migration to the production database, as for every schema change, then reload this page:</p>
          <code className="mt-3 block rounded-[10px] p-2 text-[0.8125rem]" style={{ background: "rgba(0,0,0,.05)", color: "var(--a-ink)" }}>npx prisma migrate deploy</code>
        </section>
      )}

      {state.kind === "not-connected" && (
        <>
          <section className="a-card flex flex-col items-start gap-3 p-4 sm:p-5">
            <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-[14px]" style={{ background: "var(--a-brand-soft)", color: "var(--a-brand)" }}><Store size={22} strokeWidth={1.75} /></span>
            <div>
              <h2 className="a-h2">Connect your listing</h2>
              <p className="a-sub mt-1">Sign in with the Google account that owns or manages your business listing. Only admins of this site can use the connection, and you can disconnect at any time.</p>
            </div>
            <ConnectButton />
          </section>
          <details className="a-card p-4 sm:p-5">
            <summary className="cursor-pointer text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>Setup steps (if connecting fails)</summary>
            <div className="mt-4"><SetupSteps /></div>
          </details>
        </>
      )}

      {state.kind === "error" && (
        <>
          <section className="a-card space-y-3 p-4 sm:p-5" role="alert">
            <h2 className="a-h2">{state.error.kind === "not-approved" ? "Waiting for Google's approval" : "Google needs attention"}</h2>
            {state.email && <p className="text-[0.875rem]" style={{ color: "var(--a-muted)" }}>Connected as {state.email}</p>}
            <p className="text-[0.9375rem]" style={{ color: state.error.kind === "not-approved" ? "var(--a-body)" : "var(--a-danger)" }}>{state.error.message}</p>
            {state.error.kind === "not-approved" && (
              <p className="text-[0.875rem]" style={{ color: "var(--a-body)" }}>
                Not applied yet? Use <Ext href={HELP_LINKS.accessForm}>Google&apos;s API access form</Ext>. Once Google emails its approval, reload this page.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {state.error.activationUrl && <a href={state.error.activationUrl} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-primary a-btn-sm">Enable the API <ExternalLink className="size-4" aria-hidden /></a>}
              <a href="/admin/google-business" className="a-btn a-btn-secondary a-btn-sm">Check again</a>
              {(state.error.kind === "reauth" || state.error.kind === "permission") && <a href="/api/google-business/connect" className="a-btn a-btn-secondary a-btn-sm">Connect again</a>}
              <DisconnectButton />
            </div>
          </section>
          {state.error.kind !== "reauth" && (
            <details className="a-card p-4 sm:p-5">
              <summary className="cursor-pointer text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>Setup steps</summary>
              <div className="mt-4"><SetupSteps /></div>
            </details>
          )}
        </>
      )}

      {state.kind === "pick-location" && (
        <form action={chooseLocationAction} className="a-card p-4 sm:p-5">
          <h2 className="a-h2">Which listing should this admin manage?</h2>
          {state.email && <p className="a-sub mt-1">{state.email} manages {state.choices.length} listings.</p>}
          <ul className="mt-4 space-y-2">
            {state.choices.map((c, i) => (
              <li key={c.locationName}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[12px] p-3" style={{ border: "1px solid var(--a-hairline-strong)" }}>
                  <input type="radio" name="location" value={`${c.accountName}|${c.locationName}`} defaultChecked={i === 0} className="mt-1" />
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{c.title}</span>
                    {c.address && <span className="mt-[2px] flex items-start gap-1 text-[0.8125rem]" style={{ color: "var(--a-faint)" }}><MapPin className="mt-[2px] size-3.5 shrink-0" aria-hidden />{c.address}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" className="a-btn a-btn-primary mt-4"><CheckCircle2 className="size-4" aria-hidden /> Use this listing</button>
        </form>
      )}
    </div>
  );
}
