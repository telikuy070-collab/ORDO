import React, { ReactNode } from 'react';

export interface TabOption {
  value: string;
  label: string;
  badge?: React.ReactElement | string;
}

export interface TabsProps {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}

export function Tabs({ options, value, onChange, children }: TabsProps) {
  return (
    <div>
      <div className="flex gap-1 border-b border-surface-border">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={['relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors', isActive ? 'text-brand-600' : 'text-text-secondary hover:text-text-primary'].join(' ')}
            >
              {option.label}
              {option.badge}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />}
            </button>
          );
        })}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}