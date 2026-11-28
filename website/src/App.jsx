import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import SocialSection, { SocialIcons } from './SocialSection.jsx';
import ServicesPage from './ServicesPage.jsx';
import ContactPage, { AppointmentPage } from './ContactPage.jsx';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Instagram, MapPin, Pause, Play, UserRound } from 'lucide-react';
import AccountPage from './AccountPage.jsx';
import SearchPanel, { catalogueItems } from './SearchPanel.jsx';
import AppointmentReply from './AppointmentReply.jsx';
import { useCustomer } from './account.js';
import { ArrowLeft, ArrowRight, ChevronDown, Check, Heart, Menu, Minus, Plus, Search, ShoppingBag, X } from './NyIcons.jsx';
import { PRODUCTS, HERO_SLIDES, SERVICES, findProduct, formatGHS } from './catalog.js';
import DiscoverPage from './DiscoverPage.jsx';
import { headingParts, heroLink, useSiteHero } from './siteHeroes.jsx';
import { MAX_QTY, bagCount, bagTotal, readBag, sameLine, watchBag, writeBag } from './shared-bag.js';

const StoreContext = createContext(null);
const categories = ['All', 'Men', 'Women', 'Collections'];
const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
/**
 * The ready-to-wear shop is its own app (codebase/rtw-store) served inside this website at /shop
 * (on the preview, /home/shop). Links to it are ordinary page loads on the same address.
 */
const RTW_STORE_URL = `${import.meta.env.BASE_URL}shop`;
const RTW_IS_SEPARATE = true;
/** Website product ids that have a matching page in the store. */
const RTW_PRODUCT_PATHS = { 'aegis-set': '/product/aegis', 'amani-set': '/product/amani', 'arctic-edge-set': '/product/arctic', regal: '/men', 'effortless-elegance': '/women', 'dionny-black': '/women', 'dionny-wine': '/women' };
const RTW_CATEGORY_PATHS = { Men: '/men', Women: '/women', Collections: '/collections' };

/** Old /rtw-store links open the matching page in the shop. */
function RtwRedirect() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const target = id ? (RTW_PRODUCT_PATHS[id] ?? '/shop') : (RTW_CATEGORY_PATHS[params.get('category')] ?? '/');
  useEffect(() => { window.location.replace(`${RTW_STORE_URL}${target}`); }, [target]);
  return <main id="main" className="container not-found"><p className="eyebrow">THE SHOP</p><h1>Opening the <em>store…</em></h1><p><a href={`${RTW_STORE_URL}${target}`}>Continue to the shop</a></p></main>;
}

/** The main menu, the same in the shop. KEEP IN SYNC with MAIN_NAV in rtw-store/src/App.jsx. */
const navItems = [['Services', '/services'], ['RTW Store', '/rtw-store'], ['Appointment', '/appointment'], ['Contact', '/contact']];
const fallbackImage = '/images/editorial-fallback.svg';

/**
 * RTW Store in the main menu: hovering (or focusing) it opens a panel with the store's sections and two
 * featured tiles. KEEP IN SYNC with MegaMenu in rtw-store/src/App.jsx.
 */
const MEGA_LINKS = [{ text: 'Featured Collection', path: '' }, { text: 'New Arrivals', path: '/new' }, { text: 'Men', path: '/men' }, { text: 'Women', path: '/women' }, { text: 'Accessories', path: '/accessories' }, { text: 'Collections', path: '/collections' }, { text: 'All pieces', path: '/all' }];
function MegaMenu({ label }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 120); };
  return <div className={`nav-mega ${open ? 'is-open' : ''}`} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <a href={RTW_STORE_URL} className="nav-link" aria-expanded={open} aria-haspopup="true">{label}</a>
    <div className="mega-panel" hidden={!open}>
      <div className="container mega-inner">
        <div className="mega-links"><p className="eyebrow">THE RTW STORE</p>
          {MEGA_LINKS.map(({ text, path }) => <a key={path} href={`${RTW_STORE_URL}${path}`}>{text}<ArrowRight size={14}/></a>)}
        </div>
        <a href={`${RTW_STORE_URL}/men`} className="mega-tile"><img src="/images/home/for-him.webp" alt="" loading="lazy"/><span>For <em>him.</em></span></a>
        <a href={`${RTW_STORE_URL}/women`} className="mega-tile"><img src="/images/home/for-her.webp" alt="" loading="lazy"/><span>For <em>her.</em></span></a>
      </div>
    </div>
  </div>;
}

function useStoredState(key, initial) {
  const [state, setState] = useState(() => {
    try { const existing = localStorage.getItem(key); return existing ? JSON.parse(existing) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* private browsing */ } }, [key, state]);
  return [state, setState];
}
/**
 * The bag is shared with the RTW store (see shared-bag.js), so pieces added in the store show
 * on this site's bag icon, and the other way round. Guests need no account.
 */
function useSharedBag() {
  const [bag, setState] = useState(readBag);
  useEffect(() => watchBag(setState), []);
  const setBag = useCallback(update => { setState(current => writeBag(typeof update === 'function' ? update(current) : update)); }, []);
  return [bag, setBag];
}
function StoreProvider({ children }) {
  const [bag, setBag] = useSharedBag();
  const [favourites, setFavourites] = useStoredState('ny-atelier-demo-wishlist-v1', []);
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState('');
  const timeout = useRef(null);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const announce = useCallback(message => {
    setToast(message); clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setToast(''), 3500);
  }, []);
  const addToBag = useCallback((product, size, quantity) => {
    const line = { id: product.id, colour: 'default', size, qty: quantity, name: product.name, colourName: '', price: product.price, image: new URL(product.image, window.location.origin).href, store: 'website' };
    setBag(current => {
      const index = current.findIndex(item => sameLine(item, line));
      if (index < 0) return [...current, line];
      return current.map((item, i) => i === index ? { ...item, qty: Math.min(MAX_QTY, item.qty + quantity) } : item);
    });
    announce(`${product.name} added to your bag`);
    setBagOpen(true);
  }, [setBag, announce]);
  const updateLine = useCallback((index, delta) => setBag(current => current.map((line,i) => i===index ? {...line, qty:Math.min(MAX_QTY, line.qty+delta)} : line).filter(line=>line.qty>0)), [setBag]);
  const removeLine = useCallback(index => setBag(current => current.filter((_,i)=>i!==index)), [setBag]);
  const toggleFavourite = useCallback(id => setFavourites(current => current.includes(id) ? current.filter(x => x!==id) : [...current,id]), [setFavourites]);
  const total = useMemo(() => bagTotal(bag), [bag]);
  const value = {bag, favourites, bagOpen, setBagOpen, searchOpen, setSearchOpen, toast, announce, addToBag, updateLine, removeLine, toggleFavourite, total};
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
const useStore = () => useContext(StoreContext);

function ProductImage({ src, alt, className = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return <img src={failed ? fallbackImage : src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)}/>;
}
function ScrollToTop() {
  const {pathname} = useLocation();
  useEffect(() => { window.scrollTo({top:0, behavior:'instant'}); }, [pathname]);
  return null;
}
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [returningHome, setReturningHome] = useState(false);
  const homeAnimationTimer = useRef(null);
  const lastScrollY = useRef(0);
  const {bag, setBagOpen, setSearchOpen} = useStore();
  const customer = useCustomer();
  const location = useLocation();
  const home = location.pathname === '/';
  /** Pages that open on a full-screen hero: the header floats over it, then turns petrol once the hero is scrolled past. */
  const heroPage = home || location.pathname === '/services';
  useEffect(() => {
    const onScroll = () => {
      const nextY = window.scrollY;
      const delta = nextY - lastScrollY.current;
      const heroEnd = document.querySelector('.hero, .svc-hero')?.offsetHeight ?? window.innerHeight;
      setScrolled(heroPage ? nextY >= heroEnd : nextY > 40);
      if (nextY <= 40 || mobileOpen) setHidden(false);
      else if (Math.abs(delta) > 4) setHidden(delta > 0);
      lastScrollY.current = nextY;
    };
    lastScrollY.current = window.scrollY;
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [heroPage, mobileOpen]);
  useEffect(() => { setHidden(false); }, [location.pathname]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);
  useEffect(() => () => clearTimeout(homeAnimationTimer.current), []);
  const handleHomeClick = () => {
    clearTimeout(homeAnimationTimer.current);
    setReturningHome(true);
    homeAnimationTimer.current = setTimeout(() => setReturningHome(false), 1100);
  };
  const count = bagCount(bag);
  return <>
    <header className={`site-header ${heroPage ? 'site-header--home' : ''} ${heroPage && !scrolled ? 'site-header--transparent' : ''} ${scrolled ? 'site-header--scrolled' : ''} ${hidden ? 'site-header--hidden' : ''}`}>
      <nav className="site-nav container" aria-label="Main navigation">
        <button type="button" className="icon-btn mobile-only" aria-label="Open menu" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(x=>!x)}>{mobileOpen ? <X/> : <Menu/>}</button>
        <Link to="/" className={`wordmark ${returningHome ? 'is-returning-home' : ''}`} aria-label="NY Atelier home" onClick={handleHomeClick}><span className="brand-mark" aria-hidden="true"><span className="brand-wreath"/><span className="brand-letters"/></span><span className="wordmark-line"/><span>NY ATELIER</span></Link>
        <div className="nav-links">{navItems.map(([label,href])=>href==='/rtw-store'&&RTW_IS_SEPARATE?<MegaMenu key={href} label={label}/>:<NavLink key={href} to={href} end={href==='/'} className={({isActive})=>isActive?'nav-link active':'nav-link'}>{label}</NavLink>)}</div>
        <div className="nav-actions"><button className="icon-btn" type="button" aria-label="Search products" onClick={()=>setSearchOpen(true)}><Search/></button><Link className={`icon-btn account-button${customer?' is-signed-in':''}`} to="/account" aria-label={customer?'Your account':'Sign in'} title={customer?'Your account':'Sign in'}><UserRound/></Link><button className="icon-btn bag-button" type="button" aria-label={`Open shopping bag with ${count} items`} onClick={()=>setBagOpen(true)}><ShoppingBag/>{count>0&&<span className="bag-count">{count}</span>}</button></div>
      </nav>
      {mobileOpen && <nav className="mobile-menu" aria-label="Mobile navigation">{navItems.map(([label,href])=>href==='/rtw-store'&&RTW_IS_SEPARATE?<a key={href} href={RTW_STORE_URL}>{label}<ArrowRight size={15}/></a>:<NavLink key={href} to={href} end={href==='/'}>{label}<ArrowRight size={15}/></NavLink>)}<NavLink to="/account">{customer?'Your account':'Sign in'}<ArrowRight size={15}/></NavLink><span>CONSIDERED FASHION. DISTINCTLY NY.</span></nav>}
    </header>
  </>;
}
function Footer() {
  return <footer className="site-footer"><div className="footer-content"><div className="container footer-main"><div className="footer-lead"><Link to="/" className="footer-logo" aria-label="NY Atelier home"><span className="brand-mark" aria-hidden="true"><span className="brand-wreath"/><span className="brand-letters"/></span><span className="footer-logo-line" aria-hidden="true"/><span className="footer-logo-name">NY ATELIER</span></Link><p className="eyebrow">THE HOUSE OF NY</p><h2>Wear your <em>story.</em></h2><p>Contemporary expressions in fashion, made with intention.</p></div><div className="footer-columns"><div><h3>EXPLORE</h3><Link to="/">Home</Link><a href={RTW_STORE_URL}>RTW Store</a><Link to="/services">Services</Link><Link to="/appointment">Appointment</Link><Link to="/our-story">Our Story</Link></div><div><h3>LET'S CONNECT</h3><Link to="/contact">Contact</Link><Link to="/appointment">Book an Appointment</Link><span>Accra, Ghana</span><SocialIcons className="footer-socials"/></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} NY ATELIER</span><span>Powered by Work on dec.</span></div></div></footer>;
}
function Eyebrow({children, light=false}) { return <p className={`eyebrow ${light?'eyebrow-light':''}`}>{children}</p>; }
// One request for the public RTW catalogue, shared by the hero and the home picks.
let catalogueRequest = null;
function loadShopCatalogue() {
  if (!catalogueRequest) {
    const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
    catalogueRequest = fetch(`${base}/api/shop/catalogue`, { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Catalogue unavailable'); return response.json(); })
      .catch(error => { catalogueRequest = null; throw error; });
  }
  return catalogueRequest;
}
/** The collection NY Office has set to "Feature on website", with its campaign photos; null shows the original editorial slides. */
function useFeaturedCollection() {
  const [featured, setFeatured] = useState(null);
  useEffect(() => {
    let active = true;
    loadShopCatalogue().then(data => {
      const item = (data.collections ?? []).find(entry => entry.featuredOn?.website && entry.photos?.length);
      if (active && item) setFeatured({ id: item.id, title: item.title, copy: item.copy ?? '', photos: item.photos.map(photo => photo.src) });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return featured;
}
function Hero({ featured, custom }) {
  // A custom hero from the catalogue manager (Site heroes → Website home) comes first, then a featured collection.
  const video = custom?.style === 'video';
  const slides = custom ? custom.media.map(src => ({ image: src, portrait: src, alt: '' })) : featured ? featured.photos.map(src => ({ image: src, portrait: src, alt: `${featured.title}, NY Atelier collection` })) : HERO_SLIDES;
  const videos = useRef([]);
  const words = featured ? featured.title.trim().split(/\s+/) : [];
  const collectionHref = featured ? (RTW_IS_SEPARATE ? `${RTW_STORE_URL}/collections/${featured.id}` : '/rtw-store') : null;
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(() => new Set());
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setVisible(document.visibilityState === 'visible');
    updateMotion(); updateVisibility();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => { motion.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);
  useEffect(() => {
    const next = (index + 1) % slides.length;
    if (video || slides.length < 2 || !playing || !visible || reducedMotion || !loaded.has(index) || !loaded.has(next)) return;
    const timer = window.setTimeout(() => setIndex(next), 6000);
    return () => window.clearTimeout(timer);
  }, [index, loaded, playing, visible, reducedMotion]);
  // Videos play one after another: only the shown one runs, and it moves on when it ends.
  useEffect(() => {
    if (!video) return;
    videos.current.forEach((element, position) => { if (!element) return; if (position === index && playing && visible) { element.play().catch(() => {}); } else { element.pause(); if (position !== index) element.currentTime = 0; } });
  }, [video, index, playing, visible]);
  const heading = custom ? headingParts(custom.title) : null;
  const link = custom?.button ? heroLink(custom.button.to, RTW_STORE_URL) : null;
  return <section className={`hero${featured ? ' hero--collection' : ''}`} aria-label={featured ? `${featured.title} collection carousel` : 'NY Atelier ready-to-wear editorial carousel'}>
    <div className="hero-image">{video ? slides.map((slide, position) => <video key={`${slide.image}-${position}`} ref={element => { videos.current[position] = element; }} className={`hero-frame hero-video ${position === index ? 'is-active' : ''}`} src={slide.image} autoPlay={position === 0} muted loop={slides.length === 1} playsInline preload="metadata" onEnded={() => setIndex(i => (i + 1) % slides.length)} aria-hidden="true"/>) : slides.map((slide, position) => <picture className={`hero-frame ${position === index ? 'is-active' : ''}`} key={slide.image} aria-hidden={position !== index}>
      <source media="(max-width: 640px)" srcSet={slide.portrait}/>
      <img src={slide.image} alt={slide.alt} loading={position === 0 ? 'eager' : 'lazy'} fetchPriority={position === 0 ? 'high' : 'auto'} draggable="false" onLoad={() => setLoaded(previous => previous.has(position) ? previous : new Set([...previous, position]))}/>
    </picture>)}</div><div className="hero-overlay"/>
    <div className="container hero-content">{custom
      ? <div className="hero-copy-card">{custom.eyebrow && <Eyebrow>{custom.eyebrow}</Eyebrow>}<h1>{heading.lead}{heading.lead && <br/>}<em>{heading.accent}</em></h1>{custom.text && <p>{custom.text}</p>}{link && (link.href ? <a href={link.href} className="button button-outline">{custom.button.label}<ArrowRight size={17}/></a> : <Link to={link.to} className="button button-outline">{custom.button.label}<ArrowRight size={17}/></Link>)}</div>
      : featured
      ? <div className="hero-copy-card"><Eyebrow>FEATURED COLLECTION</Eyebrow><h1>{words.length > 1 ? words.slice(0, -1).join(' ') : 'The'}<br/><em>{words.at(-1)}.</em></h1>{featured.copy && <p>{featured.copy}</p>}{RTW_IS_SEPARATE ? <a href={collectionHref} className="button button-outline">SHOP THE COLLECTION<ArrowRight size={17}/></a> : <Link to={collectionHref} className="button button-outline">SHOP THE COLLECTION<ArrowRight size={17}/></Link>}</div>
      : <div className="hero-copy-card"><Eyebrow>THE READY-TO-WEAR EDIT</Eyebrow><h1>Meet the<br/><em>new pieces.</em></h1><p>Explore the latest additions to NY Atelier ready-to-wear.</p><Link to="/rtw-store" className="button button-outline">EXPLORE THE SHOP<ArrowRight size={17}/></Link></div>}</div>
    <div className="container hero-bottom"><span className="hero-location">NY ATELIER / ACCRA, GHANA</span>{slides.length > 1 && <div className="hero-controls"><button type="button" onClick={()=>setIndex(i=>(i+slides.length-1)%slides.length)} aria-label="Previous image"><ArrowLeft size={17}/></button><span aria-label={`Image ${index + 1} of ${slides.length}`}>{String(index+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</span><button type="button" onClick={()=>setIndex(i=>(i+1)%slides.length)} aria-label="Next image"><ArrowRight size={17}/></button>{!reducedMotion && <button type="button" className="hero-play-toggle" onClick={()=>setPlaying(value=>!value)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} aria-pressed={!playing}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button>}</div>}<span className="hero-scroll-cue"><span className="hero-scroll-long">SCROLL TO DISCOVER</span><span className="hero-scroll-short">SCROLL</span> ↓</span></div>
  </section>;
}
function ProductCard({product}) {
  const {favourites, toggleFavourite} = useStore();
  const active=favourites.includes(product.id);
  return <article className="product-card"><div className="product-image-wrap"><Link to={`/rtw-store/${product.id}`} aria-label={`View ${product.name}`}><ProductImage src={product.image} alt={product.name}/></Link><span className="product-tag">{product.tag}</span><button className={`wishlist ${active?'is-liked':''}`} type="button" aria-label={active?`Remove ${product.name} from wishlist`:`Save ${product.name} to wishlist`} aria-pressed={active} onClick={()=>toggleFavourite(product.id)}><Heart size={19} fill={active?'currentColor':'none'}/></button><Link to={`/rtw-store/${product.id}`} className="product-quick">VIEW DETAILS <ArrowRight size={15}/></Link></div><div className="product-details"><div><p>{product.collection}</p><Link to={`/rtw-store/${product.id}`}>{product.name}</Link></div><span>{formatGHS(product.price)}</span></div></article>;
}
function ProductGrid({products}) { return products.length ? <div className="product-grid">{products.map(product=><ProductCard key={product.id} product={product}/>)}</div> : <p className="empty-results">No pieces match this selection. Try another category or search.</p>; }
function SectionHeading({eyebrow, title, accent, action, to}) {const Arrow=ArrowRight;return <div className="section-heading"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title} <em>{accent}</em></h2></div>{action&&<Link className="text-link" to={to}>{action}<Arrow size={17}/></Link>}</div>;}
/** A store piece on the home page, styled like the RTW store's cards; it opens the piece in the store. */
function RtwPick({ piece }) {
  const href = RTW_IS_SEPARATE ? `${RTW_STORE_URL}/product/${piece.id}` : '/rtw-store';
  return <article className={`product-card${piece.second ? ' has-second-photo' : ''}`}>
    <div className="product-image-wrap">
      <a href={href} aria-label={`View ${piece.name} in the shop`}><ProductImage src={piece.image} alt={piece.name}/>{piece.second && <ProductImage src={piece.second} alt="" className="product-second-photo"/>}</a>
      {piece.badge && <span className={`rtw-badge-tag ${piece.offer ? 'rtw-badge-tag--offer' : ''}`}>{piece.badge}</span>}
      {piece.swatches.length > 0 && <span className="rtw-card-swatches" role="img" aria-label={`${piece.swatches.length} colours`}>{piece.swatches.slice(0, 3).map(colour => <i key={colour} style={{ background: colour }}/>)}{piece.swatches.length > 3 && <small>+{piece.swatches.length - 3}</small>}</span>}
    </div>
    <div className="product-details">
      <div><p>{piece.type?.toUpperCase() || 'READY-TO-WEAR'}</p><a href={href}>{piece.name}</a></div>
      <span className="rtw-price">{formatGHS(piece.price)}{piece.compareAt && <s>{formatGHS(piece.compareAt)}</s>}</span>
    </div>
  </article>;
}
/** The shop catalogue, loaded once for the home page's store sections. */
let shopCatalogue;
const loadShopOnce = () => (shopCatalogue ??= loadShopCatalogue().catch(error => { shopCatalogue = undefined; throw error; }));
/** Store pieces on the home page: `new` (just in) or `edit` (the rest of the range). Hides itself when there are none. */
function LiveRtwPicks({ show = 'edit' }) {
  const [state, setState] = useState({ status: 'loading', pieces: [] });
  useEffect(() => {
    let active = true;
    loadShopOnce()
      .then(data => {
        if (!active) return;
        if (!Array.isArray(data.products)) throw new Error('Catalogue incomplete');
        const pieces = data.products.filter(item => item.photos?.[0]?.src && Boolean(item.isNew) === (show === 'new')).slice(0, 4).map(item => ({
          id: item.id, name: item.name, type: item.type, image: item.photos[0].src, second: item.photos[1]?.src ?? null,
          price: (item.offerPriceMinor ?? item.priceMinor) / 100,
          compareAt: item.offerPriceMinor ? item.priceMinor / 100 : null,
          offer: Boolean(item.offerPriceMinor), badge: item.offerPriceMinor ? 'OFFER' : item.isNew ? 'NEW' : null,
          swatches: [...new Set((item.colours ?? []).map(colour => colour.swatch).filter(Boolean))],
        }));
        setState({ status: 'ready', pieces });
      })
      .catch(() => { if (active) setState({ status: 'error', pieces: [] }); });
    return () => { active = false; };
  }, [show]);
  if (show === 'new' && state.status !== 'ready') return null;
  if (state.status === 'loading') return <p className="rtw-catalogue-status" role="status">Loading pieces from the atelier catalogue…</p>;
  if (state.status === 'error') return <p className="rtw-catalogue-status" role="status">The RTW catalogue is unavailable right now. <a href={RTW_STORE_URL}>Visit the shop</a></p>;
  if (!state.pieces.length) return show === 'new' ? null : <p className="rtw-catalogue-status">No pieces are available to feature yet.</p>;
  return <div className="product-grid">{state.pieces.map(piece => <RtwPick key={piece.id} piece={piece}/>)}</div>;
}
/** New arrivals from the store, only when there are some. */
function JustIn() {
  return <LiveRtwSection eyebrow="JUST IN" title="New" accent="arrivals." action="VIEW ALL NEW PIECES" href={`${RTW_STORE_URL}/new`}/>;
}
function LiveRtwSection({ eyebrow, title, accent, action, href }) {
  const [hasPieces, setHasPieces] = useState(false);
  useEffect(() => { let active = true; loadShopOnce().then(data => { if (active) setHasPieces((data.products ?? []).some(item => item.isNew && item.photos?.[0]?.src)); }).catch(() => {}); return () => { active = false; }; }, []);
  if (!hasPieces) return null;
  return <section className="section featured-section"><div className="container"><div className="section-heading"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title} <em>{accent}</em></h2></div><a className="text-link" href={href}>{action}<ArrowRight size={17}/></a></div><LiveRtwPicks show="new"/></div></section>;
}
function Home() {
  const featured = useFeaturedCollection();
  const site = useSiteHero('website');
  return <main id="main">{site.ready ? <Hero key={site.hero ? 'custom' : featured?.id ?? 'edit'} featured={site.hero ? null : featured} custom={site.hero}/> : <section className="hero" aria-hidden="true"/>}<div className="home-after-hero"><div className="brand-strip"><span>ROOTED IN CULTURE</span><span>✳</span><span>MADE WITH INTENTION</span><span>✳</span><span>DESIGNED TO BE FELT</span></div>
    <section className="intro-section section container"><Eyebrow>THE NY POINT OF VIEW</Eyebrow><h2>Not simply what you wear.<br/><em>How you are remembered.</em></h2><p>NY Atelier brings considered craftsmanship and contemporary silhouettes together in a distinct expression of style. Every piece is part of a story — yours.</p></section>
    <section className="home-discover" aria-labelledby="home-discover-heading"><div className="home-discover-copy"><Eyebrow light>OUR STORY</Eyebrow><h2 id="home-discover-heading">The people behind <em>every piece.</em></h2><p>From the Accra workshop to the people guiding its work, discover the story of NY Atelier.</p><Link to="/our-story" className="button button-outline">OUR STORY <ArrowRight size={17}/></Link></div><div className="home-discover-image"><img src="/images/home/our-story.webp" alt="A groom in kente with his groomsmen in matching NY Atelier kaftans" loading="lazy"/></div></section>
    <section className="section container"><SectionHeading eyebrow="YOUR STYLE, YOUR EXPRESSION" title="Ready to" accent="wear." action="EXPLORE THE SHOP" to="/rtw-store"/><div className="category-grid"><Link to="/rtw-store?category=Men" className="category-card"><ProductImage src="/images/home/for-him.webp" alt="A client in a striped NY Atelier shirt"/><div><span>01 / MENSWEAR</span><h3>For <em>him.</em></h3><span>EXPLORE MENSWEAR <ArrowRight size={15}/></span></div></Link><Link to="/rtw-store?category=Women" className="category-card"><ProductImage src="/images/home/for-her.webp" alt="A client in an ivory NY Atelier trouser suit"/><div><span>02 / WOMENSWEAR</span><h3>For <em>her.</em></h3><span>EXPLORE WOMENSWEAR <ArrowRight size={15}/></span></div></Link></div></section>
    <JustIn/>
    <section className="section container"><SectionHeading eyebrow="THE RTW EDIT" title="Every" accent="piece." action="SHOP EVERYTHING" to="/rtw-store"/><LiveRtwPicks show="edit"/></section>
    <section className="container"><div className="rtw-bespoke">
      <div className="rtw-bespoke-image"><img src="/products/product-amani-cream-detail.webp" alt="" loading="lazy"/></div>
      <div className="rtw-bespoke-copy"><Eyebrow>MADE FOR YOU</Eyebrow><h2>Love a piece? <em>Make it yours.</em></h2><p>Any piece can begin a bespoke conversation: your measurements, your cloth, your details. The atelier will guide you from the first fitting to the final stitch.</p>
        <div className="rtw-bespoke-actions"><Link to="/appointment?service=bespoke" className="button button-solid">BOOK AN APPOINTMENT <ArrowRight size={17}/></Link><Link to="/services" className="svc-link">EXPLORE BESPOKE SERVICES <ArrowRight size={16}/></Link></div></div>
    </div></section>
    <section className="section container services-teaser"><SectionHeading eyebrow="A PERSONAL EXPERIENCE" title="The house of" accent="NY." action="DISCOVER SERVICES" to="/services"/><div className="teaser-grid">{SERVICES.slice(0,3).map(s=><article key={s.number}><span>{s.number}</span><h3>{s.name}</h3><p>{s.copy}</p><Link to="/appointment">ENQUIRE <ArrowRight size={14}/></Link></article>)}</div></section>
    <SocialSection/><section className="rtw-visit container">
      <div><MapPin size={22}/><div><Eyebrow>VISIT THE STORE</Eyebrow><h3>Try it on in Haatso, Accra.</h3><p>See the pieces in person at the NY Atelier RTW store.</p></div></div>
      <Link to="/contact#locations" className="svc-link">FIND THE STORE <ArrowRight size={16}/></Link>
    </section>
  </div></main>;
}
function StorePage() {
  const [params, setParams] = useSearchParams();
  const activeCategory = categories.includes(params.get('category')) ? params.get('category') : 'All';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const products=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const filtered = PRODUCTS.filter(p => (activeCategory==='All'|| (activeCategory==='Collections' ? ['Dionny','Signature Pieces'].includes(p.collection) : p.gender===activeCategory)) && (!q||`${p.name} ${p.collection} ${p.gender}`.toLowerCase().includes(q)));
    return [...filtered].sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:0);
  },[activeCategory, query, sort]);
  return <main id="main"><section className="page-intro container"><Eyebrow>THE RTW EDIT</Eyebrow><h1>Find your <em>expression.</em></h1><p>Ready-to-wear pieces selected for their presence, ease and individuality.</p></section>
    <section className="container store-section"><div className="shop-toolbar"><div className="category-tabs" role="group" aria-label="Filter ready-to-wear products">{categories.map(label=><button key={label} type="button" className={activeCategory===label?'active':''} aria-pressed={activeCategory===label} onClick={()=>setParams(label==='All'?{}:{category:label})}>{label}</button>)}</div><div className="sort-controls"><label className="visually-hidden" htmlFor="store-search">Search products</label><input id="store-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search pieces"/><label className="visually-hidden" htmlFor="sort-products">Sort products</label><select id="sort-products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div></div><div className="product-results"><span>{products.length} PIECES</span><p>Prices and availability are reference data, not live inventory.</p></div><ProductGrid products={products}/></section>
    <div className="store-footnote container">Discovering a new favourite? <Link to="/contact">Contact the atelier</Link> for enquiries about sizing, commissions or a personal appointment.</div></main>;
}
function ProductPage() {
  const {id}=useParams();const product=findProduct(id);const [size,setSize]=useState('');const [qty,setQty]=useState(1);const [error,setError]=useState(false);
  const {addToBag, favourites, toggleFavourite}=useStore();
  if(!product) return <NotFound/>;
  function handleAdd(){if(!size){setError(true);return;}addToBag(product,size,qty);setError(false);}
  return <main id="main" className="product-page"><div className="container product-breadcrumb"><Link to="/rtw-store">SHOP</Link><span>/</span><span>{product.name.toUpperCase()}</span></div><section className="container product-layout"><div className="product-gallery"><ProductImage src={product.image} alt={`${product.name} by NY Atelier`} loading="eager"/></div><div className="product-info"><Eyebrow>{product.collection}</Eyebrow><h1>{product.name}</h1><p className="product-price">{formatGHS(product.price)}</p><p className="product-description">{product.description}</p><div className="size-header"><span>SELECT SIZE</span><span>SIZE CHART COMING SOON</span></div><div className="size-selector">{sizes.map(s=><button key={s} type="button" aria-pressed={size===s} className={size===s?'selected':''} onClick={()=>{setSize(s);setError(false)}}>{s}</button>)}</div>{error&&<p className="field-error" role="alert">Please select a size to continue.</p>}<div className="product-qty"><span>QUANTITY</span><div><button type="button" aria-label="Decrease quantity" onClick={()=>setQty(n=>Math.max(1,n-1))}><Minus size={15}/></button><span>{qty}</span><button type="button" aria-label="Increase quantity" onClick={()=>setQty(n=>Math.min(25,n+1))}><Plus size={15}/></button></div></div><button type="button" className="button button-solid add-to-bag" onClick={handleAdd}>ADD TO BAG <ShoppingBag size={18}/></button><button type="button" className="favourite-inline" onClick={()=>toggleFavourite(product.id)}><Heart size={16} fill={favourites.includes(product.id)?'currentColor':'none'}/>{favourites.includes(product.id)?'SAVED TO WISHLIST':'ADD TO WISHLIST'}</button><div className="product-note">Product image, sizes, price and availability need confirmation with the atelier. Bag and checkout are demonstrations; no order or payment is placed.</div><Link className="text-link" to="/contact">ASK ABOUT THIS PIECE <ArrowRight size={16}/></Link></div></section><section className="section container"><SectionHeading eyebrow="MORE TO DISCOVER" title="Considered" accent="choices." to="/rtw-store" action="BACK TO SHOP"/><ProductGrid products={PRODUCTS.filter(p=>p.id!==product.id).slice(0,4)}/></section></main>;
}
function NotFound(){return <main className="container not-found" id="main"><Eyebrow>404 / NOT FOUND</Eyebrow><h1>This page has <em>moved.</em></h1><p>Find your way back to the NY Atelier experience.</p><Link className="button button-solid" to="/">RETURN HOME <ArrowRight size={17}/></Link></main>}
/** Pages of the website, the shop's sections and the services, for the search window. */
const SEARCH_PAGES = [
  { id: 'services', kind: 'page', title: 'Services', subtitle: 'Bespoke, couture, occasion wear and styling', to: '/services', fields: [['Services', 10], ['bespoke custom couture occasion styling wardrobe fabric alteration', 3]] },
  ...SERVICES.map(service => ({ id: `service-${service.number}`, kind: 'page', title: service.name, subtitle: 'Service', to: '/services', fields: [[service.name, 10], [service.copy, 1.5], ['service', 2]] })),
  { id: 'appointment', kind: 'page', title: 'Book an appointment', subtitle: 'Consultations and fittings at the atelier or by video', to: '/appointment', fields: [['Book an appointment', 10], ['booking consultation fitting measurement visit video call schedule', 4]] },
  { id: 'story', kind: 'page', title: 'Our story', subtitle: 'The house of NY Atelier', to: '/our-story', fields: [['Our story', 10], ['about house history founder atelier brand', 4]] },
  { id: 'contact', kind: 'page', title: 'Contact', subtitle: 'Phone, email, WhatsApp and directions', to: '/contact', fields: [['Contact', 10], ['phone email whatsapp call location address directions map accra kwabenya haatso hours', 4]] },
  { id: 'account', kind: 'page', title: 'Your account', subtitle: 'Sign in to see orders and appointments', to: '/account', fields: [['Your account', 10], ['sign in login orders track order delivery status appointments profile', 4]] },
  ...MEGA_LINKS.filter(link => link.path).map(link => ({ id: `shop-${link.path}`, kind: 'page', title: link.text, subtitle: 'RTW Store', href: `${RTW_STORE_URL}${link.path}`, fields: [[link.text, 10], ['shop store ready to wear rtw', 2]] })),
];
const SEARCH_POPULAR = ['Sets', 'Shirts', 'Trousers', 'Women', 'Men'];
const loadSearchItems = () => loadShopCatalogue().then(data => catalogueItems(data, { productLink: id => ({ href: `${RTW_STORE_URL}/product/${id}` }), collectionLink: id => ({ href: `${RTW_STORE_URL}/collections/${id}` }) }));
function SiteSearch() {
  const { searchOpen, setSearchOpen } = useStore();
  return <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} load={loadSearchItems} pages={SEARCH_PAGES} popular={SEARCH_POPULAR} formatPrice={formatGHS}
    seeAll={query => `${RTW_STORE_URL}/all?q=${encodeURIComponent(query)}`} label="Search NY Atelier" placeholder="Search pieces, collections, services…"/>;
}
function BagDrawer(){const {bag,bagOpen,setBagOpen,updateLine,removeLine,total}=useStore();const [mode,setMode]=useState('bag');const [step,setStep]=useState(0);const [details,setDetails]=useState({name:'',email:'',phone:'',address:''});const [delivery,setDelivery]=useState('');const [payment,setPayment]=useState('');const [error,setError]=useState('');
  useEffect(()=>{if(!bagOpen){setMode('bag');setStep(0);setError('')}},[bagOpen]);
  useEffect(()=>{const handler=e=>{if(e.key==='Escape')setBagOpen(false)};window.addEventListener('keydown',handler);return ()=>window.removeEventListener('keydown',handler)},[setBagOpen]);
  if(!bagOpen)return null;
  const isCheckout=mode==='checkout';
  const heading=mode==='done'?'Thank you.':isCheckout?'Checkout demonstration.':'Your shopping bag.';
  const steps=['Delivery details','Delivery method','Payment','Review'];
  function next(){if(step===1&&!delivery){setError('Select a delivery method.');return;}if(step===2&&!payment){setError('Select a demo payment method.');return;}setError('');if(step===3){setMode('done');return;}setStep(s=>s+1)}
  function detailsSubmit(e){e.preventDefault();const form=new FormData(e.currentTarget);setDetails(Object.fromEntries(form.entries()));setStep(1);setError('')}
  return <div className="modal-backdrop drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setBagOpen(false)}}><aside className="bag-drawer" role="dialog" aria-modal="true" aria-label={heading}><div className="drawer-head"><div><Eyebrow>{isCheckout?'NON-TRANSACTIONAL DEMO':mode==='done'?'DEMONSTRATION COMPLETE':'YOUR SELECTION'}</Eyebrow><h2>{heading}</h2></div><button type="button" aria-label="Close bag" className="icon-btn" onClick={()=>setBagOpen(false)}><X/></button></div>
    {mode==='bag'&&<><div className="drawer-content">{bag.length===0?<div className="drawer-empty"><ShoppingBag size={35}/><h3>Your bag is empty.</h3><p>Something exceptional could be waiting in the collection.</p>{RTW_IS_SEPARATE?<a className="button button-solid" href={RTW_STORE_URL}>VISIT THE SHOP <ArrowRight size={17}/></a>:<button className="button button-solid" onClick={()=>setBagOpen(false)}>EXPLORE THE STORE</button>}</div>:bag.map((line,i)=>{const name=line.name??'Ready-to-wear piece';return <div className="bag-line" key={`${line.id}-${line.colour}-${line.size}`}><ProductImage src={line.image??fallbackImage} alt={name}/><div><h3>{RTW_IS_SEPARATE&&line.store==='rtw'?<a href={`${RTW_STORE_URL}/product/${line.id}?colour=${line.colour}`}>{name}</a>:name}</h3><p>{line.colourName?`${line.colourName.toUpperCase()} · `:''}SIZE {line.size}</p><div className="bag-line-qty"><button type="button" aria-label={`Decrease quantity of ${name}`} onClick={()=>updateLine(i,-1)}><Minus size={12}/></button>{line.qty}<button type="button" aria-label={`Increase quantity of ${name}`} onClick={()=>updateLine(i,1)}><Plus size={12}/></button></div><button type="button" className="remove-line" onClick={()=>removeLine(i)}>REMOVE</button></div><strong>{formatGHS((line.price??0)*line.qty)}</strong></div>})}</div>{bag.length>0&&<div className="drawer-bottom"><div className="subtotal"><span>SUBTOTAL</span><strong>{formatGHS(total)}</strong></div>{RTW_IS_SEPARATE?<><p>Your bag is the same in the shop. Checkout happens there; no account is needed.</p><a className="button button-solid full" href={`${RTW_STORE_URL}/?bag=open`}>CHECKOUT IN THE SHOP <ArrowRight size={17}/></a></>:<><p>Delivery, taxes and inventory are not calculated. This is a non-transactional demonstration.</p><button className="button button-solid full" onClick={()=>{setMode('checkout');setStep(0)}}>TRY CHECKOUT</button></>}</div>}</>}
    {isCheckout&&<><div className="checkout-steps">{steps.map((label,i)=><span key={label} className={i===step?'current':''}>{String(i+1).padStart(2,'0')} {label}</span>)}</div><div className="drawer-content checkout-content">{step===0&&<form id="checkout-details" className="checkout-form" onSubmit={detailsSubmit}><p>These details stay in this browser. Nothing is submitted.</p><label>FULL NAME<input name="name" autoComplete="name" required defaultValue={details.name}/></label><label>EMAIL<input name="email" type="email" autoComplete="email" required defaultValue={details.email}/></label><label>PHONE<input name="phone" type="tel" autoComplete="tel" required defaultValue={details.phone}/></label><label>DELIVERY ADDRESS<input name="address" autoComplete="street-address" required defaultValue={details.address}/></label><button className="button button-solid full" type="submit">CONTINUE</button></form>}
    {step===1&&<><p>Select your preferred fulfilment method for the demo.</p>{['Pickup from atelier (details to confirm)','Delivery (quote to be confirmed)'].map(x=><label className="choice" key={x}><input type="radio" name="delivery" checked={delivery===x} onChange={()=>setDelivery(x)}/>{x}</label>)}</>}
    {step===2&&<><p>These payment choices are simulated. No money is collected.</p>{['MTN MoMo','Telecel Cash','AT Money','Visa / Mastercard','Bank transfer','Pay on delivery / pickup'].map(x=><label className="choice" key={x}><input type="radio" name="payment" checked={payment===x} onChange={()=>setPayment(x)}/>{x} <span>DEMO</span></label>)}</>}
    {step===3&&<div className="checkout-review"><p>Review this demonstration. Finishing will not place an actual order.</p><h3>DELIVERY DETAILS</h3><p>{details.name}<br/>{details.email}<br/>{details.phone}<br/>{details.address}</p><h3>DELIVERY METHOD</h3><p>{delivery}</p><h3>PAYMENT CHOICE</h3><p>{payment} · SIMULATED</p><h3>ITEMS</h3>{bag.map(line=><p key={`${line.id}-${line.colour}-${line.size}`}>{line.qty} × {line.name} ({line.size})</p>)}<div className="subtotal"><span>DEMO SUBTOTAL</span><strong>{formatGHS(total)}</strong></div></div>}{error&&<p className="field-error" role="alert">{error}</p>}</div><div className="drawer-bottom">{step>0&&<button className="back-link" onClick={()=>{setStep(s=>s-1);setError('')}}><ArrowLeft size={14}/> BACK</button>}{step===0?<button className="back-link" onClick={()=>setMode('bag')}><ArrowLeft size={14}/> RETURN TO BAG</button>:<button className="button button-solid full" onClick={next}>{step===3?'FINISH DEMO':'CONTINUE'}</button>}</div></>}
    {mode==='done'&&<div className="drawer-content drawer-empty"><Check size={42}/><h3>Demonstration complete.</h3><p>No order was placed, no stock reserved and no payment initiated.</p><button className="button button-solid" onClick={()=>setBagOpen(false)}>CONTINUE EXPLORING</button></div>}
  </aside></div>;
}
/** Consultations are now appointments; old links keep working. */
function ConsultationRedirect(){const location=useLocation();return <Navigate to={`/appointment${location.search}`} replace/>;}
function AppContent(){const {toast,setBagOpen,setSearchOpen}=useStore();const location=useLocation();useEffect(()=>{const onEscape=e=>{if(e.key==='Escape'){setBagOpen(false);setSearchOpen(false)}};window.addEventListener('keydown',onEscape);return()=>window.removeEventListener('keydown',onEscape)},[setBagOpen,setSearchOpen]);useEffect(()=>{document.body.style.overflow='';return()=>{document.body.style.overflow=''}},[location]);return <><ScrollToTop/><a href="#main" className="skip-link">Skip to content</a><div id="top"/><Header/><Routes><Route path="/" element={<Home/>}/><Route path="/rtw-store" element={RTW_IS_SEPARATE?<RtwRedirect/>:<StorePage/>}/><Route path="/rtw-store/:id" element={RTW_IS_SEPARATE?<RtwRedirect/>:<ProductPage/>}/><Route path="/services" element={<ServicesPage/>}/><Route path="/our-story" element={<DiscoverPage/>}/><Route path="/discover-us" element={<Navigate to="/our-story" replace/>}/><Route path="/appointment" element={<AppointmentPage/>}/><Route path="/appointment/reply" element={<AppointmentReply/>}/><Route path="/consultation" element={<ConsultationRedirect/>}/><Route path="/contact" element={<ContactPage/>}/><Route path="/account" element={<AccountPage/>}/><Route path="*" element={<NotFound/>}/></Routes><Footer/><SiteSearch/><BagDrawer/><div className="live-toast" role="status" aria-live="polite">{toast}</div></>}
export default function App(){return <StoreProvider><AppContent/></StoreProvider>}
