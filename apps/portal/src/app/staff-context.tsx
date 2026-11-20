"use client";
import {createContext,useContext,useEffect} from 'react';
import {staffSessionChanged} from '@/lib/staff-session-change';
import type {StaffIdentity} from '@/lib/staff-permissions';
const StaffContext=createContext<StaffIdentity|null>(null);
export const useStaff=()=>useContext(StaffContext);
export function StaffProvider({staff,children}:{staff:StaffIdentity|null;children:React.ReactNode}){
  useEffect(()=>{
    let checking=false;
    let active=true;
    const check=async()=>{
      if(checking||document.visibilityState!=='visible')return;
      checking=true;
      try{const response=await fetch('/api/staff-auth/session',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)return;const {staff:latest}=await response.json();if(active&&(latest?.id!==staff?.id||latest?.role!==staff?.role))location.reload();}catch{/* A network interruption must not discard the current screen. */}finally{checking=false;}
    };
    const changed=(event:StorageEvent)=>{if(event.key===staffSessionChanged)location.reload();};
    const restored=(event:PageTransitionEvent)=>{if(event.persisted)location.reload();};
    window.addEventListener('storage',changed);window.addEventListener('pageshow',restored);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{active=false;window.removeEventListener('storage',changed);window.removeEventListener('pageshow',restored);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[staff?.id,staff?.role]);
  return <StaffContext.Provider value={staff}>{children}</StaffContext.Provider>;
}
