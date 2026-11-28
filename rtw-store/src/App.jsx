import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, Ruler, Scissors, SlidersHorizontal, Truck, UserRound } from 'lucide-react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, Heart, Menu, Minus, Plus, Search, ShoppingBag, X } from './NyIcons.jsx';
import { SocialIcons } from './SocialSection.jsx';
import { SizeGuide } from './SizeGuide.jsx';
import { publishedCharts, usePublishedSizing } from './published-sizing.js';
import { chartsFor } from './sizing.js';
import { COLLECTIONS, COLOUR_GROUPS, PRODUCTS, PROMOTIONS, SECTIONS, availabilityOf, badgeOf, coverOf, findProduct, formatGHS, isSoldOut, loadLiveCatalogue, percentOff, photosOf, productsIn, unitsOf } from './live-catalogue.js';
import { MAX_QTY, bagCount, bagTotal, readBag, sameLine, watchBag, writeBag } from './shared-bag.js';
import { mainSite } from './sites.js';

const StoreContext = createContext(null);
const fallbackImage = '/images/editorial-fallback.svg';

/** Shop sections, shown in the RTW Store mega menu and the phone menu. */
const NAV = [
  { label: 'New Arrivals', to: '/new' },
  { label: 'Men', to: '/men' },
  { label: 'Women', to: '/women' },
  { label: 'Accessories', to: '/accessories' },
  { label: 'Collections', to: '/collections' },
];
/** The main menu, the same as on the website. KEEP IN SYNC with navItems in website/src/App.jsx. */
const MAIN_NAV = [['Services', '/services'], ['RTW Store', '/shop'], ['Appointment', '/appointment'], ['Contact', '/contact']];

function useStoredState(key, initial) {
  const [state, setState] = useState(() => {
    try { const existing = localStorage.getItem(key); return existing ? JSON.parse(existing) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* private browsing */ } }, [key, state]);
  return [state, setState];
}

/** The shared bag (see shared-bag.js): the same bag shows on the main website's bag icon. */
function useSharedBag() {
  const [bag, setState] = useState(() => {
    const shared = readBag();
    if (shared.length) return shared;
    return [];
  });
  useEffect(() => watchBag(setState), []);
  const setBag = useCallback(update => { setState(current => writeBag(typeof update === 'function' ? update(current) : update)); }, []);
  return [bag, setBag];
}

/** A bag line with what the other site needs to show it. */
function snapshot(product, colour, size, qty) {
  const image = new URL(photosOf(product, colour)[0].src, window.location.origin).href;
  return { id: product.id, colour: colour.id, size, qty, name: product.name, colourName: colour.name, price: product.price, image, store: 'rtw' };
}
const stockFor = line => { const product = findProduct(line.id); const colour = product?.colours.find(c => c.id === line.colour); return colour && availabilityOf(colour, line.size) !== 'sold_out' ? MAX_QTY : 0; };

function StoreProvider({ children }) {
  const [catalogue, setCatalogue] = useState({ status: 'loading', revision: 0 });
  const [bag, setBag] = useSharedBag();
  const [saved, setSaved] = useStoredState('ny-rtw-saved-v1', []);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    loadLiveCatalogue(controller.signal).then(revision => { setCatalogue({ status: 'ready', revision }); }).catch(error => {
      if (error.name !== 'AbortError') setCatalogue({ status: 'error', message: error.message });
    });
    return () => { controller.abort(); };
  }, []);
  useEffect(() => {
    if (catalogue.status !== 'ready') return;
    setBag(current => current.map(line => {
      const product = findProduct(line.id);
      const colour = product?.colours.find(item => item.id === line.colour);
      return product && colour ? snapshot(product, colour, line.size, line.qty) : line;
    }));
  }, [catalogue.status, catalogue.revision, setBag]);
  useEffect(() => () => { clearTimeout(timer.current); }, []);
  const announce = useCallback(message => { setToast(message); clearTimeout(timer.current); timer.current = setTimeout(() => { setToast(''); }, 3500); }, []);
  const addToBag = useCallback((product, colour, size, qty) => {
    const line = snapshot(product, colour, size, qty);
    const limit = availabilityOf(colour, size) === 'sold_out' ? 0 : MAX_QTY;
    setBag(current => {
      const index = current.findIndex(item => sameLine(item, line));
      if (index < 0) return [...current, { ...line, qty: Math.min(limit, qty) }];
      return current.map((item, i) => i === index ? { ...line, qty: Math.min(limit, item.qty + qty) } : item);
    });
    announce(`${product.name} added to your bag`);
    setBagOpen(true);
  }, [setBag, announce]);
  const updateLine = useCallback((index, delta) => { setBag(current => current.map((line, i) => i === index ? { ...line, qty: Math.min(stockFor(line), line.qty + delta) } : line).filter(line => line.qty > 0)); }, [setBag]);
  const removeLine = useCallback(index => { setBag(current => current.filter((_, i) => i !== index)); }, [setBag]);
  const toggleSaved = useCallback(id => { setSaved(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]); }, [setSaved]);
  // Prices come from this catalogue when the piece is here, otherwise from the line's snapshot.
  const total = useMemo(() => bagTotal(bag.map(line => ({ ...line, price: stockFor(line) ? findProduct(line.id)?.price ?? 0 : 0 }))), [bag, catalogue.revision]);
  const value = { bag, saved, bagOpen, setBagOpen, searchOpen, setSearchOpen, toast, addToBag, updateLine, removeLine, toggleSaved, total };
  if (catalogue.status !== 'ready') return <div className="catalogue-status" role={catalogue.status === 'error' ? 'alert' : 'status'}><span className="eyebrow">THE SHOP</span><h1>{catalogue.status === 'loading' ? 'Opening the collection.' : 'The collection is unavailable.'}</h1><p>{catalogue.status === 'loading' ? 'Loading pieces from NY Atelier…' : 'We could not reach the NY Atelier catalogue. Please try again shortly.'}</p>{catalogue.status === 'error' && <a className="button button-solid" href={mainSite('/contact')}>CONTACT THE ATELIER <ArrowRight size={16}/></a>}</div>;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
const useStore = () => useContext(StoreContext);

function ProductImage({ src, alt, className = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return <img src={failed ? fallbackImage : src} alt={alt} className={className} loading={loading} onError={() => { setFailed(true); }}/>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function Eyebrow({ children }) { return <p className="eyebrow">{children}</p>; }

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [returningHome, setReturningHome] = useState(false);
  const homeAnimationTimer = useRef(null);
  const lastY = useRef(0);
  const { bag, setBagOpen, setSearchOpen } = useStore();
  const location = useLocation();
  const heroPage = location.pathname === '/';
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const heroEnd = document.querySelector('.rtw-hero')?.offsetHeight ?? window.innerHeight;
      setScrolled(heroPage ? y >= heroEnd - 90 : y > 40);
      if (y <= 40 || mobileOpen) setHidden(false); else if (Math.abs(y - lastY.current) > 4) setHidden(y > lastY.current);
      lastY.current = y;
    };
    lastY.current = window.scrollY; onScroll();
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [heroPage, mobileOpen]);
  useEffect(() => { setHidden(false); setMobileOpen(false); }, [location.pathname]);
  const count = bagCount(bag);
  // Same as the main website: the wreath turns once when the logo is clicked.
  useEffect(() => () => { clearTimeout(homeAnimationTimer.current); }, []);
  const handleHomeClick = () => {
    clearTimeout(homeAnimationTimer.current);
    setReturningHome(true);
    homeAnimationTimer.current = setTimeout(() => { setReturningHome(false); }, 1100);
  };

  return <header className={`site-header ${heroPage ? 'site-header--home' : ''} ${heroPage && !scrolled ? 'site-header--transparent' : ''} ${scrolled ? 'site-header--scrolled' : ''} ${hidden ? 'site-header--hidden' : ''}`}>
    <nav className="site-nav container" aria-label="Main navigation">
      <button type="button" className="icon-btn mobile-only" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => { setMobileOpen(open => !open); }}>{mobileOpen ? <X/> : <Menu/>}</button>
      <a href={mainSite('/')} className={`wordmark ${returningHome ? 'is-returning-home' : ''}`} aria-label="NY Atelier home" onClick={handleHomeClick}><span className="brand-mark" aria-hidden="true"><span className="brand-wreath"/><span className="brand-letters"/></span><span className="wordmark-line"/><span>NY ATELIER</span><span className="rtw-badge">RTW</span></a>
      <div className="nav-links">
        {MAIN_NAV.map(([label, href]) => href === '/shop' ? <MegaMenu key={href} label={label}/> : <a key={href} href={mainSite(href)} className="nav-link">{label}</a>)}
      </div>
      <div className="nav-actions">
        <button className="icon-btn" type="button" aria-label="Search the shop" onClick={() => { setSearchOpen(true); }}><Search/></button>
        <Link className="icon-btn rtw-saved-link" to="/saved" aria-label="Saved pieces"><Heart/></Link>
        <a className="icon-btn account-button" href={mainSite('/account')} aria-label="Your account or sign in" title="Your account"><UserRound/></a>
        <button className="icon-btn bag-button" type="button" aria-label={`Open shopping bag with ${count} items`} onClick={() => { setBagOpen(true); }}><ShoppingBag/>{count > 0 && <span className="bag-count">{count}</span>}</button>
      </div>
    </nav>
    {mobileOpen && <nav className="mobile-menu" aria-label="Mobile navigation">
      {MAIN_NAV.map(([label, href]) => href === '/shop' ? <Link key={href} to="/">{label}<ArrowRight size={15}/></Link> : <a key={href} href={mainSite(href)}>{label}<ArrowRight size={15}/></a>)}
      <a href={mainSite('/account')}>Your account<ArrowRight size={15}/></a>
      <span className="mobile-menu-heading">IN THE RTW STORE</span>
      <NavLink to="/" end>Featured Collection<ArrowRight size={15}/></NavLink>
      {NAV.map(item => <NavLink key={item.to} to={item.to}>{item.label}<ArrowRight size={15}/></NavLink>)}
      <NavLink to="/saved">Saved pieces<ArrowRight size={15}/></NavLink>
      <span>READY TO WEAR. DISTINCTLY NY.</span>
    </nav>}
  </header>;
}

/**
 * RTW Store in the main menu: hovering (or focusing) it opens a panel with the shop's sections and two
 * featured tiles. KEEP IN SYNC with MegaMenu in website/src/App.jsx (there the links are page loads).
 */
const MEGA_LINKS = [{ label: 'Featured Collection', to: '/' }, ...NAV, { label: 'All pieces', to: '/all' }];
const megaImage = name => mainSite(`/${'images'}/home/${name}`); // website images, same address
function MegaMenu({ label }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const timer = useRef(null);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => () => { clearTimeout(timer.current); }, []);
  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => { setOpen(false); }, 120); };
  return <div className={`nav-mega ${open ? 'is-open' : ''}`} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <Link to="/" className="nav-link active" aria-current="page" aria-expanded={open} aria-haspopup="true">{label}</Link>
    <div className="mega-panel" hidden={!open}>
      <div className="container mega-inner">
        <div className="mega-links"><p className="eyebrow">THE RTW STORE</p>
          {MEGA_LINKS.map(item => <Link key={item.to} to={item.to}>{item.label}<ArrowRight size={14}/></Link>)}
        </div>
        <Link to="/men" className="mega-tile"><img src={megaImage('for-him.webp')} alt="" loading="lazy"/><span>For <em>him.</em></span></Link>
        <Link to="/women" className="mega-tile"><img src={megaImage('for-her.webp')} alt="" loading="lazy"/><span>For <em>her.</em></span></Link>
      </div>
    </div>
  </div>;
}

/** On every store page: the sections, top left under the header (over the hero on the store home), to switch between them. */
function SectionLinks() {
  const { pathname } = useLocation();
  const row = useRef(null);
  // On phones the row scrolls sideways; keep the current section in view.
  useEffect(() => {
    const active = row.current?.querySelector('a.active');
    if (active) row.current.scrollTo({ left: active.offsetLeft - row.current.offsetLeft - 18, behavior: 'instant' });
  }, [pathname]);
  return <nav className={`container store-sections${pathname === '/' ? ' is-over-hero' : ''}`} aria-label="RTW Store sections" ref={row}>
    {MEGA_LINKS.map(item => <NavLink key={item.to} to={item.to} end className={({ isActive }) => isActive ? 'active' : ''}>{item.label}</NavLink>)}
  </nav>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-content">
    <div className="container footer-main">
      <div className="footer-lead">
        <Link to="/" className="footer-logo" aria-label="NY Atelier shop home"><span className="brand-mark" aria-hidden="true"><span className="brand-wreath"/><span className="brand-letters"/></span><span className="footer-logo-line" aria-hidden="true"/><span className="footer-logo-name">NY ATELIER</span></Link>
        <p className="eyebrow">THE READY-TO-WEAR SHOP</p>
        <h2>Wear your <em>story.</em></h2>
        <p>Considered ready-to-wear from the house of NY, made in Accra.</p>
      </div>
      <div className="footer-columns rtw-footer-columns">
        <div><h3>SHOP</h3>{NAV.map(item => <Link key={item.to} to={item.to}>{item.label}</Link>)}</div>
        <div><h3>BESPOKE</h3>
          <a href={mainSite('/services')}>Our services<ArrowRight size={13}/></a>
          <a href={mainSite('/appointment')}>Book an appointment<ArrowRight size={13}/></a>
          <a href={mainSite('/appointment?service=bespoke')}>Customise a piece<ArrowRight size={13}/></a>
        </div>
        <div><h3>THE HOUSE</h3>
          <a href={mainSite('/')}>NY Atelier<ArrowRight size={13}/></a>
          <a href={mainSite('/our-story')}>Our story<ArrowRight size={13}/></a>
          <a href={mainSite('/contact')}>Contact<ArrowRight size={13}/></a>
          <a href={mainSite('/contact#locations')}>Visit the store<ArrowRight size={13}/></a>
          <SocialIcons className="footer-socials"/>
        </div>
      </div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} NY ATELIER</span><span>Powered by Work on dec.</span></div>
  </div></footer>;
}

/** Product card, as in the app: one round label, saved heart, and the colour swatches stacked in a pill. */
function ProductCard({ product }) {
  const { saved, toggleSaved } = useStore();
  const active = saved.includes(product.id);
  const href = `/product/${product.id}`;
  const badge = badgeOf(product);
  const soldOut = isSoldOut(product);
  const shown = product.colours.slice(0, 3);
  // Hovering fades from the first photo to the second, when the piece has one.
  const second = photosOf(product, product.colours[0])[1]?.src;
  return <article className={`product-card ${soldOut ? 'is-sold-out' : ''}${second ? ' has-second-photo' : ''}`}>
    <div className="product-image-wrap">
      <Link to={href} aria-label={`View ${product.name}${soldOut ? ', out of stock' : ''}`}><ProductImage src={coverOf(product)} alt={product.name}/>{second && <ProductImage src={second} alt="" className="product-second-photo"/>}</Link>
      {badge && <span className={`rtw-badge-tag rtw-badge-tag--${badge.tone}`}>{badge.label}</span>}
      <button className={`wishlist ${active ? 'is-liked' : ''}`} type="button" aria-label={active ? `Remove ${product.name} from saved pieces` : `Save ${product.name}`} aria-pressed={active} onClick={() => { toggleSaved(product.id); }}><Heart size={19} fill={active ? 'currentColor' : 'none'}/></button>
      <span className="rtw-card-swatches" role="img" aria-label={`Colours: ${product.colours.map(colour => colour.name).join(', ')}`}>
        {shown.map(colour => <i key={colour.id} style={{ background: colour.swatch }}/>)}
        {product.colours.length > shown.length && <small>+{product.colours.length - shown.length}</small>}
      </span>
    </div>
    <div className="product-details">
      <div><p>{product.gender ? `${product.gender.toUpperCase()} / ` : ''}READY-TO-WEAR</p><Link to={href}>{product.name}</Link></div>
      <span className="rtw-price">{formatGHS(product.price)}{product.compareAt && <s aria-label={`was ${formatGHS(product.compareAt)}`}>{formatGHS(product.compareAt)}</s>}</span>
    </div>
  </article>;
}

function ProductGrid({ products, empty }) {
  return products.length ? <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div> : empty;
}

function SectionHeading({ eyebrow, title, accent, action, to }) {
  return <div className="section-heading"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title} <em>{accent}</em></h2></div>{action && <Link className="text-link" to={to}>{action}<ArrowRight size={17}/></Link>}</div>;
}


/**
 * Home hero: the same promotion the app shows on its home screen (the featured collection,
 * then New Arrivals), from PROMOTIONS in catalog.js. Advances every 5.5 seconds like the app,
 * pauses on request, and does not auto-advance when reduced motion is requested.
 */
function PromoHero() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const total = PROMOTIONS.length;
  const step = useCallback(by => { setIndex(current => (current + by + total) % total); }, [total]);
  const promo = PROMOTIONS[index];
  // Photos change every few seconds; a video plays to its end before the next slide.
  useEffect(() => {
    if (!playing || total < 2 || promo?.video) return undefined;
    const timer = window.setTimeout(() => { step(1); }, 5500);
    return () => { window.clearTimeout(timer); };
  }, [playing, index, step, total, promo]);
  const videos = useRef([]);
  useEffect(() => {
    videos.current.forEach((element, i) => { if (!element) return; if (i === index && playing) { element.play().catch(() => {}); } else { element.pause(); if (i !== index) element.currentTime = 0; } });
  }, [index, playing]);
  return <section className="rtw-hero" aria-roledescription="carousel" aria-label="Featured in the store">
    {PROMOTIONS.map((item, i) => item.video
      ? <video key={item.id} ref={element => { videos.current[i] = element; }} className={`rtw-hero-image ${i === index ? 'is-active' : ''}`} src={item.video} poster={item.image ?? undefined} autoPlay={i === 0} muted loop={total === 1} playsInline preload="metadata" onEnded={() => { if (playing) step(1); }} aria-hidden="true"/>
      : <img key={item.id} className={`rtw-hero-image ${i === index ? 'is-active' : ''}`} src={item.image} alt="" fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'}/>)}
    <div className="rtw-hero-shade"/>
    <div className="container rtw-hero-content">
      <div key={promo.id} className="rtw-hero-copy" aria-live={playing ? 'off' : 'polite'}>
        <Eyebrow>{promo.eyebrow}</Eyebrow>
        <h1>{promo.title} <em>{promo.accent}</em></h1>
        {promo.copy && <p>{promo.copy}</p>}
      </div>
      {promo.cta && <div className="rtw-hero-actions">
        {promo.cta.to.startsWith('#')
          ? <a href={promo.cta.to} className="button svc-button-light">{promo.cta.label} <ArrowDown size={17}/></a>
          : promo.cta.external
            ? <a href={promo.cta.to} className="button svc-button-light">{promo.cta.label} <ArrowRight size={17}/></a>
            : <Link to={promo.cta.to} className="button svc-button-light">{promo.cta.label} <ArrowRight size={17}/></Link>}
      </div>}
      {total > 1 && <div className="rtw-hero-foot">
        <span className="rtw-hero-count">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        <div className="rtw-hero-dots">{PROMOTIONS.map((item, i) => <button key={item.id} type="button" aria-label={`Show slide ${i + 1}`} aria-current={i === index} className={i === index ? 'is-active' : ''} onClick={() => { setIndex(i); }}/>)}</div>
        <div className="svc-hero-buttons">
          <button type="button" aria-label="Previous slide" onClick={() => { step(-1); }}><ChevronLeft size={18}/></button>
          <button type="button" aria-label={playing ? 'Pause slides' : 'Play slides'} onClick={() => { setPlaying(value => !value); }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
          <button type="button" aria-label="Next slide" onClick={() => { step(1); }}><ChevronRight size={18}/></button>
        </div>
      </div>}
    </div>
  </section>;
}

/** The collection the store opens with: the one featured in NY Office, else the most current one with pieces. */
function featuredCollection() {
  return COLLECTIONS.find(item => item.featured && item.productIds.length) ?? COLLECTIONS.find(item => item.productIds.length);
}

/** A collection's story and every piece in every colour; the store home and collection pages share it. */
function CollectionLooks({ collection, id, breadcrumb = true }) {
  const products = collection.productIds.map(findProduct).filter(Boolean);
  const looks = products.flatMap(product => product.colours.map(colour => ({ product, colour })));
  return <div id={id}>
    <section className="page-intro container rtw-intro">{breadcrumb && <p className="rtw-breadcrumb"><Link to="/collections">COLLECTIONS</Link> / {collection.title.toUpperCase()}</p>}<Eyebrow>{breadcrumb ? collection.eyebrow : 'FEATURED COLLECTION'}</Eyebrow><h1>{collection.title}<em>.</em></h1><p>{collection.copy}</p></section>
    <section className="container rtw-editions">{looks.map(({ product, colour }) => <Link key={`${product.id}-${colour.id}`} to={`/product/${product.id}?colour=${colour.id}`} className="rtw-edition">
      <ProductImage src={photosOf(product, colour)[0].src} alt={`${product.name} in ${colour.name}`}/>
      <span><i style={{ background: colour.swatch }}/><strong>{colour.name}</strong><small>{formatGHS(product.price)}</small><ArrowRight size={15}/></span>
    </Link>)}</section>
    {collection.story?.length > 0 && <CollectionStory collection={collection}/>}
  </div>;
}

/** What makes the collection unique: up to three chapters (set in NY Office), each beside its close-up shots, alternating sides. */
function CollectionStory({ collection }) {
  return <section className="container rtw-story" aria-label={`The story of ${collection.title}`}>
    {collection.story.map((chapter, index) => <article key={index} className={`rtw-chapter${chapter.photos.length ? '' : ' is-text-only'}${index % 2 ? ' is-reversed' : ''}`}>
      <div className="rtw-story-copy"><Eyebrow>{String(index + 1).padStart(2, '0')} / THE STORY</Eyebrow><h2>{chapter.title ?? <>Inside <em>{collection.title}.</em></>}</h2>{chapter.text.split(/\n{2,}/).filter(Boolean).map(part => <p key={part}>{part}</p>)}</div>
      {chapter.photos.length > 0 && <div className={`rtw-story-photos is-${Math.min(chapter.photos.length, 4)}`}>{chapter.photos.map((src, i) => <ProductImage key={src} src={src} alt={`${collection.title} close-up ${i + 1}`}/>)}</div>}
    </article>)}
  </section>;
}

/** The store home is the featured collection: its campaign photos in the hero, then its story and pieces. */
function Home() {
  const featured = featuredCollection();
  return <main id="main">
    <PromoHero/>
    <div className="rtw-after-hero">
      {featured
        ? <CollectionLooks collection={featured} id="featured" breadcrumb={false}/>
        : <section className="section container" id="featured"><SectionHeading eyebrow="THE RTW EDIT" title="Every" accent="piece."/><ProductGrid products={PRODUCTS.slice(0, 8)} empty={<p className="empty-results">No pieces are listed yet.</p>}/></section>}
    </div>
  </main>;
}

function ShopPage() {
  const { section = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const info = SECTIONS.find(item => item.id === section);
  const [sort, setSort] = useState('featured');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const type = params.get('type') ?? 'all';
  const colour = params.get('colour') ?? 'all';
  const price = params.get('price') ?? 'all';
  useEffect(() => {
    if (!filterOpen) return undefined;
    const outside = event => { if (!filterRef.current?.contains(event.target)) setFilterOpen(false); };
    const escape = event => { if (event.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [filterOpen]);
  useEffect(() => { setFilterOpen(false); }, [section]);
  if (section !== 'all' && !info) return <NotFound/>;
  const base = productsIn(section);
  const types = ['all', ...new Set(base.map(product => product.type))];
  const groups = COLOUR_GROUPS.filter(group => base.some(product => product.groups?.includes(group.id)));
  const prices = base.map(product => product.price).sort((a, b) => a - b);
  const threshold = prices.length ? Math.ceil(prices[Math.floor(prices.length / 2)] / 100) * 100 : 0;
  const setFilter = (key, value) => { setParams(current => { const next = new URLSearchParams(current); if (value === 'all') next.delete(key); else next.set(key, value); return next; }, { replace: true }); };
  const products = base
    .filter(product => type === 'all' || product.type === type)
    .filter(product => colour === 'all' || product.groups?.includes(colour))
    .filter(product => price === 'all' || (price === 'under' ? product.price < threshold : product.price >= threshold))
    .sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0);
  const activeCount = [type, colour, price].filter(value => value !== 'all').length;
  const clearFilters = () => { setParams({}, { replace: true }); };
  const PRICES = [{ id: 'all', label: 'All prices' }, { id: 'under', label: `Under ${formatGHS(threshold)}` }, { id: 'plus', label: `${formatGHS(threshold)} & above` }];
  const typeLabel = value => ({ all: 'All', sets: 'Sets', tops: 'Shirts & tops', trousers: 'Trousers', dresses: 'Dresses', accessories: 'Accessories' })[value] ?? value;

  return <main id="main">
    <section className="page-intro container rtw-intro">
      <Eyebrow>{info ? info.label.toUpperCase() : 'THE RTW EDIT'}</Eyebrow>
      <h1>{info ? <>{info.title} <em>{info.accent}</em></> : <>Every <em>piece.</em></>}</h1>
      <p>{info ? info.copy : 'The full ready-to-wear edit from NY Atelier.'}</p>
    </section>
    <section className="container store-section">
      <div className="shop-toolbar">
        <div className="sort-controls">
          {base.length > 0 && <div className="rtw-filter" ref={filterRef}>
            <button type="button" className={`rtw-filter-button ${activeCount ? 'is-active' : ''}`} aria-expanded={filterOpen} aria-controls="shop-filter-panel" onClick={() => { setFilterOpen(open => !open); }}>
              <SlidersHorizontal size={16}/>Filter{activeCount > 0 && <span className="rtw-filter-count">{activeCount}</span>}
            </button>
            {filterOpen && <div className="rtw-filter-panel" id="shop-filter-panel" role="dialog" aria-label="Filter pieces">
              {types.length > 2 && <fieldset><legend>TYPE</legend><div>{types.map(value => <button key={value} type="button" aria-pressed={type === value} onClick={() => { setFilter('type', value); }}>{value === 'all' ? 'All types' : typeLabel(value)}</button>)}</div></fieldset>}
              {groups.length > 1 && <fieldset><legend>COLOUR</legend><div>
                <button type="button" aria-pressed={colour === 'all'} onClick={() => { setFilter('colour', 'all'); }}>All colours</button>
                {groups.map(group => <button key={group.id} type="button" aria-pressed={colour === group.id} onClick={() => { setFilter('colour', group.id); }}><i className={`rtw-group-dot rtw-group-dot--${group.id}`}/>{group.label}</button>)}
              </div></fieldset>}
              {threshold > 0 && <fieldset><legend>PRICE</legend><div>{PRICES.map(item => <button key={item.id} type="button" aria-pressed={price === item.id} onClick={() => { setFilter('price', item.id); }}>{item.label}</button>)}</div></fieldset>}
              <div className="rtw-filter-actions">
                <button type="button" className="rtw-filter-clear" disabled={!activeCount} onClick={clearFilters}>Clear all</button>
                <button type="button" className="button button-solid" onClick={() => { setFilterOpen(false); }}>SHOW {products.length} {products.length === 1 ? 'PIECE' : 'PIECES'}</button>
              </div>
            </div>}
          </div>}
          <label className="visually-hidden" htmlFor="sort-products">Sort pieces</label>
          <select id="sort-products" value={sort} onChange={event => { setSort(event.target.value); }}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select>
        </div>
      </div>
      <div className="product-results"><span>{products.length} {products.length === 1 ? 'PIECE' : 'PIECES'}</span><p>Prices and stock status from the NY Atelier catalogue. Checkout remains a preview.</p></div>
      <ProductGrid products={products} empty={base.length ? <p className="empty-results">No pieces match these filters. <button type="button" className="rtw-inline-link" onClick={clearFilters}>Clear filters</button>.</p> : <EmptySection section={section}/>}/>
    </section>
  </main>;
}

function EmptySection({ section }) {
  return <p className="empty-results">No pieces are assigned to this section in the shared catalogue yet. <Link to="/all">See every piece</Link>.</p>;
}

function CollectionsPage() {
  return <main id="main">
    <section className="page-intro container rtw-intro"><Eyebrow>COLLECTIONS</Eyebrow><h1>Stories in <em>series.</em></h1><p>Pieces designed to belong together, each collection with its own point of view.</p></section>
    <section className="container rtw-collections">{COLLECTIONS.map(collection => <Link key={collection.id} to={`/collections/${collection.id}`} className="rtw-collection-card">
      <ProductImage src={collection.cover} alt=""/>
      <span className="rtw-collection-copy"><small>{collection.eyebrow}</small><strong>{collection.title}</strong><span>{collection.copy}</span><span className="rtw-collection-cta">VIEW THE COLLECTION <ArrowRight size={15}/></span></span>
    </Link>)}</section>
  </main>;
}

function CollectionPage() {
  const { id } = useParams();
  const collection = COLLECTIONS.find(item => item.id === id);
  if (!collection) return <NotFound/>;
  return <main id="main"><CollectionLooks collection={collection}/></main>;
}

function ProductPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const product = findProduct(id);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [error, setError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const publishedSizing = usePublishedSizing();
  const { bag, addToBag, saved, toggleSaved } = useStore();
  useEffect(() => { setPhotoIndex(0); setSize(''); setQty(1); setError(false); setGuideOpen(false); }, [id]);
  if (!product) return <NotFound/>;
  const sizeCharts = chartsFor(product, publishedSizing, publishedCharts);
  const colour = product.colours.find(item => item.id === params.get('colour')) ?? product.colours[0];
  const photos = photosOf(product, colour);
  const photo = photos[Math.min(photoIndex, photos.length - 1)];
  const isSaved = saved.includes(product.id);
  const section = SECTIONS.find(item => item.id === product.gender);
  const badge = badgeOf(product);
  const colourUnits = unitsOf(colour);
  const inBag = size ? bag.find(line => line.id === product.id && line.colour === colour.id && line.size === size)?.qty ?? 0 : 0;
  const remaining = size ? Math.max(0, MAX_QTY - inBag) : MAX_QTY;
  const cannotAdd = colourUnits === 0 || (size && remaining === 0);

  function chooseColour(next) { setParams({ colour: next }, { replace: true }); setPhotoIndex(0); setSize(''); setQty(1); setError(false); }
  function chooseSize(value) { setSize(value); setQty(1); setError(false); }
  function add() { if (!size) { setError(true); return; } addToBag(product, colour, size, Math.min(qty, remaining)); setQty(1); setError(false); }

  return <main id="main" className="product-page">
    <div className="container product-breadcrumb"><Link to="/all">SHOP</Link><span>/</span>{section && <><Link to={`/${section.id}`}>{section.label.toUpperCase()}</Link><span>/</span></>}<span>{product.name.toUpperCase()}</span></div>
    <section className="container product-layout">
      <div className="rtw-gallery">
        <div className="product-gallery">
          <ProductImage key={photo.src} src={photo.src} alt={`${product.name}${colour.photos.length ? ` in ${colour.name}` : ''}, ${photo.label.toLowerCase()}`} loading="eager"/>
          {badge && <span className={`rtw-badge-tag rtw-badge-tag--${badge.tone}`}>{badge.label}</span>}
          {!colour.photos.length && <span className="rtw-photo-pending"><i style={{ background: colour.swatch }}/>{colour.name} · photo coming soon</span>}
        </div>
        {photos.length > 1 && <div className="rtw-thumbs" role="group" aria-label="Product photos">{photos.map((item, i) => <button key={item.src} type="button" aria-label={item.label} aria-pressed={i === photoIndex} onClick={() => { setPhotoIndex(i); }}><ProductImage src={item.src} alt=""/></button>)}</div>}
      </div>
      <div className="product-info">
        <Eyebrow>{product.edition ?? (product.isNew ? 'NEW ARRIVAL' : 'READY TO WEAR')}</Eyebrow>
        <h1>{product.name}</h1>
        <p className="product-price rtw-price">{formatGHS(product.price)}{product.compareAt && <><s aria-label={`was ${formatGHS(product.compareAt)}`}>{formatGHS(product.compareAt)}</s><span className="rtw-saving">SAVE {percentOff(product)}%</span></>}</p>
        <p className="product-description">{product.description}</p>
        <div className="rtw-option"><span>COLOUR · <strong>{colour.name}</strong></span>
          <div className="rtw-colour-options">{product.colours.map(item => <button key={item.id} type="button" className="rtw-colour-option" aria-label={item.name} aria-pressed={item.id === colour.id} onClick={() => { chooseColour(item.id); }}>
            <span className="rtw-colour-thumb">{item.photos.length ? <ProductImage src={item.photos[0].src} alt=""/> : <span style={{ background: item.swatch }}/>}</span>
            <span className="rtw-colour-caption"><i style={{ background: item.swatch }}/>{item.name}</span>
          </button>)}</div>
        </div>
        <div className="size-header"><span>SELECT SIZE</span>{sizeCharts.length > 0 && <button type="button" className="rtw-size-guide-link" onClick={() => { setGuideOpen(true); document.getElementById('size-guide-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}>SIZE GUIDE</button>}</div>
        <div className="size-selector rtw-size-selector" role="radiogroup" aria-label="Sizes">{Object.keys(colour.availability).map(value => {
          const status = availabilityOf(colour, value);
          const out = status === 'sold_out';
          return <button key={value} type="button" role="radio" aria-checked={size === value} disabled={out} className={size === value ? 'selected' : ''} onClick={() => { chooseSize(value); }}>
            {value}{status === 'low' && <small>Low stock</small>}{out && <small>Sold out</small>}
          </button>;
        })}</div>
        {error && <p className="field-error" role="alert">Please select a size to continue.</p>}
        {size && inBag > 0 && <p className="rtw-size-note">{inBag} already in your bag. Final availability is confirmed by the atelier.</p>}
        <SizeGuide product={product} charts={sizeCharts} selectedSize={size} open={guideOpen} onToggle={() => { setGuideOpen(value => !value); }} onUseSize={value => { if (availabilityOf(colour, value) !== 'sold_out') chooseSize(value); }}/>
        <div className="product-qty"><span>QUANTITY</span><div><button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => { setQty(n => Math.max(1, n - 1)); }}><Minus size={15}/></button><span>{qty}</span><button type="button" aria-label="Increase quantity" disabled={qty >= remaining} onClick={() => { setQty(n => Math.min(remaining, n + 1)); }}><Plus size={15}/></button></div></div>
        <button type="button" className="button button-solid add-to-bag" disabled={cannotAdd} onClick={add}>{colourUnits === 0 ? 'OUT OF STOCK' : cannotAdd ? 'BAG LIMIT REACHED' : 'ADD TO BAG'}</button>
        <button type="button" className="favourite-inline" onClick={() => { toggleSaved(product.id); }}><Heart size={16} fill={isSaved ? 'currentColor' : 'none'}/>{isSaved ? 'SAVED' : 'SAVE FOR LATER'}</button>
        <div className="rtw-perks">
          <div><Truck size={18}/><span><strong>Delivery or pickup</strong>Delivery across Ghana, or collect from the Haatso store.</span></div>
          <a href={mainSite('/appointment?service=fit')}><Ruler size={18}/><span><strong>Not sure of your size?</strong>Ask the atelier for fit advice before you order.</span><ArrowRight size={14}/></a>
          <a href={mainSite('/appointment?service=bespoke')}><Scissors size={18}/><span><strong>Make it yours</strong>Have this piece made to your measurements.</span><ArrowRight size={14}/></a>
        </div>
        <p className="product-note">Price and stock status come from the NY Atelier catalogue. Availability can change; checkout is still a local preview and takes no payment.</p>
      </div>
    </section>
    <section className="section container"><SectionHeading eyebrow="YOU MAY ALSO LIKE" title="Considered" accent="choices." action="BACK TO SHOP" to="/all"/><ProductGrid products={PRODUCTS.filter(item => item.id !== product.id && item.gender === product.gender).slice(0, 4)}/></section>
  </main>;
}

function SavedPage() {
  const { saved } = useStore();
  const products = saved.map(findProduct).filter(Boolean);
  return <main id="main">
    <section className="page-intro container rtw-intro"><Eyebrow>SAVED PIECES</Eyebrow><h1>Your <em>shortlist.</em></h1><p>Pieces you have saved on this device.</p></section>
    <section className="container store-section"><ProductGrid products={products} empty={<p className="empty-results">Nothing saved yet. Tap the heart on any piece to keep it here. <Link to="/all">Start browsing</Link>.</p>}/></section>
  </main>;
}

function NotFound() {
  return <main className="container not-found" id="main"><Eyebrow>404 / NOT FOUND</Eyebrow><h1>This page has <em>moved.</em></h1><p>Find your way back to the ready-to-wear store.</p><Link className="button button-solid" to="/">STORE HOME <ArrowRight size={17}/></Link></main>;
}

function SearchPanel() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  useEffect(() => { if (!searchOpen) setQuery(''); }, [searchOpen]);
  if (!searchOpen) return null;
  const q = query.trim().toLowerCase();
  const results = PRODUCTS.filter(product => `${product.name} ${product.gender} ${product.type} ${product.colours.map(c => c.name).join(' ')}`.toLowerCase().includes(q)).slice(0, 6);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
    <div className="search-modal" role="dialog" aria-modal="true" aria-label="Search the store">
      <div className="search-modal-header"><Eyebrow>FIND YOUR NEXT PIECE</Eyebrow><button type="button" className="icon-btn" aria-label="Close search" onClick={() => { setSearchOpen(false); }}><X/></button></div>
      <label className="search-box"><Search size={19}/><input aria-label="Search the store" autoFocus type="search" placeholder="Search sets, shirts, colours…" value={query} onChange={event => { setQuery(event.target.value); }}/></label>
      <div className="search-hits">{results.length ? results.map(product => <button key={product.id} type="button" onClick={() => { setSearchOpen(false); navigate(`/product/${product.id}`); }}><ProductImage src={coverOf(product)} alt=""/><span>{product.name}<small>{product.gender ? product.gender[0].toUpperCase() + product.gender.slice(1) : 'Ready-to-wear'}</small></span><strong>{formatGHS(product.price)}</strong></button>) : <p>No matching pieces.</p>}</div>
    </div>
  </div>;
}

const DELIVERY = ['Collect from the Haatso store', 'Delivery in Accra', 'Delivery elsewhere in Ghana (quote confirmed by the atelier)'];
const PAYMENT = ['MTN MoMo', 'Telecel Cash', 'AT Money', 'Visa / Mastercard', 'Pay on pickup'];

function BagDrawer() {
  const { bag, bagOpen, setBagOpen, updateLine, removeLine, total } = useStore();
  const [mode, setMode] = useState('bag');
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ name: '', email: '', phone: '', address: '' });
  const [delivery, setDelivery] = useState('');
  const [payment, setPayment] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!bagOpen) { setMode('bag'); setStep(0); setError(''); } }, [bagOpen]);
  if (!bagOpen) return null;
  const checkout = mode === 'checkout';
  const heading = mode === 'done' ? 'Thank you.' : checkout ? 'Checkout.' : 'Your bag.';
  const steps = ['Details', 'Delivery', 'Payment', 'Review'];
  // A line shows from this catalogue when the piece is here, otherwise from the snapshot it carries.
  const lineOf = line => {
    const product = findProduct(line.id);
    const colour = product?.colours.find(c => c.id === line.colour);
    if (product && colour && availabilityOf(colour, line.size) !== 'sold_out') return { name: product.name, colourName: colour.name, price: product.price, image: photosOf(product, colour)[0].src, href: `/product/${product.id}?colour=${colour.id}`, available: true };
    return { name: product?.name ?? line.name ?? 'Ready-to-wear piece', colourName: colour?.name ?? line.colourName ?? '', price: 0, image: line.image ?? fallbackImage, available: false };
  };
  function next() {
    if (step === 1 && !delivery) { setError('Choose delivery or pickup.'); return; }
    if (step === 2 && !payment) { setError('Choose a payment method.'); return; }
    setError('');
    if (step === 3) { setMode('done'); return; }
    setStep(s => s + 1);
  }
  function submitDetails(event) { event.preventDefault(); setDetails(Object.fromEntries(new FormData(event.currentTarget).entries())); setStep(1); setError(''); }

  return <div className="modal-backdrop drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setBagOpen(false); }}>
    <aside className="bag-drawer" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="drawer-head"><div><Eyebrow>{checkout ? `STEP ${step + 1} OF 4 · PREVIEW` : mode === 'done' ? 'PREVIEW COMPLETE' : 'YOUR SELECTION'}</Eyebrow><h2>{heading}</h2></div><button type="button" aria-label="Close bag" className="icon-btn" onClick={() => { setBagOpen(false); }}><X/></button></div>
      {mode === 'bag' && <>
        <div className="drawer-content">{bag.length === 0 ? <div className="drawer-empty"><ShoppingBag size={35}/><h3>Your bag is empty.</h3><p>Something exceptional could be waiting in the store.</p><button type="button" className="button button-solid" onClick={() => { setBagOpen(false); }}>KEEP BROWSING</button></div>
          : bag.map((line, i) => { const item = lineOf(line); return <div className="bag-line" key={`${line.id}-${line.colour}-${line.size}`}>
            <ProductImage src={item.image} alt={item.name}/>
            <div><h3>{item.href ? <Link to={item.href} onClick={() => { setBagOpen(false); }}>{item.name}</Link> : item.name}</h3><p>{item.colourName ? `${item.colourName.toUpperCase()} · ` : ''}SIZE {line.size}</p>{!item.available && <p className="field-error">No longer available</p>}
              <div className="bag-line-qty"><button type="button" disabled={!item.available} aria-label={`Decrease quantity of ${item.name}`} onClick={() => { updateLine(i, -1); }}><Minus size={12}/></button>{line.qty}<button type="button" disabled={!item.available} aria-label={`Increase quantity of ${item.name}`} onClick={() => { updateLine(i, 1); }}><Plus size={12}/></button></div>
              <button type="button" className="remove-line" onClick={() => { removeLine(i); }}>REMOVE</button></div>
            <strong>{item.available ? formatGHS(item.price * line.qty) : '—'}</strong>
          </div>; })}</div>
        {bag.length > 0 && <div className="drawer-bottom"><div className="subtotal"><span>SUBTOTAL</span><strong>{formatGHS(total)}</strong></div><p>Prices are refreshed from the local catalogue. Checkout remains a preview.</p><button type="button" className="button button-solid full" disabled={bag.some(line => !stockFor(line))} onClick={() => { setMode('checkout'); setStep(0); }}>TRY CHECKOUT</button></div>}
      </>}
      {checkout && <>
        <div className="checkout-steps">{steps.map((label, i) => <span key={label} className={i === step ? 'current' : ''}>{String(i + 1).padStart(2, '0')} {label}</span>)}</div>
        <div className="drawer-content checkout-content">
          {step === 0 && <form id="checkout-details" className="checkout-form" onSubmit={submitDetails}><p className="rtw-guest-note"><strong>Checking out as a guest.</strong> No account needed. Your details stay in this browser; this preview does not send them.</p>
            <label>FULL NAME<input name="name" autoComplete="name" required defaultValue={details.name}/></label>
            <label>EMAIL<input name="email" type="email" autoComplete="email" required defaultValue={details.email}/></label>
            <label>PHONE<input name="phone" type="tel" autoComplete="tel" required defaultValue={details.phone}/></label>
            <label>DELIVERY ADDRESS<input name="address" autoComplete="street-address" required defaultValue={details.address}/></label>
            <button className="button button-solid full" type="submit">CONTINUE</button></form>}
          {step === 1 && <><p>How would you like to receive your order?</p>{DELIVERY.map(option => <label className="choice" key={option}><input type="radio" name="delivery" checked={delivery === option} onChange={() => { setDelivery(option); }}/>{option}</label>)}</>}
          {step === 2 && <><p>Payment is not taken in this preview.</p>{PAYMENT.map(option => <label className="choice" key={option}><input type="radio" name="payment" checked={payment === option} onChange={() => { setPayment(option); }}/>{option}</label>)}</>}
          {step === 3 && <div className="checkout-review"><h3>DETAILS</h3><p>{details.name}<br/>{details.email}<br/>{details.phone}<br/>{details.address}</p><h3>DELIVERY</h3><p>{delivery}</p><h3>PAYMENT</h3><p>{payment}</p><h3>ITEMS</h3>{bag.map(line => { const item = lineOf(line); return <p key={`${line.id}-${line.colour}-${line.size}`}>{line.qty} × {item.name}{item.colourName ? `, ${item.colourName}` : ''} ({line.size})</p>; })}<div className="subtotal"><span>SUBTOTAL</span><strong>{formatGHS(total)}</strong></div></div>}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
        <div className="drawer-bottom">{step > 0 && <button type="button" className="back-link" onClick={() => { setStep(s => s - 1); setError(''); }}><ArrowLeft size={14}/> BACK</button>}{step === 0 ? <button type="button" className="back-link" onClick={() => { setMode('bag'); }}><ArrowLeft size={14}/> RETURN TO BAG</button> : <button type="button" className="button button-solid full" onClick={next}>{step === 3 ? 'PLACE ORDER (PREVIEW)' : 'CONTINUE'}</button>}</div>
      </>}
      {mode === 'done' && <div className="drawer-content drawer-empty"><Check size={42}/><h3>Preview complete.</h3><p>No order was placed and no payment was taken. Online ordering opens when the store goes live.</p><button type="button" className="button button-solid" onClick={() => { setBagOpen(false); }}>KEEP BROWSING</button></div>}
    </aside>
  </div>;
}

function AppContent() {
  const { toast, setBagOpen, setSearchOpen } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  // The main website's bag links here with ?bag=open to continue to checkout.
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('bag') !== 'open') return;
    setBagOpen(true);
    query.delete('bag');
    navigate({ pathname: location.pathname, search: query.toString() ? `?${query}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate, setBagOpen]);
  useEffect(() => {
    const onEscape = event => { if (event.key === 'Escape') { setBagOpen(false); setSearchOpen(false); } };
    window.addEventListener('keydown', onEscape);
    return () => { window.removeEventListener('keydown', onEscape); };
  }, [setBagOpen, setSearchOpen]);
  return <>
    <ScrollToTop/>
    <a href="#main" className="skip-link">Skip to content</a>
    <Header/>
    <SectionLinks/>
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/all" element={<ShopPage/>}/>
      <Route path="/:section" element={<ShopPage/>}/>
      <Route path="/collections" element={<CollectionsPage/>}/>
      <Route path="/collections/:id" element={<CollectionPage/>}/>
      <Route path="/product/:id" element={<ProductPage/>}/>
      <Route path="/saved" element={<SavedPage/>}/>
      <Route path="/rtw-store" element={<Navigate to="/all" replace/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>
    <Footer/>
    <SearchPanel/>
    <BagDrawer/>
    <div className="live-toast" role="status" aria-live="polite">{toast}</div>
  </>;
}

export default function App() { return <StoreProvider><AppContent/></StoreProvider>; }
