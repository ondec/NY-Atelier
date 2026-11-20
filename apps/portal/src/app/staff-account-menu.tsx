"use client";

import {useEffect, useRef} from 'react';
import {roleLabels, type StaffIdentity} from '@/lib/staff-permissions';
import {InstallWebApp} from './web-app';
import StaffSignOut from './staff-sign-out';

export default function StaffAccountMenu({staff}: {staff: StaffIdentity}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const initials = staff.name.trim().split(/\s+/).map(part => Array.from(part)[0]).join('').slice(0, 2).toUpperCase();
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target) && !menu.current.querySelector('dialog[open]')) menu.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  return <details ref={menu} className="staff-account-menu" onKeyDown={event => {
    if (event.key === 'Escape' && !menu.current?.querySelector('dialog[open]')) {
      event.preventDefault();
      if (menu.current) menu.current.open = false;
      trigger.current?.focus();
    }
  }} onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && !menu.current?.querySelector('dialog[open]')) event.currentTarget.open = false;
  }}>
    <summary ref={trigger} aria-label={`${roleLabels[staff.role]} account: ${staff.name}`} title="Account options">
      <span className="staff-account-role">{roleLabels[staff.role]} view</span>
      <span className="profile-mark" aria-hidden="true">{initials}</span>
    </summary>
    <div className="staff-account-popover">
      <div className="staff-account-identity"><strong>{staff.name}</strong><span>{staff.email}</span></div>
      <InstallWebApp compact menuItem/>
      <StaffSignOut/>
    </div>
  </details>;
}
