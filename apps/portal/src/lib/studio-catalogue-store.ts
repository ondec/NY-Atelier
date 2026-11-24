import { staffBackendHeaders } from "./staff-session";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { emptyInventory, parseInventory, type Inventory } from "./inventory";
import { redCloverCollectionInfo } from "../../../mobile/src/data/collection-info";
export type StudioCollection = { id: string; title: string; description: string; photos: string[]; productIds: string[]; featuredOn: { website: boolean; rtw: boolean; app: boolean }; order: number };
export type SharedCatalogue = { inventory: Inventory; collections: StudioCollection[]; updatedAt: string; revision: number };
export const initialCollections: StudioCollection[] = [{ ...redCloverCollectionInfo, productIds: redCloverCollectionInfo.productIds.map(id => `shop-${id}`), photos: Array.from({ length: 4 }, (_, i) => `/collections/royal-blue-stripes-${i + 1}.jpg`), featuredOn: { website: false, rtw: true, app: true }, order: 1 }];
export class CatalogueError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function studioBackend(route: string, body?: unknown) {
  const response = await fetch(`${process.env.API_BASE_URL ?? "http://127.0.0.1:8000"}/api/demo/staff/studio/${route}`, {
    method: body === undefined ? "GET" : "POST", cache: "no-store", headers: await staffBackendHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new CatalogueError(data.message ?? "Studio records are unavailable.", response.status);
  return data;
}
export async function readStudioCatalogue(): Promise<SharedCatalogue> {
  const data = await studioBackend("catalogue");
  if (data.initialized !== false) return data;
  let initial = { inventory: emptyInventory, collections: initialCollections };
  try { initial = JSON.parse(await readFile(path.join(process.env.NY_STUDIO_DATA_DIR ?? path.join(process.cwd(), ".studio-data"), "catalogue.json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return studioBackend("catalogue/initialize", { ...initial, inventory: parseInventory(JSON.stringify(initial.inventory)) });
}
export async function writeStudioCatalogue(data: { inventory: Inventory; collections: StudioCollection[]; revision: number }): Promise<SharedCatalogue> {
  return studioBackend("catalogue", data);
}
