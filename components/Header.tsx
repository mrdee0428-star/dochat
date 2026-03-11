'use client';

export default function Header() {
  return (
    <header className="relative overflow-hidden border-b border-surface-300/50">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-surface-0 to-surface-0" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Phone<span className="text-brand-400">Crawl</span>
              <span className="ml-2 text-xs font-normal text-zinc-500 align-middle">v4</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              So sánh giá điện thoại cũ từ <span className="text-zinc-300 font-medium">13 cửa hàng</span> uy tín
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            Markdown-first extraction
          </span>
          <span className="text-zinc-700">·</span>
          <span>Pagination (max 5 trang)</span>
          <span className="text-zinc-700">·</span>
          <span>Auto retry + backoff</span>
        </div>
      </div>
    </header>
  );
}
