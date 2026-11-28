"use client";

import { ShoppingBag } from "@/components/icons";
import CreateStaffOrder from "../create-staff-order";
import { useStaff } from "../staff-context";

/**
 * NY Studio's "new order" choices for this receptionist's store. The RTW store sells ready-to-wear (through the sales
 * desk) and takes alterations; the bespoke atelier takes custom orders and alterations. Operations and managers get all.
 */
export default function NewOrderButtons({ customerId, fittingId, onSell, onCreated }: { customerId?: number; fittingId?: number; onSell?: () => void; onCreated: (reference: string) => void }) {
  const store = useStaff()?.location ?? null;
  return <div className="studio-new-order">
    {store !== "rtw_store" && <CreateStaffOrder category="Custom" preferredCustomerId={customerId} preferredMeasurementId={fittingId} buttonClassName="showroom-primary" buttonLabel="New custom order" onCreated={onCreated} />}
    <CreateStaffOrder category="Alterations" preferredCustomerId={customerId} buttonClassName="showroom-secondary" buttonLabel="New alteration" onCreated={onCreated} />
    {store !== "atelier" && onSell && <button type="button" className="showroom-secondary" onClick={onSell}><ShoppingBag size={17} />New ready-to-wear sale</button>}
  </div>;
}
