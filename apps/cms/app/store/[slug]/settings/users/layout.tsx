import type { ReactNode } from "react";
import "./users.css";

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <div className="users-settings">{children}</div>;
}
