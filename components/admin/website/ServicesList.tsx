"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReorderControls } from "./ReorderControls";
import type { SerializedService } from "@/lib/website/action-types";
import { reorderServices, publishService, updateService } from "@/lib/website/actions";
import { useState } from "react";

export function ServicesList({ services }: { services: SerializedService[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(index: number, dir: -1 | 1) {
    const other = services[index + dir];
    if (!other) return;
    const ids = services.map((s) => s.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await reorderServices(ids);
    router.refresh();
  }

  return (
    <div className="admin-card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[.08] text-xs uppercase tracking-wider text-zinc-500">
            <th className="w-24 px-5 py-3.5 font-medium">Order</th>
            <th className="px-5 py-3.5 font-medium">Service</th>
            <th className="px-5 py-3.5 font-medium">Status</th>
            <th className="px-5 py-3.5 font-medium">Visibility</th>
            <th className="px-5 py-3.5 text-right font-medium">Manage</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <tr key={s.id} className="border-b border-white/[.05] last:border-0 hover:bg-white/[.02]">
              <td className="px-5 py-3">
                <ReorderControls canUp={i > 0} canDown={i < services.length - 1} busy={busy} onUp={() => move(i, -1)} onDown={() => move(i, 1)} />
              </td>
              <td className="px-5 py-3">
                <Link href={`/admin/website/services/${s.id}`} className="font-semibold text-white hover:text-signal">{s.title}</Link>
                <p className="mt-0.5 text-xs text-zinc-500">/services/{s.slug}</p>
              </td>
              <td className="px-5 py-3 text-zinc-300">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${s.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                  {s.status.toLowerCase()}
                </span>
              </td>
              <td className="px-5 py-3 text-zinc-300">{s.visible ? <span className="text-emerald-400">Visible</span> : <span className="text-zinc-500">Hidden</span>}</td>
              <td className="px-5 py-3 text-right">
                <div className="flex justify-end gap-1.5">
                  {s.status === "PUBLISHED" ? null : (
                    <Button size="sm" variant="ghost" onClick={async () => { await publishService(s.id); router.refresh(); }}>
                      <Eye size={14} /> Publish
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={async () => { await updateService(s.id, { visible: !s.visible }); router.refresh(); }}>
                    {s.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/website/services/${s.id}`}><Pencil size={14} /> Edit</Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}