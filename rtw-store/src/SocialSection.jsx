import { Facebook, Instagram } from 'lucide-react';
import { ArrowUpRight } from './NyIcons.jsx';

/** Profiles shown as "follow" links. A profile without a confirmed address is left out rather than guessed. */
export const SOCIALS = [
  { name: 'Instagram', handle: '@ny_atelier_', url: 'https://www.instagram.com/ny_atelier_/', Icon: Instagram },
  { name: 'TikTok', handle: '@nyatelier', url: 'https://www.tiktok.com/@nyatelier', Icon: TikTokIcon },
  { name: 'Facebook', handle: 'NY Atelier', url: 'https://web.facebook.com/profile.php?id=100063302764394', Icon: Facebook },
].filter(social => social.url);

function TikTokIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/></svg>;
}

/** A row of plain one-colour social icons (used in the footer). */
export function SocialIcons({ className = 'social-icons' }) {
  return <div className={className}>
    {SOCIALS.map(({ name, handle, url, Icon }) => <a key={name} href={url} target="_blank" rel="noreferrer" aria-label={`${name} ${handle} (opens in a new tab)`} title={name}><Icon size={18}/></a>)}
  </div>;
}

/** Home: follow links for each social profile. */
export default function SocialSection() {
  return <section className="social-section section" aria-labelledby="social-heading">
    <div className="container">
      <div className="social-head">
        <div>
          <p className="eyebrow">FOLLOW THE HOUSE</p>
          <h2 id="social-heading">Follow our <em>socials.</em></h2>
          <p>New pieces, fittings and the people behind them, as they happen.</p>
        </div>
        <div className="social-links">
          {SOCIALS.map(({ name, handle, url, Icon }) => <a key={name} href={url} target="_blank" rel="noreferrer" aria-label={`${name}: ${handle} (opens in a new tab)`}>
            <Icon size={18}/><span><strong>{name}</strong><small>{handle}</small></span><ArrowUpRight size={15}/>
          </a>)}
        </div>
      </div>
    </div>
  </section>;
}
