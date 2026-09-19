import React, { ReactNode } from 'react';
import { FieldError } from './FieldError';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-error">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="text-xs text-text-muted">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}