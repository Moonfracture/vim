// Inline SVG icon set (stroke-based, currentColor). No emoji as UI controls.
const S = ({ children, size = 18, ...p }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);

export const Icon = {
  compass: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5l-2 5-5 2 2-5z" /></S>,
  cap: (p) => <S {...p}><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></S>,
  search: (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></S>,
  spark: (p) => <S {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></S>,
  coin: (p) => <S {...p}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></S>,
  moon: (p) => <S {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></S>,
  tree: (p) => <S {...p}><path d="M12 22v-5M8 13l4-9 4 9zM6 17l6-11 6 11z" /></S>,
  bag: (p) => <S {...p}><path d="M6 7h12l1 13H5zM9 7V5a3 3 0 0 1 6 0v2" /></S>,
  globe: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></S>,
  leaf: (p) => <S {...p}><path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 16-9 0 11-4 16-9 16zM4 20c4-6 9-9 9-9" /></S>,
  trophy: (p) => <S {...p}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></S>,
  chat: (p) => <S {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></S>,
  send: (p) => <S {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></S>,
  users: (p) => <S {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5a3 3 0 0 1 0 6M22 20a6.5 6.5 0 0 0-5-6.3" /></S>,
  upload: (p) => <S {...p}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></S>,
  arrow: (p) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>,
  drag: (p) => <S {...p}><circle cx="9" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="15" cy="18" r="1.2" /></S>,
  star: (p) => <S {...p}><path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.3L12 17.7 6.4 20.5l1.2-6.3L3 9.9l6.3-.8z" /></S>,
  pin: (p) => <S {...p}><path d="M12 21s-7-5.7-7-11a7 7 0 0 1 14 0c0 5.3-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></S>,
  close: (p) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>,
  check: (p) => <S {...p}><path d="M20 6L9 17l-5-5" /></S>,
  heart: (p) => <S {...p}><path d="M12 21C5 16 3 12 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 12 19 16 12 21z" /></S>,
  calc: (p) => <S {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4M8 19h4" /></S>,
  plus: (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>,
  menu: (p) => <S {...p}><path d="M4 6h16M4 12h16M4 18h16" /></S>,
};

export const Flag = ({ iso2, className = '' }) => (
  <img
    src={`https://flagcdn.com/w80/${(iso2 || 'un').toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/w160/${(iso2 || 'un').toLowerCase()}.png 2x`}
    alt=""
    loading="lazy"
    className={`inline-block rounded-[3px] object-cover shadow ${className}`}
  />
);
