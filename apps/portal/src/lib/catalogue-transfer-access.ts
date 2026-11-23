import { readStaff } from "./staff-session";
import { can } from "./staff-permissions";
import { studioSameOrigin } from "./studio-access";
import { catalogueSyncAllowed } from "./workspace-hosts";

/** Importing products is for owners, from the same NY Office host that publishes the shared catalogue. */
export async function catalogueTransferDenied(request: Request) {
  const staff = await readStaff(request);
  if (!can(staff, "catalogue.manage") || !can(staff, "team")) return Response.json({ message: "Only the owner can import products." }, { status: 403 });
  if (!studioSameOrigin(request) || !catalogueSyncAllowed(request.headers)) return Response.json({ message: "Import products from NY Office." }, { status: 403 });
  return null;
}
