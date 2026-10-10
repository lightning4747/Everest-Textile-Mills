import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DetailField {
  label: string;
  value: ReactNode;
  mono?: boolean;
  accent?: string;
  span?: boolean; // span full row
}

interface DetailSection {
  title?: string;
  fields: DetailField[];
}

interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  sections: DetailSection[];
  footer?: ReactNode;
}

export default function DetailModal({ open, onClose, title, subtitle, badge, sections, footer }: DetailModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display text-base font-semibold text-[var(--text)] leading-tight truncate">{title}</h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--text-soft)] mt-0.5 font-mono">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-soft)] hover:text-[var(--text)] transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-soft)] mb-3">
                  {section.title}
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                {section.fields.map((field, fi) => (
                  <div key={fi} className={field.span ? 'col-span-2' : ''}>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-[var(--text-soft)] font-semibold mb-0.5">
                      {field.label}
                    </p>
                    <p className={`text-sm leading-snug break-words ${field.mono ? 'font-mono' : 'font-medium'} ${field.accent ?? 'text-[var(--text)]'}`}>
                      {field.value ?? <span className="text-[var(--text-soft)]">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0 bg-[var(--surface-2)]/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
