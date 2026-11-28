import type { StaffRole } from "./staff-permissions";

export type TeamStatus = "active" | "invited" | "expired" | "deactivated" | "none";
export type TeamMember = {
  id: number; name: string; job_title: string; salary_eligible: boolean; has_account: boolean;
  email: string | null; role: StaffRole | null; role_label: string | null; status: TeamStatus;
  location?: StoreLocation | null; invitation_expires_at: string | null; can_reinvite: boolean; is_self: boolean; manageable: boolean;
};
export type InvitableRole = { id: StaffRole; label: string };
export type TeamDirectory = { members: TeamMember[]; emailDelivery: boolean; invitableRoles: InvitableRole[] };
export type InvitationResult = { member: TeamMember; delivery: "sent" | "not_configured" | "failed"; setupUrl: string | null; expiresAt: string };

/** What each assignable role can reach, in plain words for the owner choosing it. */
export const roleSummaries: Partial<Record<StaffRole, string>> = {
  records: "Customer records only: names, contact details, measurements and fitting history in NY Studio. No sales, finances, orders or NY Office.",
  receptionist: "NY Office and NY Studio: customers, fittings, appointments, Ready-to-Wear sales and alterations. No finances or production management.",
  manager: "NY Office and NY Studio, including orders, production, catalogue and finances. No team management.",
  production: "NY Office → Production: every custom and alteration order with its fitting, inspiration and specifications. Moves orders through stages and assigns tailors. No prices, payments, sales or customer records.",
  tailor: "NY Office → Production: only the orders assigned to them, with measurements, inspiration and specifications. View only.",
};

async function teamJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = data.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : undefined;
    throw new Error(firstError ?? data.message ?? "The team directory is unavailable. Please try again.");
  }
  return data as T;
}

/** Receptionists work at one of the two stores. */
export type StoreLocation = "atelier" | "rtw_store";
export const storeLabels: Record<StoreLocation, string> = { atelier: "Bespoke atelier (Kwabenya)", rtw_store: "RTW store (Haatso)" };

export const getTeam = () => teamJson<TeamDirectory>("/api/staff-team");

export const inviteTeamMember = (invitation: { name: string; email: string; role: StaffRole; location?: StoreLocation }) =>
  teamJson<InvitationResult>("/api/staff-team/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invitation) });

export const reinviteTeamMember = (memberId: number) =>
  teamJson<InvitationResult>(`/api/staff-team/${memberId}/invitation`, { method: "POST" });

export const changeTeamRole = (memberId: number, role: StaffRole, location?: StoreLocation) =>
  teamJson<{ member: TeamMember }>(`/api/staff-team/${memberId}/role`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, location }) });

export const setTeamAccess = (memberId: number, action: "deactivate" | "reactivate") =>
  teamJson<{ member: TeamMember }>(`/api/staff-team/${memberId}/${action}`, { method: "POST" });
