export type StaffRole = 'owner' | 'manager' | 'operations' | 'receptionist' | 'records' | 'production' | 'tailor' | 'courier' | 'catalogue';
export const staffRoles: readonly StaffRole[] = ['owner','manager','operations','receptionist','records','production','tailor','courier','catalogue'];
export type StaffPermission = 'office' | 'studio' | 'sales' | 'customers' | 'consultations' | 'orders.read' | 'orders.manage' | 'alterations.create' | 'catalogue.manage' | 'finances' | 'team' | 'production' | 'production.manage' | 'deliveries';
export type StaffIdentity = { id:number;name:string;email:string;role:StaffRole;/** A receptionist's store; null for everyone else. */location?:"atelier"|"rtw_store"|null;permissions:StaffPermission[];officeHref:string;studioHref?:string;productionHref?:string };
export const roleLabels:Record<StaffRole,string>={owner:'Owner',manager:'General manager',operations:'Operations manager',receptionist:'Receptionist',records:'Customer records',production:'Production manager',tailor:'Tailor',courier:'Delivery courier',catalogue:'Catalogue manager'};
/** Owner, general manager and operations manager have NY Office; the other roles work in Studio, Production or Deliveries. */
export const roleHasOffice = (role:StaffRole) => ['owner','manager','operations','catalogue'].includes(role);
export const can = (staff:StaffIdentity|null|undefined,permission:StaffPermission) => Boolean(staff?.permissions.includes(permission));
export const officeAccessDeniedMessage = "You don’t have permission to access NY Office. Contact your administrator if you need access.";
export const officeHref = (role:StaffRole) => `/office/${role}`;
export function sectionAllowed(staff:StaffIdentity,section:string,finance?:string) {
  if(['overview','orders','ready-to-wear','alterations'].includes(section))return can(staff,'orders.read');
  if(section==='customers')return can(staff,'customers');
  if(section==='appointments')return can(staff,'consultations');
  if(section==='atelier'||section==='production-inventory')return can(staff,'orders.manage');
  if(section==='inventory'||section==='collections'||section==='heroes')return can(staff,'catalogue.manage');
  if(section==='finances')return can(staff,'finances')&&(finance!=='reports'||['owner','manager'].includes(staff.role));
  if(section==='team')return can(staff,'team');
  if(section==='production')return can(staff,'production');
  return false;
}
