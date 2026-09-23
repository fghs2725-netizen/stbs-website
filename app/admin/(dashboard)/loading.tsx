/**
 * Shown the instant a link is tapped, inside the admin shell (the bars stay put), while the page is
 * fetched. The server is a long round trip from India, and without this a tap looked like nothing
 * had happened. It is prefetched along with each visible link, so it appears with no wait at all.
 */
function Bar({ w, h = 12 }: { w: string; h?: number }) {
  return <span className="block rounded-[6px] motion-safe:animate-pulse" style={{ width: w, height: h, background: 'rgba(0,0,0,.07)' }} />;
}

export default function AdminLoading() {
  return (
    <div className="a-page" role="status" aria-live="polite" aria-label="Loading">
      <div className="flex flex-col gap-3">
        <Bar w="84px" h={10} />
        <Bar w="min(260px, 70%)" h={28} />
        <Bar w="min(420px, 90%)" />
      </div>
      <div className="a-card flex flex-col gap-5 p-4 sm:p-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bar w={i % 2 ? '52%' : '64%'} h={14} />
              <Bar w={i % 2 ? '34%' : '40%'} h={10} />
            </div>
            <Bar w="56px" h={14} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
