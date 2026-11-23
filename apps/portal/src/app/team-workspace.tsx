"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Check, ClipboardCheck, Plus, RefreshCw, Search, Send, X } from "@/components/icons";
import { getTeam, inviteTeamMember, reinviteTeamMember, roleSummaries, type InvitableRole, type InvitationResult, type TeamMember } from "@/lib/team";
import type { StaffRole } from "@/lib/staff-permissions";

const statusLabels: Record<TeamMember["status"], string> = { active: "Active", invited: "Invitation sent", expired: "Invitation expired", none: "Not set up" };
const expiry = (value: string) => new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function InvitationNotice({ result, onClose }: { result: InvitationResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const name = result.member.name;
  async function copy() {
    if (!result.setupUrl) return;
    try { await navigator.clipboard.writeText(result.setupUrl); setCopied(true); } catch { setCopied(false); }
  }
  return <section className="panel team-invite-result" role="status" aria-live="polite">
    <div className="team-invite-result-heading"><div className="eyebrow">{result.delivery === "sent" ? "INVITATION EMAILED" : "SHARE THE SETUP LINK"}</div><button type="button" className="inventory-quiet-button" aria-label="Dismiss invitation message" onClick={onClose}><X size={16} /></button></div>
    {result.delivery === "sent"
      ? <p><Check size={16} /> {name} will receive an email at <strong>{result.member.email}</strong> to choose their own password. The link works once and expires {expiry(result.expiresAt)}.</p>
      : <>
        <p>{result.delivery === "failed" ? "The invitation email could not be sent." : "Invitation emails are not switched on yet."} Share this one-use link with {name} privately (for example in person or by direct message). It expires {expiry(result.expiresAt)}.</p>
        {result.setupUrl && <div className="team-invite-link"><input aria-label={`Setup link for ${name}`} readOnly value={result.setupUrl} onFocus={event => event.currentTarget.select()} /><button type="button" onClick={copy}>{copied ? <Check size={16} /> : <ClipboardCheck size={16} />}{copied ? "Copied" : "Copy link"}</button></div>}
        <p className="portal-form-help">Anyone with this link can set the password for this account, so don’t post it in a group chat. Close this message once it is shared; you can create a new link later.</p>
      </>}
  </section>;
}

export default function TeamWorkspace() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<InvitableRole[]>([]);
  const [emailDelivery, setEmailDelivery] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [role, setRole] = useState<StaffRole>("records");
  const [busy, setBusy] = useState<number | "new">();
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<InvitationResult>();

  useEffect(() => {
    let active = true;
    getTeam().then(team => { if (active) { setMembers(team.members); setRoles(team.invitableRoles); setEmailDelivery(team.emailDelivery); setLoaded(true); setError(""); } })
      .catch(failure => { if (active) { setError(failure.message); setLoaded(true); } });
    return () => { active = false; };
  }, [revision]);

  function applied(invitation: InvitationResult) {
    setResult(invitation);
    setMembers(current => current.some(member => member.id === invitation.member.id) ? current.map(member => member.id === invitation.member.id ? invitation.member : member) : [...current, invitation.member]);
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const data = new FormData(form);
    setBusy("new"); setFormError(""); setResult(undefined);
    try {
      applied(await inviteTeamMember({ name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), role }));
      form.reset(); setFormOpen(false);
    } catch (failure) { setFormError(failure instanceof Error ? failure.message : "Could not send the invitation."); }
    finally { setBusy(undefined); }
  }

  async function reinvite(member: TeamMember) {
    if (busy) return;
    setBusy(member.id); setError(""); setResult(undefined);
    try { applied(await reinviteTeamMember(member.id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not create a new invitation."); }
    finally { setBusy(undefined); }
  }

  const visible = members.filter(member => `${member.name} ${member.job_title} ${member.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="eyebrow">WORKSPACE / TEAM DIRECTORY</div>
    <div className="page-heading inventory-heading"><div><h1>Team.</h1><p>The people working at NY Atelier.</p></div>{roles.length > 0 && <button className="create-bill-button" type="button" onClick={() => { setFormOpen(!formOpen); setFormError(""); }}>{formOpen ? <X size={17} /> : <Plus size={17} />}{formOpen ? "Close form" : "Invite staff"}</button>}</div>
    {formOpen && <section className="panel bill-form-panel team-invite-panel"><div className="eyebrow">NEW STAFF ACCOUNT</div><h2>Invite someone to NY Atelier</h2>
      <p className="portal-form-help">{emailDelivery ? "They will receive an email with a one-use link to choose their own password." : "Invitation emails are not switched on yet, so you will get a one-use setup link to share with them privately."}</p>
      <form onSubmit={invite}>
        <div className="bill-form-grid"><label>Full name<input name="name" autoComplete="off" required minLength={2} maxLength={120} /></label><label>Email<input name="email" type="email" autoComplete="off" required maxLength={255} /></label><label>Access<select name="role" value={role} onChange={event => setRole(event.target.value as StaffRole)}>{roles.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
        {roleSummaries[role] && <p className="team-role-summary">{roleSummaries[role]}</p>}
        {formError && <p className="collection-error" role="alert">{formError}</p>}
        <div className="bill-form-actions"><span>Existing active accounts are never changed by an invitation.</span><button type="submit" disabled={busy === "new"}><Send size={16} />{busy === "new" ? "Sending…" : emailDelivery ? "Send invitation" : "Create setup link"}</button></div>
      </form>
    </section>}
    {result && <InvitationNotice result={result} onClose={() => setResult(undefined)} />}
    <div className="inventory-toolbar"><label className="inventory-search"><Search size={17} /><input aria-label="Search team" placeholder="Search by name, role or email" value={search} onChange={event => setSearch(event.target.value)} /></label><span>{loaded && !error ? `${members.length} team members` : ""}</span><button className="inventory-quiet-button" aria-label="Refresh team" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} /></button></div>
    {error && <p className="collection-error" role="alert">{error}</p>}
    <section className="panel team-register"><div className="panel-heading"><div><div className="eyebrow">THE NY TEAM</div><h2>Team members <span className="heading-count">{visible.length}</span></h2></div></div>
      {!loaded ? <div className="empty-state" role="status">Loading team members…</div> : visible.length ? <div className="table-wrap"><table className="order-table"><thead><tr><th>Name</th><th>Role</th><th>Sign-in account</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(member => <tr key={member.id}>
        <td><strong>{member.name}</strong>{member.email && <small className="team-member-email">{member.email}</small>}</td>
        <td>{member.role_label ?? member.job_title}</td>
        <td><span className={`team-account-note is-${member.status}`}>{statusLabels[member.status]}</span>{member.status === "invited" && member.invitation_expires_at && <small className="team-member-email">Expires {expiry(member.invitation_expires_at)}</small>}</td>
        <td>{member.can_reinvite && <button type="button" className="inventory-quiet-button team-reinvite" disabled={busy !== undefined} onClick={() => reinvite(member)}><Send size={14} />{busy === member.id ? "Sending…" : member.status === "expired" ? "Send new invitation" : "Resend invitation"}</button>}</td>
      </tr>)}</tbody></table></div> : !error && <div className="empty-state">{members.length ? "No team members match this search." : "No team members recorded yet."}</div>}
    </section>
  </>;
}
