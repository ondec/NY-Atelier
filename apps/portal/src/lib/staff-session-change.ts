export const staffSessionChanged = 'ny-staff-session-changed';
export function signalStaffSessionChange(){try{localStorage.setItem(staffSessionChanged,`${Date.now()}-${Math.random()}`);}catch{/* Sign-in must still work when browser storage is unavailable. */}}
