// R6.1: the product's own video (V11 video_url, YouTube or Facebook only). It is a link,
// not an embed, so no third-party player or cookies load until the customer chooses to
// watch (privacy policy: no advertising cookies).
export function ProductVideoLink({ url, name }: { url: string; name: string }) {
  const host = /facebook\.com|fb\.watch/.test(url) ? "Facebook" : "YouTube";
  return (
    <a
      className="focus-ring mb-4 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-950 p-4 text-white transition hover:bg-slate-800"
      data-testid="product-video-link"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-xl text-slate-950">▶</span>
      <span>
        <span className="block text-base font-bold">আসল পণ্যের ভিডিও দেখুন</span>
        <span className="block text-sm text-slate-300">{name} · {host}-এ খুলবে</span>
      </span>
    </a>
  );
}
