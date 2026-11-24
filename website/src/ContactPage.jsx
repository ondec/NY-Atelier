import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CalendarDays, Check, MapPin, MessageCircle, Phone, Users, Video } from 'lucide-react';
import { ArrowDown, ArrowRight, ArrowUpRight } from './NyIcons.jsx';
import { SOCIALS } from './SocialSection.jsx';

/** What a consultation can be about. Mirrors the mobile app's consultation purposes. */
export const CONSULTATION_SERVICES = [
  { id: 'bespoke', name: 'Bespoke tailoring', copy: 'Choose your cloth, fit and finishing details. Your piece is made to your measurements, from the first cut to the final stitch.', image: '/images/services/bespoke-white-tux.webp', position: 'center 30%' },
  { id: 'couture', name: 'Couture experience', copy: 'A one-of-a-kind design handcrafted for you, conceived as a work of art and finished by hand.', image: '/images/services/couture.webp', position: 'center 30%' },
  { id: 'occasions', name: 'Occasions & special events', copy: 'Weddings, galas and landmark days. We develop a concept for you and your party that carries the spirit of the event.', image: '/images/services/occasion.webp', position: 'center 40%' },
  { id: 'consultancy', name: 'Styling consultancy', copy: 'Guidance on styling, wardrobe curation and personal shopping, built around how you live.', image: '/images/services/consultancy.webp', position: 'center 30%' },
  { id: 'fabric', name: 'Custom fabric selection', copy: 'Explore texture, pattern and finish with the atelier and find the cloth that suits your garment.', image: '/images/services/fabric.webp', position: 'center 30%' },
  { id: 'wardrobe', name: 'Wardrobe revamping', copy: 'A fresh start for your wardrobe, with pieces that fit your lifestyle and still feel like you.', image: '/images/editorial/06-portrait.webp', position: 'center 35%' },
  { id: 'accessories', name: 'Personalised accessories', copy: 'Accents designed or selected to complete your look: the finishing touch.', image: '/images/services/accessories.webp', position: 'center' },
  { id: 'fit', name: 'Measurements & fit', copy: 'Talk through your measurements, fitting needs and how you want your garment to sit and move.', image: '/images/discover/workshop.webp', position: 'center 35%' },
  { id: 'other', name: 'Something else', copy: 'Tell us what you have in mind and we will help you find the right service.', image: '/images/editorial/03-portrait.webp', position: 'center 30%' },
];

const MEETING = [
  { id: 'in-person', name: 'In person', note: 'At the atelier in Accra', Icon: Users },
  { id: 'virtual', name: 'Virtual', note: 'A video call, wherever you are', Icon: Video },
];

const TIMES = ['10:00', '12:00', '14:00', '16:00'];

const TOPICS = ['A ready-to-wear piece', 'Sizing & fit', 'An existing order', 'Press & collaborations', 'Something else'];

const COLLAGE = {
  consultation: [
    { src: '/images/services/couture.webp', alt: 'A couple in NY Atelier couture', position: 'center 30%' },
    { src: '/images/discover/workshop.webp', alt: 'A fitting in the NY Atelier workshop', position: 'center 35%' },
    { src: '/images/services/fabric.webp', alt: 'Close view of a floral jacquard cloth', position: 'center 30%' },
  ],
  enquiry: [
    { src: '/images/editorial/02-portrait.webp', alt: 'A client in NY Atelier ready-to-wear', position: 'center 30%' },
    { src: '/images/editorial/05-portrait.webp', alt: 'NY Atelier ready-to-wear styled outdoors', position: 'center 30%' },
    { src: '/images/editorial/07-portrait.webp', alt: 'A portrait in an NY Atelier look', position: 'center 30%' },
  ],
};

/** Different clients and looks from the house, so the row never repeats one face. */
const GALLERY = [
  { src: '/images/gallery/06.webp', alt: 'A client seated in an ivory NY Atelier trouser suit' },
  { src: '/images/gallery/23.webp', alt: 'A client in a white NY Atelier kaftan with an embroidered stole' },
  { src: '/images/gallery/01.webp', alt: 'A couple in gold and earth-toned NY Atelier regalia' },
  { src: '/images/gallery/18.webp', alt: 'A client seated in a black NY Atelier suit' },
  { src: '/images/gallery/38.webp', alt: 'A client in a white NY Atelier tuxedo jacket' },
  { src: '/images/gallery/35.webp', alt: 'A client in an all-black NY Atelier look' },
];

const ATELIER_PHONE = { label: '050 074 4266', href: 'tel:+233500744266' };

/** Where to find the house. Coordinates and links come from the owner's Google Maps places. */
const LOCATIONS = [
  {
    id: 'atelier', label: 'THE BESPOKE ATELIER', name: 'NY Atelier',
    copy: 'Where consultations, measurements and fittings take place, and where every bespoke and couture piece is made.',
    address: 'St Johns – Dome – Kwabenya – Brekusu Rd, Kwabenya, Accra', plusCode: 'MQG5+HF Kwabenya',
    lat: 5.6763897, lng: -0.2412862, directions: 'https://maps.app.goo.gl/tbAMUUhrLmgotv3g6',
    phone: ATELIER_PHONE,
    action: { label: 'Book a consultation', to: '/consultation' },
  },
  {
    id: 'store', label: 'THE READY-TO-WEAR STORE', name: 'NY Atelier RTW',
    copy: 'Our physical store for the ready-to-wear collection. Come in to see the pieces, try sizes and take them home.',
    address: 'Haatso, Accra', plusCode: 'MR97+3CM Haatso',
    lat: 5.6677162, lng: -0.1864437, directions: 'https://maps.app.goo.gl/qrBRmeG3NzFX2pjn6',
    action: { label: 'Shop ready-to-wear', to: '/rtw-store' },
  },
];

/** The house asks for at least two weeks' notice, so offer the two weeks that follow that. */
const NOTICE_DAYS = 14;
const PLAN_AHEAD = ['Fabric swatches and design sketches curated for you', 'Studio time reserved for your fittings and consultation', 'Time to perfect every detail of your garment'];

function nextDays() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + NOTICE_DAYS + index);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      day: date.toLocaleDateString('en-GH', { weekday: 'short' }),
      date: date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
    };
  });
}

function Chips({ label, options, value, onChange, render = option => option, keyOf = option => option, className = '' }) {
  return <fieldset className={`cx-field ${className}`}>
    <legend>{label}</legend>
    <div className="cx-chips">{options.map(option => {
      const key = keyOf(option);
      return <button key={key} type="button" className="cx-chip" aria-pressed={value === key} onClick={() => { onChange(key); }}>{render(option)}</button>;
    })}</div>
  </fieldset>;
}

function DemoNotice() {
  return <p className="form-caption">This website is a preview: nothing is sent or saved yet. Contact the atelier through its official channels for a real booking.</p>;
}

function ConsultationPanel({ initialService }) {
  const days = useMemo(nextDays, []);
  const [method, setMethod] = useState('in-person');
  const [serviceId, setServiceId] = useState(initialService ?? 'bespoke');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submissionId = useRef(null);
  const service = CONSULTATION_SERVICES.find(item => item.id === serviceId) ?? CONSULTATION_SERVICES[0];
  const day = days.find(item => item.value === date);
  const meeting = MEETING.find(item => item.id === method);

  useEffect(() => { if (initialService) setServiceId(initialService); }, [initialService]);

  function changeSelection(setValue, value) {
    submissionId.current = null;
    setSubmitError('');
    setValue(value);
  }

  async function submit(event) {
    event.preventDefault();
    if (!date || !time || sending || sent) return;
    const fields = new FormData(event.currentTarget);
    submissionId.current ??= crypto.randomUUID();
    const payload = {
      id: submissionId.current,
      method,
      purpose: service.name,
      preferredDate: date,
      preferredTime: time,
      name: String(fields.get('name') ?? '').trim(),
      email: String(fields.get('email') ?? '').trim(),
      phone: String(fields.get('phone') ?? '').trim(),
      notes: String(fields.get('notes') ?? '').trim(),
    };
    setSending(true);
    setSubmitError('');
    try {
      const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const response = await fetch(`${base}/api/consultations`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {})[0]?.[0] ?? result.message ?? 'Your request could not be sent. Please try again.');
      setSent({ meeting: meeting.name, service: service.name, day: `${day?.day} ${day?.date}`, time });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Your request could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return <div className="cx-panel cx-panel-booking">
    <aside className="cx-visual" aria-live="polite">
      <div className="cx-visual-image"><img key={service.image} src={service.image} alt="" style={{ objectPosition: service.position }}/></div>
      <div className="cx-visual-copy">
        <p className="eyebrow">YOUR CONSULTATION</p>
        <h3>{service.name}</h3>
        <p>{service.copy}</p>
        <dl className="cx-summary">
          <div><dt>Meeting</dt><dd>{meeting.name}</dd></div>
          <div><dt>Day</dt><dd>{day ? `${day.day} ${day.date}` : 'Choose a day'}</dd></div>
          <div><dt>Time</dt><dd>{time ? `${time} Accra` : 'Choose a time'}</dd></div>
        </dl>
      </div>
      <div className="cx-plan">
        <p className="eyebrow">PLAN AHEAD</p>
        <h4>Book at least two weeks ahead</h4>
        <p>Every client has the consultants' undivided attention, and spaces are limited. Booking early allows for:</p>
        <ul>{PLAN_AHEAD.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </aside>

    <form className="cx-form" onSubmit={submit} aria-busy={sending} onChangeCapture={() => { if (!sent) { submissionId.current = null; setSubmitError(''); } }}>
      <p className="eyebrow">BEGIN YOUR JOURNEY</p>
      <h2>Request a <em>consultation.</em></h2>
      <p className="cx-form-intro">A free conversation about your garment, fabric, measurements and timeline. Choose a preferred time and the team will confirm it or suggest another.</p>

      <Chips label="How would you like to meet?" options={MEETING} value={method} onChange={value => changeSelection(setMethod, value)} keyOf={option => option.id} className="cx-field-meet"
        render={({ name, note, Icon }) => <><Icon size={18}/><span><strong>{name}</strong><small>{note}</small></span></>}/>
      <Chips label="What can we help with?" options={CONSULTATION_SERVICES} value={serviceId} onChange={value => changeSelection(setServiceId, value)} keyOf={option => option.id} render={option => option.name}/>
      <Chips label="Preferred day" options={days} value={date} onChange={value => changeSelection(setDate, value)} keyOf={option => option.value} className="cx-field-days"
        render={option => <><small>{option.day}</small><strong>{option.date}</strong></>}/>
      <Chips label="Preferred time · Accra" options={TIMES} value={time} onChange={value => changeSelection(setTime, value)}/>
      <p className="cx-hint cx-hint-hours">The atelier is open 8:00 to 17:00. Days start two weeks from today so the team can prepare for you.</p>

      <div className="form-row">
        <label>FULL NAME<input name="name" type="text" required autoComplete="name" placeholder="Your full name"/></label>
        <label>EMAIL ADDRESS<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label>
      </div>
      <label>PHONE NUMBER<input name="phone" type="tel" required autoComplete="tel" placeholder="+233"/></label>
      <label>TELL US ABOUT YOUR IDEA · OPTIONAL<textarea name="notes" rows={4} maxLength={1000} placeholder="The garment, occasion or fit you have in mind…"/></label>

      <label className="cx-agree"><input type="checkbox" required/><span>I understand consultations are best booked at least two weeks ahead, and the team will confirm my time or suggest another.</span></label>
      <button type="submit" className="button button-solid cx-submit" disabled={!date || !time || sending || sent}>{sending ? 'SENDING REQUEST…' : sent ? 'REQUEST SENT' : 'SEND CONSULTATION REQUEST'}</button>
      {(!date || !time) && <p className="cx-hint">Choose a day and a time to continue.</p>}
      <p className="form-caption">Your preferred time is a request. The team will contact you to confirm it or arrange another.</p>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
      {sent && <div className="form-success" role="status"><Check size={18}/><div><strong>Request received.</strong><p>{sent.meeting} · {sent.service} · {sent.day} at {sent.time}. The team will be in touch to confirm.</p></div></div>}
      <p className="cx-switch">Just a question? <Link to="/contact">Send an enquiry instead <ArrowRight size={14}/></Link></p>
    </form>
  </div>;
}

function EnquiryPanel() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [sent, setSent] = useState(false);

  function submit(event) { event.preventDefault(); setSent(true); }

  return <div className="cx-panel cx-panel-enquiry">
    <form className="cx-form" onSubmit={submit}>
      <p className="eyebrow">GET IN TOUCH</p>
      <h2>Send us a <em>message.</em></h2>
      <p className="cx-form-intro">Questions about a piece, sizing, an order or working together. Write to the atelier and the team will get back to you.</p>
      <Chips label="What is it about?" options={TOPICS} value={topic} onChange={setTopic}/>
      <div className="form-row">
        <label>FULL NAME<input name="name" type="text" required autoComplete="name" placeholder="Your full name"/></label>
        <label>EMAIL ADDRESS<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label>
      </div>
      <label>YOUR MESSAGE<textarea name="message" rows={6} required maxLength={2000} placeholder="How can we help?"/></label>
      <button type="submit" className="button button-solid cx-submit">SEND ENQUIRY</button>
      <DemoNotice/>
      {sent && <div className="form-success" role="status"><Check size={18}/><div><strong>Message checked.</strong><p>Your enquiry about "{topic.toLowerCase()}" is valid. Nothing has been sent from this preview.</p></div></div>}
    </form>

    <aside className="cx-reach">
      <div className="cx-reach-card">
        <p className="eyebrow">OTHER WAYS TO REACH US</p>
        <a className="cx-reach-item" href="#locations" onClick={event => { event.preventDefault(); document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth' }); }}><MapPin size={18}/><div><strong>Visit us</strong><span>The atelier in Kwabenya · the store in Haatso</span></div><ArrowDown size={14}/></a>
        <a className="cx-reach-item" href={ATELIER_PHONE.href}><Phone size={18}/><div><strong>Call the atelier</strong><span>{ATELIER_PHONE.label}</span></div></a>
        {SOCIALS.map(({ name, handle, url, Icon }) => <a key={name} className="cx-reach-item" href={url} target="_blank" rel="noreferrer">
          <Icon size={18}/><div><strong>{name}</strong><span>{handle}</span></div><ArrowUpRight size={14}/>
        </a>)}
      </div>
      <Link to="/consultation" className="cx-promo">
        <img src="/images/services/bespoke-white-tux.webp" alt="" style={{ objectPosition: 'center 30%' }}/>
        <span className="cx-promo-copy"><small>MADE FOR YOU</small><strong>Thinking of a bespoke piece?</strong><span>Book a consultation <ArrowRight size={14}/></span></span>
      </Link>
    </aside>
  </div>;
}

function Gallery() {
  return <section className="cx-gallery" aria-labelledby="cx-gallery-title">
    <div className="container cx-gallery-head">
      <div><p className="eyebrow">FROM THE ATELIER</p><h2 id="cx-gallery-title">Made for <em>your story.</em></h2></div>
      <div className="cx-follow">
        <a href={SOCIALS[0].url} target="_blank" rel="noreferrer" className="svc-link">FOLLOW {SOCIALS[0].handle.toUpperCase()} <ArrowUpRight size={16}/></a>
        {SOCIALS.slice(1).map(({ name, handle, url, Icon }) => <a key={name} href={url} target="_blank" rel="noreferrer" className="cx-follow-icon" aria-label={`${name} ${handle} (opens in a new tab)`} title={name}><Icon size={18}/></a>)}
      </div>
    </div>
    <div className="cx-gallery-row">{GALLERY.map(image => <figure key={image.src}><img src={image.src} alt={image.alt} loading="lazy"/></figure>)}</div>
    <p className="cx-gallery-more container">Browse the <Link to="/rtw-store">ready-to-wear store</Link> or read <Link to="/our-story">our story</Link>.</p>
  </section>;
}

function Locations() {
  return <section id="locations" className="cx-locations container" aria-labelledby="cx-locations-title">
    <div className="cx-locations-head">
      <p className="eyebrow">VISIT THE HOUSE</p>
      <h2 id="cx-locations-title">Two homes <em>in Accra.</em></h2>
      <p>The atelier is where bespoke pieces are made; the store is where you can try on the ready-to-wear collection.</p>
    </div>
    <div className="cx-locations-grid">{LOCATIONS.map(place => <article key={place.id} className="cx-location">
      <div className="cx-location-map">
        <iframe title={`Map showing ${place.name}`} src={`https://www.google.com/maps?q=${place.lat},${place.lng}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
      </div>
      <div className="cx-location-copy">
        <p className="eyebrow">{place.label}</p>
        <h3>{place.name}</h3>
        <p>{place.copy}</p>
        <div className="cx-location-address"><MapPin size={18}/><div><strong>{place.address}</strong><span>Plus Code {place.plusCode}</span></div></div>
        {place.phone && <a className="cx-location-address cx-location-phone" href={place.phone.href}><Phone size={18}/><div><strong>{place.phone.label}</strong><span>Call the atelier</span></div></a>}
        <div className="cx-location-actions">
          <a href={place.directions} target="_blank" rel="noreferrer" className="button button-solid">GET DIRECTIONS <ArrowUpRight size={16}/></a>
          <Link to={place.action.to} className="svc-link">{place.action.label.toUpperCase()} {place.action.to.startsWith('/rtw-store') ? <ArrowUpRight size={16}/> : <ArrowRight size={16}/>}</Link>
        </div>
      </div>
    </article>)}</div>
  </section>;
}

function Collage({ images, badge }) {
  return <div className="cx-collage" aria-hidden="true">
    {images.map((image, index) => <figure key={image.src} className={`cx-collage-${index + 1}`}><img src={image.src} alt="" style={{ objectPosition: image.position }}/></figure>)}
    <span className="cx-collage-badge">{badge}</span>
  </div>;
}

/** Scrolls to the page's form, now or (with `onArrival`) when the page opens with that request in the address. */
function useFormScroll(onArrival) {
  const formRef = useRef(null);
  const scroll = () => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  useEffect(() => {
    if (!onArrival) return undefined;
    const timer = setTimeout(scroll, 80);
    return () => { clearTimeout(timer); };
  }, [onArrival]);
  return [formRef, scroll];
}

/** Consultation: book time with the atelier, following the app's request flow. */
export function ConsultationPage() {
  const location = useLocation();
  const requestedService = new URLSearchParams(location.search).get('service');
  const initialService = CONSULTATION_SERVICES.some(item => item.id === requestedService) ? requestedService : undefined;
  const [formRef, scrollToForm] = useFormScroll(initialService ?? (location.hash === '#book' ? 'book' : null));

  return <main id="main" className="cx-page">
    <section className="cx-hero container">
      <div className="cx-hero-copy">
        <p className="eyebrow">BESPOKE CONSULTATION</p>
        <h1>Begin your <em>journey.</em></h1>
        <p>A free, unhurried conversation with the atelier about your garment, fabric, measurements and timeline. In person in Accra, or by video wherever you are.</p>
        <div className="cx-hero-paths">
          <button type="button" onClick={scrollToForm}><CalendarDays size={18}/><span><strong>Choose a time</strong><small>For bespoke, couture, occasions and styling</small></span><ArrowDown size={15}/></button>
          <Link to="/contact"><MessageCircle size={18}/><span><strong>Just a question?</strong><small>Send the atelier a message instead</small></span><ArrowRight size={15}/></Link>
        </div>
      </div>
      <Collage images={COLLAGE.consultation} badge="Free consultation"/>
    </section>
    <section className="cx-body container" aria-label="Request a consultation" ref={formRef}>
      <ConsultationPanel initialService={initialService}/>
    </section>
    <Gallery/>
  </main>;
}

/** Contact: general enquiries. Old consultation links (/contact#consultation) move to the consultation page. */
export default function ContactPage() {
  const location = useLocation();
  const [formRef, scrollToForm] = useFormScroll(location.hash === '#message' ? 'message' : null);
  // Links from the RTW store ("Visit the store") land on the locations section.
  useEffect(() => {
    if (location.hash !== '#locations') return undefined;
    const timer = setTimeout(() => { document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth' }); }, 120);
    return () => { clearTimeout(timer); };
  }, [location.hash]);
  if (location.hash === '#consultation') return <Navigate to={`/consultation${location.search}`} replace/>;

  return <main id="main" className="cx-page">
    <section className="cx-hero container">
      <div className="cx-hero-copy">
        <p className="eyebrow">LET'S CONNECT</p>
        <h1>Begin a <em>conversation.</em></h1>
        <p>Questions about a piece, sizing, an order or working together? Write to the atelier and the team will get back to you.</p>
        <div className="cx-hero-paths">
          <button type="button" onClick={scrollToForm}><MessageCircle size={18}/><span><strong>Send a message</strong><small>Orders, sizing and everything else</small></span><ArrowDown size={15}/></button>
          <Link to="/consultation"><CalendarDays size={18}/><span><strong>Planning a bespoke piece?</strong><small>Book a consultation instead</small></span><ArrowRight size={15}/></Link>
        </div>
      </div>
      <Collage images={COLLAGE.enquiry} badge="We read every message"/>
    </section>
    <section className="cx-body container" aria-label="Send an enquiry" ref={formRef}>
      <EnquiryPanel/>
    </section>
    <Locations/>
    <Gallery/>
  </main>;
}
