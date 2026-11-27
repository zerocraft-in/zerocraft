export type UserRole = "admin" | "manager" | "staff" | "client";

export type UserMember = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  secure_sign_in_required?: boolean;
  created_at: string;
  updated_at: string | null;
};

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  client: "No studio access",
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "Full access to store settings, users, permissions, and operations.",
  manager: "Manage day-to-day Commerce work with limited account administration.",
  staff: "Work with assigned Commerce and Store features.",
  client: "Account exists without Commerce administration access.",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
