import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { ArrowRight, Search, X } from './NyIcons.jsx';
import { buildIndex, forgetSearches, highlight, recentSearches, rememberSearch, searchIndex } from './search.js';

/**
 * The search window. KEEP IN SYNC: website/src/SearchPanel.jsx and rtw-store/src/SearchPanel.jsx are the same file.
 *
 * Props:
 * - open, onClose
 * - load(): Promise<{ products, collections }> of result items (loaded once, when first opened)
 * - pages: result items for pages of the site
 * - seeAll(query): link to every matching piece in the shop; onSeeAll(query), when given, opens it in the app instead
 * - label, placeholder
 * A result item: { id, kind: 'piece' | 'collection' | 'page', title, subtitle, image?, price?, compareAt?, badge?,
 *   fields: [[text, weight], …], to? (in-app route) | href? (page load) }.
 */
export default function SearchPanel({ open, onClose, load, pages = [], seeAll, onSeeAll, popular = [], label = 'Search', placeholder = 'Search…', formatPrice }) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ status: 'idle', products: [], collections: [] });
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState([]);
  const input = useRef(null);
  const list = useRef(null);
  const navigate = useNavigate();
  const ids = useId();

  useEffect(() => {
    if (!open) { setQuery(''); setActive(-1); return undefined; }
    setRecent(recentSearches());
    const previous = document.activeElement;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => input.current?.focus());
    if (data.status === 'idle' || data.status === 'error') {
      setData(current => ({ ...current, status: 'loading' }));
      load().then(result => setData({ status: 'ready', products: result.products ?? [], collections: result.collections ?? [] }))
        .catch(() => setData(current => ({ ...current, status: 'error' })));
    }
    return () => { document.body.style.overflow = ''; if (previous instanceof HTMLElement) previous.focus(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const indexes = useMemo(() => ({ products: buildIndex(data.products), collections: buildIndex(data.collections), pages: buildIndex(pages) }), [data.products, data.collections, pages]);
  const text = query.trim();
  const pieces = useMemo(() => text ? searchIndex(indexes.products, text, { boost: item => (item.soldOut ? -3 : 0) + (item.isNew ? 0.5 : 0) }) : [], [indexes, text]);
  const collections = useMemo(() => text ? searchIndex(indexes.collections, text, { limit: 3 }) : [], [indexes, text]);
  const pageHits = useMemo(() => text ? searchIndex(indexes.pages, text, { limit: 4 }) : [], [indexes, text]);
  const shownPieces = pieces.slice(0, 6);
  const newIn = useMemo(() => data.products.filter(item => item.isNew && !item.soldOut).slice(0, 4), [data.products]);

  // Everything that can be chosen with the arrow keys, in screen order.
  const options = text
    ? [...shownPieces, ...(pieces.length ? [{ id: 'see-all', kind: 'all' }] : []), ...collections, ...pageHits]
    : [...recent.map(term => ({ id: `recent-${term}`, kind: 'term', term })), ...popular.map(term => ({ id: `popular-${term}`, kind: 'term', term })), ...newIn];
  useEffect(() => { setActive(-1); }, [text]);
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!open) return null;

  const optionId = item => `${ids}-${item.kind}-${item.id}`.replace(/[^a-zA-Z0-9_-]/g, '');
  const close = () => { onClose(); };
  function choose(item) {
    if (!item) return;
    if (item.kind === 'term') { setQuery(item.term); input.current?.focus(); return; }
    if (text) { rememberSearch(text); }
    if (item.kind === 'all') { if (onSeeAll) onSeeAll(text); else window.location.assign(seeAll(text)); return; }
    close();
    if (item.to) navigate(item.to); else if (item.href) window.location.assign(item.href);
  }
  function onKeyDown(event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => (index + 1) % Math.max(options.length, 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => (index <= 0 ? options.length : index) - 1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (active >= 0) choose(options[active]);
      else if (text && pieces.length) choose({ kind: 'all' });
      else if (text) choose(collections[0] ?? pageHits[0]);
    } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); event.nativeEvent.stopImmediatePropagation(); if (query) setQuery(''); else close(); }
  }
  const isActive = item => active >= 0 && options[active] === item;
  const optionProps = item => ({ id: optionId(item), role: 'option', 'aria-selected': isActive(item), 'data-active': isActive(item), onMouseDown: event => event.preventDefault(), onClick: () => choose(item), onMouseMove: () => { const at = options.indexOf(item); if (at !== active) setActive(at); } });
  const nothing = text && !pieces.length && !collections.length && !pageHits.length;
  const Title = ({ value }) => highlight(value, text).map((part, index) => part.hit ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>);

  return <div className="modal-backdrop search-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="search-modal" role="dialog" aria-modal="true" aria-label={label}>
      <div className="search-bar">
        <Search size={20} aria-hidden="true"/>
        <input ref={input} type="search" role="combobox" aria-expanded={options.length > 0} aria-controls={`${ids}-list`} aria-autocomplete="list"
          aria-activedescendant={active >= 0 && options[active] ? optionId(options[active]) : undefined} aria-label={label} placeholder={placeholder}
          value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown} autoComplete="off" autoCorrect="off" spellCheck="false" enterKeyHint="search"/>
        {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); input.current?.focus(); }}><X size={16}/></button>}
        <button type="button" className="search-close" onClick={close}>Close</button>
      </div>

      <div className="search-body" id={`${ids}-list`} role="listbox" aria-label="Search results" ref={list}>
        {!text && <>
          {recent.length > 0 && <section className="search-group">
            <div className="search-group-head"><h2>Recent</h2><button type="button" className="search-text-button" onClick={() => { forgetSearches(); setRecent([]); }}>Clear</button></div>
            <div className="search-chips">{options.filter(item => item.id.startsWith('recent-')).map(item => <button key={item.id} type="button" className="search-chip" {...optionProps(item)}><Clock size={13} aria-hidden="true"/>{item.term}</button>)}</div>
          </section>}
          {popular.length > 0 && <section className="search-group">
            <div className="search-group-head"><h2>Popular</h2></div>
            <div className="search-chips">{options.filter(item => item.id.startsWith('popular-')).map(item => <button key={item.id} type="button" className="search-chip" {...optionProps(item)}>{item.term}</button>)}</div>
          </section>}
          {newIn.length > 0 && <section className="search-group">
            <div className="search-group-head"><h2>New in</h2></div>
            <div className="search-tiles">{newIn.map(item => <button key={item.id} type="button" className="search-tile" {...optionProps(item)}>
              <span className="search-tile-image"><img src={item.image} alt="" loading="lazy"/></span><span className="search-tile-name">{item.title}</span>{formatPrice && <span className="search-price">{formatPrice(item.price)}</span>}
            </button>)}</div>
          </section>}
          {data.status === 'loading' && !newIn.length && <p className="search-note" role="status">Loading the collection…</p>}
        </>}

        {text && <>
          {shownPieces.length > 0 && <section className="search-group">
            <div className="search-group-head"><h2>Pieces <span>{pieces.length}</span></h2></div>
            {shownPieces.map(item => <button key={item.id} type="button" className="search-row" {...optionProps(item)}>
              <span className="search-thumb"><img src={item.image} alt="" loading="lazy"/></span>
              <span className="search-row-text"><span className="search-row-title"><Title value={item.title}/></span><small>{item.subtitle}</small></span>
              <span className="search-row-end">
                {item.badge && <span className={`search-badge search-badge--${item.badge.tone}`}>{item.badge.label}</span>}
                {formatPrice && <span className="search-price">{item.compareAt ? <><s>{formatPrice(item.compareAt)}</s> </> : null}{formatPrice(item.price)}</span>}
              </span>
            </button>)}
            <button type="button" className="search-see-all" {...optionProps(options.find(item => item.kind === 'all'))}>
              {pieces.length > shownPieces.length ? `See all ${pieces.length} pieces` : pieces.length === 1 ? 'See it in the shop' : `See these ${pieces.length} pieces in the shop`}<ArrowRight size={15}/>
            </button>
          </section>}
          {collections.length > 0 && <section className="search-group">
            <div className="search-group-head"><h2>Collections</h2></div>
            {collections.map(item => <button key={item.id} type="button" className="search-row" {...optionProps(item)}>
              <span className="search-thumb search-thumb--wide"><img src={item.image} alt="" loading="lazy"/></span>
              <span className="search-row-text"><span className="search-row-title"><Title value={item.title}/></span><small>{item.subtitle}</small></span>
              <ArrowRight size={15} className="search-row-arrow" aria-hidden="true"/>
            </button>)}
          </section>}
          {pageHits.length > 0 && <section className="search-group">
            <div className="search-group-head"><h2>Pages</h2></div>
            {pageHits.map(item => <button key={item.id} type="button" className="search-row search-row--page" {...optionProps(item)}>
              <span className="search-row-text"><span className="search-row-title"><Title value={item.title}/></span><small>{item.subtitle}</small></span>
              <ArrowRight size={15} className="search-row-arrow" aria-hidden="true"/>
            </button>)}
          </section>}
          {nothing && <div className="search-empty" role="status">
            <p>No results for <strong>“{text}”</strong>.</p>
            <p className="search-note">{data.status === 'error' ? 'The collection could not be loaded. Check your connection and try again.' : 'Check the spelling, or try a type (sets, shirts, trousers) or a colour.'}</p>
            {popular.length > 0 && <div className="search-chips">{popular.map(term => <button key={term} type="button" className="search-chip" onClick={() => { setQuery(term); input.current?.focus(); }}>{term}</button>)}</div>}
          </div>}
          {data.status === 'loading' && !pieces.length && <p className="search-note" role="status">Loading the collection…</p>}
        </>}
      </div>
      <p className="search-keys" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
    </div>
  </div>;
}

/** Turn the public catalogue (GET /api/shop/catalogue) into search items. `productLink(id)` / `collectionLink(id)` give each a target. */
export function catalogueItems(data, { productLink, collectionLink, fallbackImage = '/images/editorial-fallback.svg' }) {
  const sections = { men: 'Men', women: 'Women', accessories: 'Accessories' };
  const inCollections = new Map();
  for (const collection of data.collections ?? []) for (const id of collection.productIds ?? []) inCollections.set(id, [...(inCollections.get(id) ?? []), collection.title]);
  const products = (data.products ?? []).map(item => {
    const colours = item.colours ?? [];
    const soldOut = colours.length > 0 && colours.every(colour => (colour.sizes ?? []).every(size => size.availability === 'sold_out'));
    const image = colours.find(colour => colour.photos?.length)?.photos[0]?.src ?? item.photos?.[0]?.src ?? fallbackImage;
    const price = (item.offerPriceMinor ?? item.priceMinor) / 100;
    const compareAt = item.offerPriceMinor ? item.priceMinor / 100 : null;
    const colourNames = colours.map(colour => colour.name).filter(name => name && name !== 'As shown');
    const subtitle = [sections[item.section] ?? null, item.type && item.type !== 'Other' ? item.type : null, colourNames.length > 1 ? `${colourNames.length} colours` : colourNames[0] ?? null].filter(Boolean).join(' · ');
    return {
      id: item.id, kind: 'piece', title: item.name, subtitle: subtitle || 'Ready-to-wear', image, price, compareAt, soldOut, isNew: item.isNew === true,
      badge: soldOut ? { label: 'Sold out', tone: 'stock' } : compareAt ? { label: `−${Math.round((1 - price / compareAt) * 100)}%`, tone: 'offer' } : item.isNew ? { label: 'New', tone: 'new' } : null,
      fields: [[item.name, 10], [item.type ?? '', 5], [sections[item.section] ?? '', 5], [colourNames.join(' '), 4], [(inCollections.get(item.id) ?? []).join(' '), 4], [item.description ?? '', 1.2]],
      ...productLink(item.id),
    };
  });
  const collections = (data.collections ?? []).map(item => ({
    id: item.id, kind: 'collection', title: item.title, subtitle: `${(item.productIds ?? []).length} pieces`,
    image: item.cover?.src ?? item.photos?.[0]?.src ?? fallbackImage,
    fields: [[item.title, 10], ['collection', 3], [item.copy ?? '', 1.2]],
    ...collectionLink(item.id),
  }));
  return { products, collections };
}
