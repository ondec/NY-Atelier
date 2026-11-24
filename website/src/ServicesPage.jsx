import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { ArrowDown, ArrowRight } from './NyIcons.jsx';
import { STORY_VIDEOS } from './storyVideos.js';

/** The three services the house leads with, each shown as a large editorial feature. */
const SIGNATURE = [
  {
    id: 'bespoke',
    name: 'Bespoke tailoring',
    lead: 'A garment made for one person only.',
    copy: 'From the choice of cloth to the final stitch, each piece is cut to your exact measurements and refined over fittings until it sits the way it should.',
    includes: ['Personal measurements taken by hand', 'Cloth, cut and detail chosen with you', 'Fittings until the fit is right'],
    image: '/images/services/bespoke-white-tux.webp',
    alt: 'A couple at a formal celebration; the groom wears a white embellished tuxedo jacket with black trousers',
    position: 'center 35%',
  },
  {
    id: 'couture',
    name: 'Couture experience',
    lead: 'One-of-a-kind pieces, made by hand.',
    copy: 'For the moments when ordinary will not do. A single design developed around your style, finished with the attention a work of art deserves.',
    includes: ['A design created only for you', 'Hand-finished details and accents', 'A piece that is never repeated'],
    image: '/images/services/couture.webp',
    alt: 'A couple in NY Atelier couture: a green and gold corseted gown with kente-trimmed sleeves and a matching kaftan',
    position: 'center 30%',
  },
  {
    id: 'occasions',
    name: 'Occasions & unique ideas',
    lead: 'Your idea, made into something unforgettable.',
    copy: 'Weddings, galas and landmark celebrations. We work closely with you to develop a concept that carries the meaning of the day, then make it with care.',
    includes: ['Concepts developed around your event', 'Looks for you and your party', 'Timing planned back from the day'],
    image: '/images/services/occasion.webp',
    alt: 'A groom in kente with his groomsmen in matching orange NY Atelier outfits',
    position: 'center 40%',
  },
];

/** The other services, shown as picture cards. */
const ALSO = [
  { id: 'consultancy', name: 'Consultancy', copy: 'Styling, wardrobe curation and personal shopping guidance.', image: '/images/services/consultancy.webp', alt: 'A client in a structured black NY Atelier trouser suit', position: 'center 30%' },
  { id: 'fabric', name: 'Custom fabric selection', copy: 'Choose from a selection of fine cloths for a fully personal piece.', image: '/images/services/fabric.webp', alt: 'Close view of a cocoa-brown floral jacquard shirt', position: 'center 30%' },
  { id: 'wardrobe', name: 'Wardrobe revamping', copy: 'A fresh start for your wardrobe, built around the way you live.', image: '/images/editorial/06-portrait.webp', alt: 'A client seated beside a vintage car in NY Atelier ready-to-wear', position: 'center 35%' },
  { id: 'accessories', name: 'Personalised accessories', copy: 'Custom accents and finishing touches that complete the look.', image: '/images/services/accessories.webp', alt: 'Close view of a burgundy striped shirt pocket with an embroidered clover', position: 'center' },
];

const STEPS = [
  { name: 'Consultation', copy: 'We listen first: the occasion, your style and how you want to feel.' },
  { name: 'Measurements & concept', copy: 'Measurements are taken by hand and the design, cloth and details are agreed.' },
  { name: 'Fittings', copy: 'The garment is fitted on you and refined until it sits perfectly.' },
  { name: 'Finishing & delivery', copy: 'Final finishing in the Accra workshop, then the piece is ready for you.' },
];

const pad = n => String(n).padStart(2, '0');

/**
 * Full-screen background films for the Services hero: the house films play muted, one after another.
 * Wide screens enlarge each portrait film to the full width and centre it on that film's focal point;
 * phones see the film whole. Pauses off screen, and does not autoplay when reduced motion is requested.
 */
function HeroFilms() {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(true);
  const video = useRef(null);
  const frame = useRef(null);

  // The hero stays pinned while the page rolls over it, so pause once it is fully covered.
  useEffect(() => {
    const check = () => { setVisible(window.scrollY < (frame.current?.offsetHeight ?? window.innerHeight)); };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (playing && visible) { element.play().catch(() => { setPlaying(false); }); } else { element.pause(); }
  }, [index, playing, visible]);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    let frameId;
    const tick = () => {
      const element = video.current;
      if (element?.duration) setProgress(element.currentTime / element.duration);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frameId); };
  }, [index, playing, visible]);

  const wrap = n => (n + STORY_VIDEOS.length) % STORY_VIDEOS.length;
  function show(next) { setIndex(wrap(next)); setProgress(0); }
  function step(by) { setIndex(current => wrap(current + by)); setProgress(0); }
  const film = STORY_VIDEOS[index];

  return <div className="svc-hero-media" ref={frame}>
    <video key={film.src} ref={video} className="svc-hero-video" src={film.src} style={{ '--focus': film.focus }} muted playsInline preload="auto" onEnded={() => { step(1); }} aria-hidden="true"/>
    <div className="svc-hero-controls">
      <div className="svc-hero-bars">{STORY_VIDEOS.map((item, i) => <button key={item.src} type="button" onClick={() => { show(i); }} aria-label={`Play film ${i + 1} of ${STORY_VIDEOS.length}`} aria-current={i === index ? 'true' : undefined}><span style={{ transform: `scaleX(${i < index ? 1 : i === index ? progress : 0})` }}/></button>)}</div>
      <span className="svc-hero-count" aria-live="polite">{pad(index + 1)} / {pad(STORY_VIDEOS.length)}</span>
      <div className="svc-hero-buttons">
        <button type="button" className="svc-hero-toggle" onClick={() => { step(-1); }} aria-label="Previous film"><ChevronLeft size={17}/></button>
        <button type="button" className="svc-hero-toggle" onClick={() => { setPlaying(value => !value); }} aria-label={playing ? 'Pause background film' : 'Play background film'}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>
        <button type="button" className="svc-hero-toggle" onClick={() => { step(1); }} aria-label="Next film"><ChevronRight size={17}/></button>
      </div>
    </div>
  </div>;
}

export default function ServicesPage() {
  return <main id="main" className="svc-page">
    <section className="svc-hero">
      <HeroFilms/>
      <div className="svc-hero-shade"/>
      <div className="container svc-hero-content">
        <p className="eyebrow">THE NY SERVICES</p>
        <h1>Services with <em>intention.</em></h1>
        <p>Exclusive fashion services for discerning clients. From bespoke tailoring to the finishing touch, the NY experience begins with understanding you.</p>
        <div className="svc-hero-actions">
          <Link to="/consultation" className="button svc-button-light">BOOK A CONSULTATION <ArrowRight size={17}/></Link>
          <a href="#signature" className="button button-outline">EXPLORE SERVICES <ArrowDown size={17}/></a>
        </div>
      </div>
    </section>

    <div className="svc-after-hero">
    <section className="svc-intro section container">
      <p className="eyebrow">BEYOND THE GARMENT</p>
      <h2>Made around you, <em>from the first conversation.</em></h2>
      <ul className="svc-facts">
        <li><strong>Measured</strong><span>by hand</span></li>
        <li><strong>Fitted</strong><span>in person</span></li>
        <li><strong>Finished</strong><span>in Accra</span></li>
      </ul>
    </section>

    <section id="signature" className="svc-signature container" aria-label="Signature services">
      {SIGNATURE.map((service, index) => <article key={service.id} className="svc-feature">
        <div className="svc-feature-image"><img src={service.image} alt={service.alt} loading="lazy" style={{ objectPosition: service.position }}/></div>
        <div className="svc-feature-copy">
          <span className="svc-number">{pad(index + 1)}</span>
          <p className="eyebrow">SIGNATURE SERVICE</p>
          <h2>{service.name}</h2>
          <p className="svc-lead">{service.lead}</p>
          <p>{service.copy}</p>
          <ul className="svc-includes">{service.includes.map(item => <li key={item}>{item}</li>)}</ul>
          <Link to={`/consultation?service=${service.id}`} className="svc-link">ENQUIRE ABOUT {service.name.toUpperCase()} <ArrowRight size={16}/></Link>
        </div>
      </article>)}
    </section>

    <section className="svc-also section">
      <div className="container">
        <div className="svc-also-head"><p className="eyebrow">THE ATELIER ALSO OFFERS</p><h2>Every detail, <em>considered.</em></h2></div>
        <div className="svc-also-grid">
          {ALSO.map((service, index) => <Link key={service.name} to={`/consultation?service=${service.id}`} className="svc-card" aria-label={`Enquire about ${service.name}`}>
            <span className="svc-card-image"><img src={service.image} alt={service.alt} loading="lazy" style={{ objectPosition: service.position }}/></span>
            <span className="svc-card-number">{pad(index + SIGNATURE.length + 1)}</span>
            <span className="svc-card-title">{service.name}<ArrowRight size={18}/></span>
            <span className="svc-card-copy">{service.copy}</span>
          </Link>)}
        </div>
      </div>
    </section>

    <section className="svc-process section container" aria-labelledby="svc-process-title">
      <div className="svc-process-head"><p className="eyebrow">HOW IT WORKS</p><h2 id="svc-process-title">From conversation <em>to wardrobe.</em></h2></div>
      <ol className="svc-steps">{STEPS.map((step, index) => <li key={step.name}><span>{pad(index + 1)}</span><h3>{step.name}</h3><p>{step.copy}</p></li>)}</ol>
    </section>

    <section className="cta-strip"><p className="eyebrow">YOUR NEXT STEP</p><h2>Begin with a <em>conversation.</em></h2><Link className="button button-outline" to="/consultation">REQUEST A CONSULTATION<ArrowRight size={17}/></Link></section>
    </div>
  </main>;
}
