'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminNav } from './admin-nav';

/**
 * Renders the admin sidebar shell for authenticated pages, but lets the login route
 * (/admin/login) render full-screen without the sidebar — without needing a separate
 * route-group layout.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === '/admin/login';

  if (bare) {
    return <div className="min-h-screen bg-bg text-fg">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-fg">
      <AdminNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
