'use client';

interface Props {
  hasApiKey: boolean;
  onSettingsClick: () => void;
  cachedCount: number;
}

export default function Header({ hasApiKey, onSettingsClick, cachedCount }: Props) {
  return (
    <header className="relative overflow-hidden border-b border-surface-300/50">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-surface-0 to-surface-0" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Phone<span className="text-brand-400">Crawl</span>
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                So sánh giá từ 13 cửa hàng
                {cachedCount > 0 && <span className="text-zinc-400"> · {cachedCount} SP đã lưu</span>}
              </p>
            </div>
          </div>

          <button onClick={onSettingsClick}
            className={`relative p-2.5 rounded-xl border transition-all duration-200 ${hasApiKey
              ? 'bg-surface-200 border-surface-400 text-zinc-400 hover:text-zinc-200 hover:border-surface-300'
              : 'bg-brand-500/10 border-brand-500/30 text-brand-400 hover:bg-brand-500/20 animate-pulse'
            }`}
            title="Cài đặt API Key"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!hasApiKey && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-500 rounded-full" />}
          </button>
        </div>
      </div>
    </header>
  );
}
