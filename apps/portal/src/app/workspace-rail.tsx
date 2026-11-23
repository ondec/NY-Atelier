"use client";

import Image from "next/image";
import {WorkspaceLink} from "./web-app";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tablet } from "@/components/icons";

export default function WorkspaceRail({officeHref="/",studioHref="/showroom",office=true}:{officeHref?:string;studioHref?:string;office?:boolean}) {
  const pathname = usePathname();
  const showroom = pathname === "/showroom" || pathname.startsWith("/showroom/");

  return <nav className="workspace-rail" aria-label="Switch workspace">
    <WorkspaceLink href={officeHref} className="workspace-rail-brand" aria-label="NY Atelier home">
      <Image src="/ny-mark.svg" width={40} height={40} alt="" />
    </WorkspaceLink>
    <div className="workspace-rail-tabs">
      {office && <WorkspaceLink href={officeHref} className="workspace-rail-tab" aria-label="NY Office" aria-current={!showroom ? "page" : undefined}>
        <LayoutDashboard size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">NY Office</span>
      </WorkspaceLink>}
      <WorkspaceLink href={studioHref} className="workspace-rail-tab" aria-label="NY Studio" aria-current={showroom ? "page" : undefined}>
        <Tablet size={21} aria-hidden="true" />
        <span className="workspace-rail-tooltip" role="tooltip">NY Studio</span>
      </WorkspaceLink>
    </div>
  </nav>;
}
