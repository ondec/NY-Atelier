export type StaffRole = 'owner' | 'manager' | 'receptionist' | 'records';
export const staffRoles: readonly StaffRole[] = ['owner','manager','receptionist','records'];
export type StaffPermission = 'office' | 'studio' | 'sales' | 'customers' | 'consultations' | 'orders.read' | 'orders.manage' | 'alterations.create' | 'catalogue.manage' | 'finances' | 'team';
export type StaffIdentity = { id:number;name:string;email:string;role:StaffRole;permissions:StaffPermission[];officeHref:string;studioHref?:string };
export const roleLabels:Record<StaffRole,string>={owner:'Owner',manager:'Manager',receptionist:'Receptionist',records:'Customer records'};
/** The customer-records role works only in NY Studio fittings; every other role has NY Office. */
export const roleHasOffice = (role:StaffRole) => role !== 'records';
export const can = (staff:StaffIdentity|null|undefined,permission:StaffPermission) => Boolean(staff?.permissions.includes(permission));
export const officeAccessDeniedMessage = "You don’t have permission to access NY Office. Contact your administrator if you need access.";
export const officeHref = (role:StaffRole) => `/office/${role}`;
export function sectionAllowed(staff:StaffIdentity,section:string,finance?:string) {
  if(['overview','orders','ready-to-wear','alterations'].includes(section))return can(staff,'orders.read');
  if(section==='customers')return can(staff,'customers');
  if(section==='appointments')return can(staff,'consultations');
  if(section==='atelier'||section==='production-inventory')return can(staff,'orders.manage');
  if(section==='inventory'||section==='collections')return can(staff,'catalogue.manage');
  if(section==='finances')return can(staff,'finances')&&(finance!=='reports'||staff.role==='owner');
  if(section==='team')return can(staff,'team');
  return false;
}
