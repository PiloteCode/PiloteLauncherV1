import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Admin shell. The session is guarded by middleware (redirects to /admin/login when absent).
 * AdminShell renders the sidebar for authenticated pages and a bare full-screen layout for
 * the /admin/login route, while still showing the signed-in user in the sidebar.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
