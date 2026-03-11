'use client';
import { useState, useEffect } from 'react';

interface Props {
  apiKey: string;
  onChange: (k: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ apiKey, onChange, isOpen, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [local, setLocal] = useState(apiKey);

  useEffect(() => { setLocal(apiKey); }, [apiKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-surface-100 border border-surface-300 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-200">Cài đặt</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <label className="block text-sm font-medium text-zinc-400 mb-2">FireCrawl API Key</label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={local} onChange={e => setLocal(e.target.value)}
            placeholder="fc-xxxxxxxxxxxxxxxx"
            className="w-full bg-surface-200 border border-surface-400 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 font-mono focus:border-brand-500 transition-colors pr-12" />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {show
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
              }
            </svg>
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Lấy key tại <a href="https://www.firecrawl.dev/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">firecrawl.dev</a>
        </p>

        <button onClick={() => { onChange(local); onClose(); }}
          className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white hover:bg-brand-400 transition-colors">
          Lưu
        </button>
      </div>
    </div>
  );
}
