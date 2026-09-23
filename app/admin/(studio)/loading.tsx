/** The quotation editor's instant placeholder: its dark top bar and a blank A4 sheet, while it loads. */
function Bar({ w, h = 12 }: { w: string; h?: number }) {
  return <span className="block rounded-[6px] motion-safe:animate-pulse" style={{ width: w, height: h, background: 'rgba(255,255,255,.09)' }} />;
}

export default function StudioLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading the editor">
      <div
        className="flex items-center justify-between gap-3 px-4 pb-[10px] pt-[calc(10px+env(safe-area-inset-top))]"
        style={{ background: 'rgba(20,20,22,.96)', borderBottom: '1px solid rgba(255,255,255,.08)' }}
      >
        <div className="flex items-center gap-3"><Bar w="72px" h={14} /><Bar w="120px" h={14} /></div>
        <div className="flex items-center gap-2"><Bar w="64px" h={32} /><Bar w="64px" h={32} /></div>
      </div>
      <div className="mx-auto mt-6 w-[min(794px,calc(100%-24px))] rounded-[4px] p-6 motion-safe:animate-pulse" style={{ aspectRatio: '210 / 297', background: 'rgba(255,255,255,.05)' }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
