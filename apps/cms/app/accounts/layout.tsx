import type { ReactNode } from 'react';

/** Standalone owner account boundary: no CommerceShell/sidebar/right panel. */
export default function AccountsLayout({ children }: { children: ReactNode }) {
  return <section data-workspace="accounts" data-workspace-kind="owner">{children}</section>;
}
