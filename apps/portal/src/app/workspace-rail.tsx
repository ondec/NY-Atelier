"use client";

import Image from "next/image";
import {WorkspaceLink} from "./web-app";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Scissors, Shirt, Tablet } from "@/components/icons";

export default function WorkspaceRail({officeHref="/",studioHref="/showroom",productionHref,readyToWearHref,deliveriesHref,office=true,studio=true}:{officeHref?:string;studioHref?:string;productionHref?:string;readyToWearHref?:string;deliveriesHref?:string;office?:boolean;studio?:boolean}) {
  const pathname = usePathname();
  const showroom = pathname === "/showroom" || pathname.startsWith("/showroom/");
  const production = pathname === "/production" || pathname.startsWith("/production/");
  const readyToWear = pathname === "/ready-to-wear" || pathname.startsWith("/ready-to-wear/");
  const deliveries = pathname === "/deliveries" || pathname.startsWith("/deliveries/");

  return <nav className="workspace-rail" aria-label="Switch workspace">
    <WorkspaceLink href={officeHref} className="workspace-rail-brand" aria-label="NY Atelier home">
      <Image src="/ny-mark.svg" width={40} height={40} alt="" />
    </WorkspaceLink>
    <div className="workspace-rail-tabs">
      {office && <WorkspaceLink href={officeHref} className="workspace-rail-tab" aria-label="NY Office" aria-current={!showroom && !production && !readyToWear && !deliveries ? "page" : undefined}>
        <LayoutDashboard size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">NY Office</span>
      </WorkspaceLink>}
      {studio && <WorkspaceLink href={studioHref} className="workspace-rail-tab" aria-label="NY Studio" aria-current={showroom ? "page" : undefined}>
        <Tablet size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">NY Studio</span>
      </WorkspaceLink>}
      {productionHref && <WorkspaceLink href={productionHref} className="workspace-rail-tab" aria-label="NY Production" aria-current={production ? "page" : undefined}>
        <Scissors size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">NY Production</span>
      </WorkspaceLink>}
      {readyToWearHref && <WorkspaceLink href={readyToWearHref} className="workspace-rail-tab" aria-label="Ready-to-Wear" aria-current={readyToWear ? "page" : undefined}>
        <Shirt size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">Ready-to-Wear</span>
      </WorkspaceLink>}
      {deliveriesHref && <WorkspaceLink href={deliveriesHref} className="workspace-rail-tab" aria-label="Deliveries" aria-current={deliveries ? "page" : undefined}>
        <Package size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">Deliveries</span>
      </WorkspaceLink>}
    </div>
  </nav>;
}
