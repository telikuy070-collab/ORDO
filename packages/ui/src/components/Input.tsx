import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={['rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-400/40', error && 'border-error focus:border-error focus:ring-error/40', className].filter(Boolean).join(' ')}
        {...props}
      />
      {hint && !error && <span className="text-xs text-text-muted">{hint}</span>}
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}