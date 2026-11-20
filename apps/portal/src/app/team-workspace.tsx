"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search } from "@/components/icons";
import { getTeam, type TeamMember } from "@/lib/team";

export default function TeamWorkspace() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    getTeam().then(rows => { if (active) { setMembers(rows); setLoaded(true); setError(""); } })
      .catch(failure => { if (active) { setError(failure.message); setLoaded(true); } });
    return () => { active = false; };
  }, [revision]);
  const visible = members.filter(member => `${member.name} ${member.job_title}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="eyebrow">WORKSPACE / TEAM DIRECTORY</div>
    <div className="page-heading inventory-heading"><div><h1>Team.</h1><p>The people working at NY Atelier.</p></div></div>
    <div className="inventory-toolbar"><label className="inventory-search"><Search size={17} /><input aria-label="Search team" placeholder="Search by name or role" value={search} onChange={event => setSearch(event.target.value)} /></label><span>{loaded && !error ? `${members.length} team members` : ""}</span><button className="inventory-quiet-button" aria-label="Refresh team" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} /></button></div>
    {error && <p className="collection-error" role="alert">{error}</p>}
    <section className="panel team-register"><div className="panel-heading"><div><div className="eyebrow">THE NY TEAM</div><h2>Team members <span className="heading-count">{visible.length}</span></h2></div></div>
      {!loaded ? <div className="empty-state" role="status">Loading team members…</div> : !error && visible.length ? <div className="table-wrap"><table className="order-table"><thead><tr><th>Name</th><th>Role</th><th>Sign-in account</th></tr></thead><tbody>{visible.map(member => <tr key={member.id}><td><strong>{member.name}</strong></td><td>{member.job_title}</td><td><span className="team-account-note">{member.has_account ? "Account linked" : "Not set up"}</span></td></tr>)}</tbody></table></div> : !error && <div className="empty-state">{members.length ? "No team members match this search." : "No team members recorded yet."}</div>}
    </section>
  </>;
}
