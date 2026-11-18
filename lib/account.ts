/** The signed-in user's editable profile. Permissions never derive from these fields. */
export interface Profile {
  fullName: string;
  preferredName: string;
  jobTitle: string;
}

export const DEFAULT_PROFILE: Profile = { fullName: 'Riya Kapoor', preferredName: 'Riya', jobTitle: 'Procurement lead' };

/** Managed by the workspace admin; shown read-only on the profile page. */
export const WORKSPACE = { name: 'Acme Industries', team: 'Procurement' } as const;
export const PERMISSION_ROLE = 'Procurement lead · can send offers and accept counteroffers up to ₹1.5 lakh a year per term';

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** The name to use in running text: preferred name if set, else the first word of the full name. */
export const callName = (p: Profile) => p.preferredName.trim() || p.fullName.trim().split(/\s+/)[0] || 'there';
