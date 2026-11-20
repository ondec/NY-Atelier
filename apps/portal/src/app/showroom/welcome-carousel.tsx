"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/showroom/welcome-1.webp", position: "70% top" },
  { src: "/showroom/welcome-2.webp", position: "70% top" },
  { src: "/showroom/welcome-3.webp", position: "75% top" },
  { src: "/showroom/welcome-4.webp", position: "75% top" },
  { src: "/showroom/welcome-5.webp", position: "70% top" },
];
const duration = 6000;

export default function WelcomeCarousel() {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const [waiting, setWaiting] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ready = loaded.has(index);
  const next = (index + 1) % slides.length;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--studio-welcome-image', `url("${slides[index].src}")`);
    root.style.setProperty('--studio-welcome-position', slides[index].position);
    return () => {
      root.style.removeProperty('--studio-welcome-image');
      root.style.removeProperty('--studio-welcome-position');
    };
  }, [index]);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setVisible(document.visibilityState === "visible");
    queueMicrotask(() => { updateMotion(); updateVisibility(); });
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { motion.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", updateVisibility); };
  }, []);

  function advance() {
    setIndex(next);
    setCycle(value => value + 1);
    setWaiting(false);
  }

  const nextReady = loaded.has(next);
  useEffect(() => {
    if (!waiting || !nextReady || !visible) return;
    let active = true;
    queueMicrotask(() => { if (active) { setIndex(next); setCycle(value => value + 1); setWaiting(false); } });
    return () => { active = false; };
  }, [waiting, nextReady, next, visible]);

  return <>
    <div className="studio-welcome-slides" aria-hidden="true">
      {slides.map((slide, position) => <div className="studio-welcome-slide" data-active={position === index} key={slide.src}>
        <Image src={slide.src} alt="" fill unoptimized loading={position <= 1 ? "eager" : "lazy"} fetchPriority={position === 0 ? "high" : "auto"} sizes="100vw" draggable={false} style={{ objectFit: "cover", objectPosition: slide.position }} onLoad={event => {
          const image = event.currentTarget;
          void image.decode().catch(() => {}).then(() => setLoaded(previous => previous.has(position) ? previous : new Set([...previous, position])));
        }} />
      </div>)}
    </div>
    <div className="studio-welcome-progress" role="img" aria-label={`Studio image ${index + 1} of ${slides.length}`}>
      {slides.map((slide, position) => <span className="studio-welcome-dash" key={slide.src} data-complete={position < index} aria-hidden="true">
        {position === index && ready && <i key={cycle} onAnimationEnd={() => { if (nextReady) advance(); else setWaiting(true); }} style={{ animationDuration: `${duration}ms`, animationPlayState: visible ? "running" : "paused", ...(reducedMotion ? { animationTimingFunction: "steps(1, end)" } : {}) }} />}
      </span>)}
    </div>
  </>;
}
