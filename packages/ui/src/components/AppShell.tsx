import React, { ReactNode } from 'react';

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export interface AppShellProps {
  children: ReactNode;
  nav?: NavItem[];
  user?: { name: string; role: string; onLogout?: () => void };
}

export function AppShell({ children, nav, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface-card">
        <div className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white font-bold">
              O
            </div>
            <span className="font-semibold text-text-primary">Ordo</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {nav?.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-text-secondary hover:text-text-primary">
                {item.label}
              </a>
            ))}
          </nav>
          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-secondary sm:inline">{user.name}</span>
              {user.onLogout && (
                <button type="button" onClick={user.onLogout} className="text-sm text-text-secondary hover:text-text-primary">
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="container-app py-6">{children}</main>
    </div>
  );
}