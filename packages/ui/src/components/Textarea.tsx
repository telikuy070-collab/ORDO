import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={['min-h-24 resize-y rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-400/40', error && 'border-error focus:border-error focus:ring-error/40', className].filter(Boolean).join(' ')}
        {...props}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}