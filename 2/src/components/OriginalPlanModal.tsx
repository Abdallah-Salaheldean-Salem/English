import React, { useState, useEffect } from 'react';
import { BookOpen, Search, X, Copy, Check, ExternalLink } from 'lucide-react';

interface OriginalPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OriginalPlanModal: React.FC<OriginalPlanModalProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !content) {
      setLoading(true);
      fetch('/api/plan')
        .then((res) => res.json())
        .then((data) => {
          if (data.content) {
            setContent(data.content);
          }
        })
        .catch(() => {
          // If api fails, content will fall back to local display
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-prose text-lg font-bold text-stone-900">
                English Writing Recovery Plan
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>Nov 2, 2026</span>
                <span>·</span>
                <span>@King</span>
                <span>·</span>
                <span>Six-Month Deliberate Blueprint</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Raw'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer with clean typography */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#faf9f6]">
          {loading ? (
            <div className="py-12 text-center text-xs text-stone-500 font-mono-code">
              Loading recovery plan document...
            </div>
          ) : (
            <article className="prose prose-stone max-w-none text-stone-800 font-serif-prose text-base leading-relaxed space-y-4">
              <pre className="whitespace-pre-wrap font-serif-prose text-stone-900 text-sm leading-relaxed bg-white p-6 rounded-xl border border-stone-200 shadow-xs select-text">
                {content || `Loading document from public/assets/aistudio/English_Writing_Recovery_Plan_f683dcef.md...`}
              </pre>
            </article>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Source asset: English_Writing_Recovery_Plan_f683dcef.md</span>
          <button
            onClick={onClose}
            className="bg-stone-900 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-stone-800 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
