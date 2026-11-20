export type TeamMember = { id: number; name: string; job_title: string; salary_eligible: boolean; has_account: boolean };

export async function getTeam(): Promise<TeamMember[]> {
  const response = await fetch("/api/staff-team", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Could not load the team directory.");
  return data.members;
}
