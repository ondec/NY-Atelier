"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Check, ClipboardCheck, LockKeyhole, Plus, RefreshCw, Search, Send, UserRoundCog, X } from "@/components/icons";
import { InventoryDrawer } from "./catalogue-editor";
import { changeTeamRole, getTeam, inviteTeamMember, reinviteTeamMember, roleSummaries, setTeamAccess, storeLabels, type InvitableRole, type InvitationResult, type StoreLocation, type TeamMember } from "@/lib/team";
import type { StaffRole } from "@/lib/staff-permissions";

const statusLabels: Record<TeamMember["status"], string> = { active: "Active", invited: "Invitation sent", expired: "Invitation expired", deactivated: "Deactivated", none: "Not set up" };
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

function ManageMember({ member, roles, onClose, onChanged, onReinvite }: { member: TeamMember; roles: InvitableRole[]; onClose: () => void; onChanged: (member: TeamMember, notice: string) => void; onReinvite: (member: TeamMember) => Promise<void> }) {
  const [role, setRole] = useState<StaffRole>(member.role ?? "records");
  const [store, setStore] = useState<StoreLocation>(member.location ?? "atelier");
  const [busy, setBusy] = useState<"role" | "access" | "invite">();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const deactivated = member.status === "deactivated";
  const firstName = member.name.split(/\s+/)[0];

  async function run(kind: "role" | "access" | "invite", action: () => Promise<void>) {
    if (busy) return;
    setBusy(kind); setError("");
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : "That change could not be saved."); }
    finally { setBusy(undefined); }
  }

  const saveRole = () => run("role", async () => {
    const { member: updated } = await changeTeamRole(member.id, role, role === "receptionist" ? store : undefined);
    onChanged(updated, `${member.name} now has ${updated.role_label} access${updated.location ? ` at the ${storeLabels[updated.location]}` : ""}.`);
  });
  const toggleAccess = () => run("access", async () => {
    const { member: updated } = await setTeamAccess(member.id, deactivated ? "reactivate" : "deactivate");
    setConfirming(false);
    onChanged(updated, deactivated
      ? updated.status === "active" ? `${member.name} can sign in again.` : `${member.name}’s account is reactivated. Send a new invitation so they can finish setting it up.`
      : `${member.name} is deactivated and has been signed out.`);
  });

  return <InventoryDrawer label={`Manage ${member.name}`} onClose={onClose}>
    <section className="panel inventory-form-panel team-manage-panel">
      <div className="inventory-form-title"><div><div className="eyebrow">MANAGE ACCESS</div><h2>{member.name}</h2>{member.email && <p className="team-manage-email">{member.email}</p>}<span className={`team-account-note is-${member.status}`}>{statusLabels[member.status]}</span></div><button type="button" aria-label="Close" disabled={Boolean(busy)} onClick={onClose}><X size={18} /></button></div>

      <fieldset className="team-manage-section" disabled={Boolean(busy)}>
        <legend>Role</legend>
        <div className="team-role-options">{roles.map(item => <label key={item.id} className={`team-role-option${role === item.id ? " is-selected" : ""}`}>
          <input type="radio" name="team-role" value={item.id} checked={role === item.id} onChange={() => setRole(item.id)} />
          <span><strong>{item.label}</strong>{roleSummaries[item.id] && <small>{roleSummaries[item.id]}</small>}</span>
        </label>)}</div>
        {role === "receptionist" && <label className="team-store-select">Store<select value={store} onChange={event => setStore(event.target.value as StoreLocation)}>{(Object.keys(storeLabels) as StoreLocation[]).map(key => <option key={key} value={key}>{storeLabels[key]}</option>)}</select></label>}
        <div className="team-manage-actions"><span>{deactivated ? "The new role applies if the account is reactivated." : "Takes effect immediately, including on devices they’re signed in on."}</span><button type="button" className="team-manage-primary" disabled={(role === member.role && (role !== "receptionist" || store === (member.location ?? "atelier"))) || Boolean(busy)} onClick={saveRole}>{busy === "role" ? "Saving…" : "Save role"}</button></div>
      </fieldset>

      {member.can_reinvite && <section className="team-manage-section">
        <h3>Invitation</h3>
        <p>{member.status === "invited" ? `${firstName} hasn’t set up their account yet.` : `${firstName}’s setup link has expired.`} A new invitation replaces any earlier link.</p>
        <button type="button" className="inventory-quiet-button team-manage-inline" disabled={Boolean(busy)} onClick={() => run("invite", () => onReinvite(member))}><Send size={15} />{busy === "invite" ? "Sending…" : member.status === "expired" ? "Send new invitation" : "Resend invitation"}</button>
      </section>}

      <section className="team-manage-section">
        <h3>Account</h3>
        {deactivated
          ? <><p>{firstName} can’t sign in. Reactivating restores their access with their existing password. If they never finished setting up, send them a new invitation afterwards.</p>
            <button type="button" className="team-manage-primary" disabled={Boolean(busy)} onClick={toggleAccess}><LockKeyhole size={15} />{busy === "access" ? "Reactivating…" : "Reactivate account"}</button></>
          : confirming
            ? <div className="team-manage-confirm" role="alertdialog" aria-label={`Deactivate ${member.name}`}><p><strong>Deactivate {member.name}?</strong> They’ll be signed out straight away and won’t be able to sign in until you reactivate them. Their records and history are kept.</p>
              <div><button type="button" className="inventory-quiet-button team-manage-inline" disabled={Boolean(busy)} onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="team-manage-danger" disabled={Boolean(busy)} onClick={toggleAccess}>{busy === "access" ? "Deactivating…" : "Deactivate"}</button></div></div>
            : <><p>Deactivating signs {firstName} out everywhere and stops them signing in. You can reactivate them later.</p>
              <button type="button" className="team-manage-danger-quiet" disabled={Boolean(busy)} onClick={() => setConfirming(true)}>Deactivate account</button></>}
      </section>
      {error && <p className="collection-error" role="alert">{error}</p>}
    </section>
  </InventoryDrawer>;
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
  const [store, setStore] = useState<StoreLocation>("atelier");
  const [busy, setBusy] = useState<"new">();
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<InvitationResult>();
  const [managing, setManaging] = useState<TeamMember>();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getTeam().then(team => { if (active) { setMembers(team.members); setRoles(team.invitableRoles); setEmailDelivery(team.emailDelivery); setLoaded(true); setError(""); } })
      .catch(failure => { if (active) { setError(failure.message); setLoaded(true); } });
    return () => { active = false; };
  }, [revision]);

  function replaced(updated: TeamMember) {
    setMembers(current => current.map(member => member.id === updated.id ? updated : member));
    setManaging(current => current?.id === updated.id ? updated : current);
  }

  function applied(invitation: InvitationResult) {
    setResult(invitation); setNotice("");
    setMembers(current => current.some(member => member.id === invitation.member.id) ? current.map(member => member.id === invitation.member.id ? invitation.member : member) : [...current, invitation.member]);
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const data = new FormData(form);
    setBusy("new"); setFormError(""); setResult(undefined);
    try {
      applied(await inviteTeamMember({ name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), role, ...(role === "receptionist" ? { location: store } : {}) }));
      form.reset(); setFormOpen(false);
    } catch (failure) { setFormError(failure instanceof Error ? failure.message : "Could not send the invitation."); }
    finally { setBusy(undefined); }
  }

  async function reinvite(member: TeamMember) {
    setResult(undefined);
    const invitation = await reinviteTeamMember(member.id);
    applied(invitation); setManaging(undefined);
  }

  const visible = members.filter(member => `${member.name} ${member.job_title} ${member.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="eyebrow">WORKSPACE / TEAM DIRECTORY</div>
    <div className="page-heading inventory-heading"><div><h1>Team.</h1><p>The people working at NY Atelier.</p></div>{roles.length > 0 && <button className="create-bill-button" type="button" onClick={() => { setFormOpen(!formOpen); setFormError(""); }}>{formOpen ? <X size={17} /> : <Plus size={17} />}{formOpen ? "Close form" : "Invite staff"}</button>}</div>
    {formOpen && <section className="panel bill-form-panel team-invite-panel"><div className="eyebrow">NEW STAFF ACCOUNT</div><h2>Invite someone to NY Atelier</h2>
      <p className="portal-form-help">{emailDelivery ? "They will receive an email with a one-use link to choose their own password." : "Invitation emails are not switched on yet, so you will get a one-use setup link to share with them privately."}</p>
      <form onSubmit={invite}>
        <div className="bill-form-grid"><label>Full name<input name="name" autoComplete="off" required minLength={2} maxLength={120} /></label><label>Email<input name="email" type="email" autoComplete="off" required maxLength={255} /></label><label>Access<select name="role" value={role} onChange={event => setRole(event.target.value as StaffRole)}>{roles.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{role === "receptionist" && <label className="team-store-select">Store<select value={store} onChange={event => setStore(event.target.value as StoreLocation)}>{(Object.keys(storeLabels) as StoreLocation[]).map(key => <option key={key} value={key}>{storeLabels[key]}</option>)}</select></label>}</div>
        {roleSummaries[role] && <p className="team-role-summary">{roleSummaries[role]}</p>}
        {formError && <p className="collection-error" role="alert">{formError}</p>}
        <div className="bill-form-actions"><span>Existing active accounts are never changed by an invitation.</span><button type="submit" disabled={busy === "new"}><Send size={16} />{busy === "new" ? "Sending…" : emailDelivery ? "Send invitation" : "Create setup link"}</button></div>
      </form>
    </section>}
    {result && <InvitationNotice result={result} onClose={() => setResult(undefined)} />}
    {notice && <p className="team-change-notice" role="status"><Check size={16} />{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15} /></button></p>}
    <div className="inventory-toolbar"><label className="inventory-search"><Search size={17} /><input aria-label="Search team" placeholder="Search by name, role or email" value={search} onChange={event => setSearch(event.target.value)} /></label><span>{loaded && !error ? `${members.length} team members` : ""}</span><button className="inventory-quiet-button" aria-label="Refresh team" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} /></button></div>
    {error && <p className="collection-error" role="alert">{error}</p>}
    <section className="panel team-register"><div className="panel-heading"><div><div className="eyebrow">THE NY TEAM</div><h2>Team members <span className="heading-count">{visible.length}</span></h2></div></div>
      {!loaded ? <div className="empty-state" role="status">Loading team members…</div> : visible.length ? <div className="table-wrap"><table className="order-table"><thead><tr><th>Name</th><th>Role</th><th>Sign-in account</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(member => <tr key={member.id}>
        <td><strong>{member.name}</strong>{member.email && <small className="team-member-email">{member.email}</small>}</td>
        <td>{member.role_label ?? member.job_title}{member.location && <small className="team-store-label">{storeLabels[member.location]}</small>}</td>
        <td><span className={`team-account-note is-${member.status}`}>{statusLabels[member.status]}</span>{member.status === "invited" && member.invitation_expires_at && <small className="team-member-email">Expires {expiry(member.invitation_expires_at)}</small>}</td>
        <td>{member.manageable ? <button type="button" className="inventory-quiet-button team-reinvite" onClick={() => { setManaging(member); setNotice(""); }}><UserRoundCog size={15} />Manage</button> : member.is_self ? <span className="team-account-note">You</span> : null}</td>
      </tr>)}</tbody></table></div> : !error && <div className="empty-state">{members.length ? "No team members match this search." : "No team members recorded yet."}</div>}
    </section>
    {managing && <ManageMember key={managing.id} member={managing} roles={roles} onClose={() => setManaging(undefined)} onReinvite={reinvite} onChanged={(updated, message) => { replaced(updated); setNotice(message); setResult(undefined); setManaging(undefined); }} />}
  </>;
}
