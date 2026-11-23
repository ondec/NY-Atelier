"use client";

import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {Download, X, ChevronRight} from '@/components/icons';
import Link from 'next/link';
import type {ComponentProps} from 'react';
import {workspaceNavigationHref} from '@/lib/workspace-navigation';

type InstallPrompt = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: string}>};
const InstallContext = createContext<{installed: boolean; prompt?: InstallPrompt; installedNow: () => void}>({installed: false, installedNow: () => {}});

export function WorkspaceLink({href, ...props}: Omit<ComponentProps<typeof Link>, 'href'> & {href: string}) {
  const {installed} = useContext(InstallContext);
  return <Link prefetch={false} {...props} href={workspaceNavigationHref(href, installed)}/>;
}

export function WebAppProvider({children}: {children: React.ReactNode}) {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt>();
  useEffect(() => {
    const displayMode = matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(displayMode.matches || Boolean((navigator as Navigator & {standalone?: boolean}).standalone));
    const offered = (event: Event) => {event.preventDefault(); setPrompt(event as InstallPrompt);};
    const added = () => {setInstalled(true); setPrompt(undefined);};
    queueMicrotask(update);
    displayMode.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', added);
    if ('serviceWorker' in navigator && window.isSecureContext) void navigator.serviceWorker.register('/staff-sw.js', {scope: '/', updateViaCache: 'none'}).catch(() => {});
    return () => {displayMode.removeEventListener('change', update); window.removeEventListener('beforeinstallprompt', offered); window.removeEventListener('appinstalled', added);};
  }, []);
  return <InstallContext.Provider value={{installed, prompt, installedNow: () => setPrompt(undefined)}}>{children}</InstallContext.Provider>;
}

export function InstallWebApp({app = 'NY Office', compact = false, menuItem = false, settingsRow = false}: {app?: 'NY Office' | 'NY Studio'; compact?: boolean; menuItem?: boolean; settingsRow?: boolean}) {
  const {installed, prompt, installedNow} = useContext(InstallContext);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {if (open && compact) dialog.current?.showModal();}, [open, compact]);
  const close = () => {setOpen(false); trigger.current?.focus();};
  const instructions = <>{installed ? <p>{app} is running as an installed app.</p> : <>{prompt && <button className="web-app-install-action" type="button" onClick={async () => {try {await prompt.prompt(); await prompt.userChoice;} finally {installedNow();}}}>Install on this device</button>}<p>On iPad or iPhone, open {app} in Safari, choose Share, then Add to Home Screen. Keep “Open as Web App” on and choose Add.</p><p>On Android or a computer, choose Install app in the browser menu.</p></>}</>;
  return <><button ref={trigger} type="button" className={settingsRow ? 'studio-settings-row' : menuItem ? 'staff-account-action' : compact ? 'web-app-install-trigger' : 'studio-settings-install'} aria-label={compact ? `Install ${app}` : undefined} title={compact ? `Install ${app}` : undefined} aria-expanded={open} aria-haspopup={compact ? 'dialog' : undefined} onClick={() => setOpen(value => !value)}><Download size={20}/>{(!compact || menuItem) && <span>{installed ? 'Installed on this device' : 'Install app'}</span>}{settingsRow && <ChevronRight size={18} className={open ? 'is-expanded' : undefined}/>}</button>{open && (compact ? <dialog ref={dialog} className="web-app-install-dialog" aria-label={`Install ${app}`} onCancel={close} onClick={event => {if (event.target === event.currentTarget) {const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();}}}><header><h2>Install {app}</h2><button type="button" aria-label="Close installation instructions" onClick={close}><X size={20}/></button></header>{instructions}</dialog> : <section className="studio-install-instructions">{instructions}</section>)}</>;
}
