'use client';
import { useState } from 'react';

interface Props { apiKey: string; onChange: (k: string) => void; }

export default function ApiKeyInput({ apiKey, onChange }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-surface-100 border border-surface-300 rounded-2xl p-5">
      <label className="block text-sm font-semibold text-zinc-300 mb-2">FireCrawl API Key</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={apiKey} onChange={e => onChange(e.target.value)}
          placeholder="fc-xxxxxxxxxxxxxxxx"
          className="w-full bg-surface-200 border border-surface-400 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 font-mono focus:border-brand-500 transition-colors" />
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1">
          {show ? '🙈' : '👁'}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-600">
        Lấy key tại{' '}
        <a href="https://www.firecrawl.dev/app/api-keys" target="_blank" rel="noopener noreferrer"
          className="text-brand-400 hover:text-brand-300 underline underline-offset-2">firecrawl.dev</a>
        {' '}· Chi phí: ~1 credit/trang · Pagination max 5 trang/shop
      </p>
    </div>
  );
}
