"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { Bell, BellOff, ScanFace, Smartphone, Trash2 } from "lucide-react";
import {
  passkeyRegistrationOptionsAction,
  pushPublicKeyAction,
  registerPasskeyAction,
  removePasskeyAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/admin/(dashboard)/account/app-actions";
import { base64UrlToBytes, biometricName, deviceLabel, isInstalledApp, isIOS } from "./device";

export type PasskeyRow = { id: string; deviceName: string | null; createdAt: string; lastUsedAt: string | null };

// Which saved passkey this browser made, so the page can say this device is already set up.
const THIS_DEVICE_KEY = "stbs-admin-passkey-id";
const readThisDevice = () => { try { return localStorage.getItem(THIS_DEVICE_KEY); } catch { return null; } };
const rememberThisDevice = (id: string) => { try { localStorage.setItem(THIS_DEVICE_KEY, id); } catch { /* private mode: fine */ } };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function Note({ tone, children }: { tone: "ok" | "error" | "info"; children: React.ReactNode }) {
  const style = tone === "ok"
    ? { background: "var(--a-positive-soft)", color: "var(--a-positive)" }
    : tone === "error"
      ? { background: "var(--a-danger-soft)", color: "var(--a-danger)" }
      : { background: "rgba(0,0,0,.04)", color: "var(--a-muted)" };
  return <p role={tone === "error" ? "alert" : "status"} className="mt-3 rounded-[10px] p-3 text-[0.875rem]" style={style}>{children}</p>;
}

// ─── Enquiry notifications ───────────────────────────────────────────────────

type PushState = "loading" | "unsupported" | "install-first" | "denied" | "off" | "on";

async function adminRegistration() {
  return (await navigator.serviceWorker.getRegistration("/admin")) ?? navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
}

function NotificationSettings() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(isIOS() && !isInstalledApp() ? "install-first" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/admin");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setNote(null);
    try {
      // iOS allows the permission prompt only as the direct result of a tap, so this is the first await.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const key = await pushPublicKeyAction();
      if (!key) throw new Error("Your session has ended. Sign in again.");
      const reg = await adminRegistration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const saved = await savePushSubscriptionAction({ endpoint: json.endpoint, keys: json.keys }, navigator.userAgent);
      if (!saved.ok) throw new Error(saved.error);
      setState("on");
      setNote({ tone: "ok", text: "Notifications are on for this device." });
    } catch (e) {
      setNote({ tone: "error", text: (e as Error).message || "Notifications could not be turned on." });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/admin");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    const r = await sendTestPushAction().catch(() => ({ ok: false as const, error: "The test could not be sent." }));
    setNote(r.ok ? { tone: "ok", text: "Test sent. It should arrive in a few seconds." } : { tone: "error", text: r.error });
    setBusy(false);
  }

  return (
    <section className="a-card p-4 sm:p-5" aria-labelledby="push-heading">
      <h2 id="push-heading" className="a-h2 flex items-center gap-2"><Bell size={18} aria-hidden /> Enquiry notifications</h2>
      <p className="a-sub mt-1">A notification on this device whenever someone sends a proposal request from the website.</p>

      {state === "loading" && <div className="mt-4 h-11 animate-pulse rounded-[10px]" style={{ background: "rgba(0,0,0,.05)" }} />}
      {state === "install-first" && (
        <Note tone="info">
          On iPhone, notifications work in the STBS Admin app. In Safari, tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, open STBS Admin from the new icon, and turn them on here.
        </Note>
      )}
      {state === "unsupported" && <Note tone="info">This browser can&apos;t receive notifications. On iPhone, use the STBS Admin app from your Home Screen (iOS 16.4 or later).</Note>}
      {state === "denied" && <Note tone="info">Notifications are blocked for STBS Admin. Allow them in Settings → Notifications → STBS Admin, then come back here.</Note>}
      {state === "off" && (
        <button type="button" onClick={turnOn} disabled={busy} className="a-btn a-btn-primary mt-4 w-full sm:w-auto">
          <Bell className="size-4" aria-hidden /> {busy ? "Turning on…" : "Turn on enquiry notifications"}
        </button>
      )}
      {state === "on" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={test} disabled={busy} className="a-btn a-btn-secondary">Send a test notification</button>
          <button type="button" onClick={turnOff} disabled={busy} className="a-btn a-btn-quiet"><BellOff className="size-4" aria-hidden /> Turn off on this device</button>
        </div>
      )}
      {note && <Note tone={note.tone}>{note.text}</Note>}
    </section>
  );
}

// ─── Face ID ─────────────────────────────────────────────────────────────────

function FaceIdSettings({ passkeys }: { passkeys: PasskeyRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null);
  const setUpHere = !!thisDeviceId && passkeys.some((p) => p.id === thisDeviceId);

  useEffect(() => {
    setThisDeviceId(readThisDevice());
    setLabel(biometricName());
    platformAuthenticatorIsAvailable().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  async function setUp() {
    setBusy(true);
    setNote(null);
    try {
      const start = await passkeyRegistrationOptionsAction();
      if (!start.ok) throw new Error(start.error);
      const response = await startRegistration(start.options);
      const saved = await registerPasskeyAction(response, deviceLabel());
      if (!saved.ok) throw new Error(saved.error);
      rememberThisDevice(saved.id);
      setThisDeviceId(saved.id);
      setNote({ tone: "ok", text: `${label} is set up. Next time, sign in with ${label} instead of the password.` });
      router.refresh();
    } catch (e) {
      const name = (e as Error).name;
      if (name === "NotAllowedError" || name === "AbortError") setNote(null);
      else if (name === "InvalidStateError") setNote({ tone: "error", text: `This device already has ${label} set up for STBS Admin.` });
      else setNote({ tone: "error", text: (e as Error).message || `${label} could not be set up.` });
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    if (!window.confirm("Remove this device? It will need the password to sign in again.")) return;
    startTransition(async () => {
      await removePasskeyAction(id);
      router.refresh();
    });
  }

  return (
    <section className="a-card p-4 sm:p-5" aria-labelledby="faceid-heading">
      <h2 id="faceid-heading" className="a-h2 flex items-center gap-2"><ScanFace size={18} aria-hidden /> Sign in with {label ?? "Face ID"}</h2>
      <p className="a-sub mt-1">Skip the password on your own phone. The same rules apply: changing the password still signs every device out.</p>

      {available === false && <Note tone="info">This device has no Face ID or fingerprint unlock that a website can use.</Note>}
      {available && setUpHere && !note && <Note tone="ok">This device signs in with {label}.</Note>}
      {available && !setUpHere && (
        <button type="button" onClick={setUp} disabled={busy} className="a-btn a-btn-primary mt-4 w-full sm:w-auto">
          <ScanFace className="size-4" aria-hidden /> {busy ? `Waiting for ${label}…` : `Set up ${label} on this device`}
        </button>
      )}
      {note && <Note tone={note.tone}>{note.text}</Note>}

      {passkeys.length > 0 && (
        <ul className="a-divide mt-4">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <Smartphone size={18} aria-hidden className="shrink-0" style={{ color: "var(--a-faint)" }} />
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-medium" style={{ color: "var(--a-ink)" }}>{p.deviceName || "Device"}{p.id === thisDeviceId ? " (this device)" : ""}</p>
                <p className="text-[0.75rem]" style={{ color: "var(--a-faint)" }}>Added {when(p.createdAt)}{p.lastUsedAt ? ` · last used ${when(p.lastUsedAt)}` : ""}</p>
              </div>
              <button type="button" onClick={() => remove(p.id)} disabled={pending} className="a-btn a-btn-quiet a-btn-sm" aria-label={`Remove ${p.deviceName || "device"}`}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The Account page's phone-app block. */
export function PhoneAppSettings({ passkeys }: { passkeys: PasskeyRow[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <NotificationSettings />
      <FaceIdSettings passkeys={passkeys} />
    </div>
  );
}
