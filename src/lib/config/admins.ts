// src/lib/config/admins.ts

export type EnvAdminRole = 'super_admin' | 'admin';

function parseEmailList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export const SUPER_ADMIN_EMAILS = parseEmailList(
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS
);

export const ADMIN_EMAILS = parseEmailList(process.env.NEXT_PUBLIC_ADMIN_EMAILS);

export function getEnvAdminRole(
  email: string | null | undefined
): EnvAdminRole | null {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(normalized)) return 'super_admin';
  if (ADMIN_EMAILS.includes(normalized)) return 'admin';
  return null;
}
