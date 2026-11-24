import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { STORY_VIDEOS } from './storyVideos.js';
import { ArrowRight, ArrowUpRight } from './NyIcons.jsx';

const principles = [
  { title: 'Craft', copy: 'The house holds its work to the standard its own team would choose to wear.' },
  { title: 'Care', copy: 'Every finish matters, from the first cut to the last check.' },
  { title: 'Respect', copy: 'The same attention belongs to every client and every conversation.' },
  { title: 'Discretion', copy: 'A client’s personal details stay within the house.' },
  { title: 'Honesty', copy: 'Clear guidance on fabric, fit and timing is part of the service.' },
  { title: 'Pride', copy: 'The team stands behind each garment that carries the NY name.' },
];

const team = [
  { initials: 'EH', role: 'HEAD OF PRODUCTION', name: 'Evans Hammond', copy: 'Evans leads the workshop floor and the care given to cutting, sewing and finishing every garment.' },
  { initials: 'GW', role: 'OPERATIONS MANAGER', name: 'Gifty White', copy: 'Gifty coordinates the work from the atelier through delivery, keeping each order moving with care.' },
  { initials: 'CT', role: 'MEDIA & CREATIVE CONTENT OFFICER', name: 'Christopher Tetteh', copy: 'Christopher shapes the campaigns, films and imagery that tell the story of each collection.' },
];

const work = [
  { name: 'Bespoke tailoring', copy: 'Clothing shaped around individual measurements and refined through fittings.' },
  { name: 'Ceremonial wear', copy: 'Agbada, kaftans and occasion pieces for meaningful moments.' },
  { name: 'Ready-to-wear', copy: 'Considered pieces for the rhythm of everyday dress.' },
];

const FILMS = STORY_VIDEOS.map(video => video.src);

/** Portrait films that play one after another, with a progress bar for each film. */
function StoryReel() {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);
  const video = useRef(null);
  const frame = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { setVisible(entry.isIntersecting); }, { threshold: 0.25 });
    observer.observe(frame.current);
    return () => { observer.disconnect(); };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (playing && visible) { element.play().catch(() => { setPlaying(false); }); } else { element.pause(); }
  }, [index, playing, visible]);

  useEffect(() => {
    if (!playing || !visible) return;
    let frameId;
    const tick = () => {
      const element = video.current;
      if (element?.duration) setProgress(element.currentTime / element.duration);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frameId); };
  }, [index, playing, visible]);

  /** Unmutes inside the click itself, so the browser lets the film keep playing with sound. */
  function toggleSound() {
    const element = video.current;
    const next = !muted;
    setMuted(next);
    if (!element) return;
    element.muted = next;
    if (playing && visible) {
      element.play().catch(() => { element.muted = true; setMuted(true); element.play().catch(() => {}); });
    }
  }

  function show(next) { setIndex((next + FILMS.length) % FILMS.length); setProgress(0); }

  return <div className="story-reel" ref={frame}>
    <div className="story-reel-frame">
      <video key={index} ref={video} src={FILMS[index]} muted={muted} playsInline preload="auto" onEnded={() => { show(index + 1); }} aria-label={`NY Atelier film ${index + 1} of ${FILMS.length}`}/>
      <div className="story-reel-shade"/>
      <div className="story-reel-controls">
        <button type="button" onClick={() => { setPlaying(value => !value); }} aria-label={playing ? 'Pause film' : 'Play film'}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
        <button type="button" onClick={toggleSound} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>{muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button>
      </div>
      <div className="story-reel-bars">{FILMS.map((src, item) => <button key={src} type="button" onClick={() => { show(item); }} aria-label={`Play film ${item + 1} of ${FILMS.length}`} aria-current={item === index ? 'true' : undefined}><span style={{ transform: `scaleX(${item < index ? 1 : item === index ? progress : 0})` }}/></button>)}</div>
    </div>
  </div>;
}

function Kicker({ children }) { return <p className="eyebrow">{children}</p>; }

export default function DiscoverPage() {
  return <main id="main" className="discover-page">
    <section className="discover-hero">
      <div className="container discover-hero-inner">
        <Kicker>THE HOUSE OF NY ATELIER</Kicker>
        <h1>Rooted in Accra.<br/><em>Shaped by people.</em></h1>
        <p>Discover the people, ideas and careful work behind NY Atelier. Our story begins in Ghana and continues in every garment we make.</p>
        <div className="discover-hero-foot"><span>CONTEMPORARY AFRICAN LUXURY</span><span>ACCRA, GHANA</span></div>
      </div>
    </section>

    <section className="discover-intro section container">
      <div><Kicker>WHO WE ARE</Kicker><h2>A Ghanaian point of view, <em>dressed for today.</em></h2></div>
      <div className="discover-intro-copy"><p>NY Atelier grew from a tailoring workshop founded by Louis Nyarko. Today the house brings together bespoke work, ceremonial dress and ready-to-wear, with Ghanaian heritage and contemporary design informing each.</p><p>We believe the place we come from and the way we dress now belong together. Clean silhouettes, purposeful details and careful finishing give that belief its form.</p></div>
    </section>

    <section className="discover-story">
      <div className="discover-story-media"><StoryReel/></div>
      <div className="discover-story-copy"><Kicker>OUR STORY</Kicker><h2>A house built through <em>the work of its makers.</em></h2><p>The house began with the conviction that people in Accra should be able to find exceptional tailoring close to home. What started in a small workshop has grown through the work of its own makers.</p><p>From garments for milestone occasions to pieces worn through the week, the team measures, cuts, sews and finishes with the same attention to the person who will wear them.</p></div>
    </section>

    <section className="discover-direction section container" aria-label="Our vision and mission">
      <article><Kicker>OUR VISION</Kicker><h2>A distinctive African fashion house.</h2><p>NY Atelier aims to be recognised for timeless design, cultural character and exceptional craftsmanship in Ghana and beyond.</p></article>
      <article><Kicker>OUR MISSION</Kicker><h2>Dress with purpose.</h2><p>The house translates African identity into refined silhouettes and considered details, guided by a high standard of craft and service.</p></article>
    </section>

    <section className="discover-principles section">
      <div className="container"><div className="discover-section-head"><Kicker>OUR PHILOSOPHY</Kicker><h2>The standards behind <em>each garment.</em></h2><p>How we design, make and care for the people who come to us.</p></div>
        <div className="discover-principles-grid">{principles.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div>
      </div>
    </section>

    <section className="discover-leadership section container">
      <div className="discover-section-head"><Kicker>THE PEOPLE BEHIND THE HOUSE</Kicker><h2>People guiding <em>the house.</em></h2><p>The people guiding the creative work and the day-to-day life of the atelier.</p></div>
      <div className="discover-leaders">
        <article className="discover-leader"><img src="/images/discover/louis-nyarko.webp" alt="Louis Nyarko, founder and creative director of NY Atelier" loading="lazy"/><div><Kicker>FOUNDER & CREATIVE DIRECTOR</Kicker><h3>Louis Nyarko</h3><p>Louis guides the creative direction of NY Atelier, from an initial idea through the final fitting. His earlier work in cybersecurity at Fidelity Bank Ghana helped shape a disciplined approach to detail and client trust.</p><p>He has also trained and mentored younger designers and tailors over the years.</p></div></article>
        <article className="discover-leader"><img src="/images/discover/pamela-appiah-kissiwa.webp" alt="Pamela Appiah Kissiwa, general manager of NY Atelier" loading="lazy"/><div><Kicker>GENERAL MANAGER</Kicker><h3>Pamela Appiah Kissiwa</h3><p>Pamela joined the house in sales and now oversees its daily running. A University of Ghana graduate, she brings experience in client relationships and a thoughtful approach to management.</p></div></article>
      </div>
    </section>

    <section className="discover-team section"><div className="container"><div className="discover-section-head"><Kicker>OUR TEAM</Kicker><h2>Every detail has <em>a person behind it.</em></h2></div><div className="discover-team-grid">{team.map(person => <article key={person.name}><span className="discover-initials" aria-hidden="true">{person.initials}</span><p className="eyebrow">{person.role}</p><h3>{person.name}</h3><p>{person.copy}</p></article>)}</div></div></section>

    <section className="discover-atelier section"><div className="container"><div className="discover-section-head"><Kicker>THE ATELIER</Kicker><h2>From our workshop <em>to your wardrobe.</em></h2><p>In the Accra workshop, the team measures carefully, cuts by hand and checks each piece before it leaves the house.</p></div><div className="discover-work-grid">{work.map((item, index) => <article key={item.name}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.name}</h3><p>{item.copy}</p></article>)}</div><div className="discover-actions"><Link to="/services" className="button button-outline">EXPLORE SERVICES <ArrowRight size={17}/></Link><Link to="/rtw-store" className="button button-outline">VISIT THE RTW STORE <ArrowUpRight size={17}/></Link></div></div></section>
  </main>;
}
