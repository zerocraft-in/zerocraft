import React from 'react';
import type { Art } from '@/lib/products';

const LOGO =
  'M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z';

export function Logo({ size = 38, color = '#EFB033', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={LOGO} fill={color} />
    </svg>
  );
}

const BURST = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 32; i++) {
    const r = i % 2 === 0 ? 50 : 41;
    const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  return 'M' + pts.join(' L') + 'Z';
})();

export function Burst({ fill = '#C23B22', className, style }: { fill?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className} style={style}>
      <path d={BURST} fill={fill} />
    </svg>
  );
}

export function Reel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className} style={style}>
      <circle cx="60" cy="60" r="56" fill="#1C1411" />
      <circle cx="60" cy="60" r="56" fill="none" stroke="#EFB033" strokeWidth="3" />
      <g fill="#F0E2C3">
        <circle cx="60" cy="28" r="12" /><circle cx="88" cy="44" r="12" /><circle cx="88" cy="76" r="12" />
        <circle cx="60" cy="92" r="12" /><circle cx="32" cy="76" r="12" /><circle cx="32" cy="44" r="12" /><circle cx="60" cy="60" r="9" />
      </g>
    </svg>
  );
}

export function Clap({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 110" aria-hidden="true" className={className} style={style}>
      <rect x="6" y="38" width="108" height="66" rx="6" fill="#1C1411" />
      <g className="clap-arm" style={{ transformOrigin: '8px 38px' }}>
        <g transform="rotate(-14 8 38)">
          <rect x="6" y="14" width="108" height="22" rx="4" fill="#F0E2C3" />
          <path d="M26 14l-12 22M52 14 40 36M78 14 66 36M104 14 92 36" stroke="#1C1411" strokeWidth="9" />
        </g>
      </g>
      <rect x="6" y="38" width="108" height="14" fill="#F0E2C3" />
      <path d="M20 38l-10 14M46 38 36 52M72 38 62 52M98 38 88 52" stroke="#1C1411" strokeWidth="8" />
      <g stroke="#F0E2C3" strokeWidth="2.5" strokeLinecap="round"><path d="M18 66h40M18 78h28M18 90h50" /></g>
      <text x="86" y="92" fontFamily="Anton" fontSize="18" fill="#EFB033">07</text>
    </svg>
  );
}

export function Corn({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 120" aria-hidden="true" className={className} style={style}>
      <g fill="#F0E2C3" stroke="#1C1411" strokeWidth="2.5">
        <circle cx="28" cy="40" r="14" /><circle cx="72" cy="40" r="14" /><circle cx="50" cy="30" r="16" />
        <circle cx="38" cy="22" r="10" fill="#EFB033" /><circle cx="64" cy="20" r="10" fill="#EFB033" />
      </g>
      <path d="M16 50h68l-9 64H25z" fill="#F0E2C3" stroke="#1C1411" strokeWidth="3" />
      <path d="M33 52l3 60M50 52v60M67 52l-3 60" stroke="#C23B22" strokeWidth="9" />
    </svg>
  );
}

export function Poster({ v }: { v: 1 | 2 | 3 }) {
  const label = { fontFamily: 'Space Mono', fontWeight: 700 } as const;
  if (v === 1)
    return (
      <svg viewBox="0 0 300 420" role="img" aria-label="Chaya Kada poster">
        <rect width="300" height="420" fill="#EFB033" />
        <circle cx="150" cy="175" r="150" fill="none" stroke="#E2762F" strokeWidth="300" strokeDasharray="39.27 39.27" opacity=".5" />
        <circle cx="150" cy="170" r="72" fill="#C23B22" />
        <circle cx="150" cy="170" r="72" fill="none" stroke="#F0E2C3" strokeWidth="3" strokeDasharray="3 7" />
        <path d="M0 420V300h30v-50h26v40h22v-80h30v60h20v-24h28v64h24v-44h26v70h30v-30h24v94z" fill="#1C1411" />
        <rect x="18" y="18" width="264" height="384" fill="none" stroke="#1C1411" strokeWidth="3" />
        <text x="150" y="52" textAnchor="middle" {...label} fontSize="11" letterSpacing="4" fill="#1C1411">ZEROCRAFT PRESENTS</text>
        <text x="150" y="362" textAnchor="middle" fontFamily="Anton" fontSize="50" fill="#F0E2C3">CHAYA KADA</text>
        <text x="150" y="388" textAnchor="middle" {...label} fontSize="10" letterSpacing="3" fill="#EFB033">A TAMIL · MALAYALAM STORY</text>
      </svg>
    );
  if (v === 2)
    return (
      <svg viewBox="0 0 300 420" role="img" aria-label="Midnight Show poster">
        <rect width="300" height="420" fill="#1F5F66" />
        <circle cx="150" cy="150" r="82" fill="#F0E2C3" />
        <circle cx="182" cy="130" r="70" fill="#1F5F66" />
        <path d="M0 250h300v26H0z" fill="#EFB033" />
        <path d="M0 284h300v18H0z" fill="#C23B22" />
        <path d="M0 310h300v10H0z" fill="#F0E2C3" />
        <g fill="#F0E2C3" opacity=".9"><circle cx="40" cy="50" r="3" /><circle cx="250" cy="70" r="2.5" /><circle cx="64" cy="120" r="2" /><circle cx="240" cy="190" r="3" /><circle cx="30" cy="200" r="2" /></g>
        <rect x="18" y="18" width="264" height="384" fill="none" stroke="#F0E2C3" strokeWidth="3" />
        <text x="150" y="52" textAnchor="middle" {...label} fontSize="11" letterSpacing="4" fill="#F0E2C3">MATINEE SPECIAL</text>
        <text x="150" y="366" textAnchor="middle" fontFamily="Anton" fontSize="52" fill="#EFB033">MIDNIGHT</text>
        <text x="150" y="394" textAnchor="middle" fontFamily="Anton" fontSize="26" letterSpacing="8" fill="#F0E2C3">SHOW</text>
      </svg>
    );
  return (
    <svg viewBox="0 0 300 420" role="img" aria-label="Kuthu poster">
      <rect width="300" height="420" fill="#C23B22" />
      <circle cx="150" cy="190" r="150" fill="none" stroke="#F0E2C3" strokeWidth="300" strokeDasharray="39.27 39.27" opacity=".22" />
      <path d="M60 330q0-96 90-96t90 96z" fill="#1C1411" />
      <circle cx="150" cy="186" r="40" fill="#1C1411" />
      <rect x="116" y="176" width="30" height="14" rx="7" fill="#EFB033" />
      <rect x="154" y="176" width="30" height="14" rx="7" fill="#EFB033" />
      <path d="M0 330h300v90H0z" fill="#1C1411" />
      <rect x="18" y="18" width="264" height="384" fill="none" stroke="#F0E2C3" strokeWidth="3" />
      <text x="150" y="52" textAnchor="middle" {...label} fontSize="11" letterSpacing="4" fill="#F0E2C3">FIRST DAY FIRST SHOW</text>
      <text x="150" y="382" textAnchor="middle" fontFamily="Anton" fontSize="58" fill="#EFB033">KUTHU</text>
      <text x="150" y="402" textAnchor="middle" {...label} fontSize="9" letterSpacing="3" fill="#F0E2C3">THE MASS ENTERTAINER</text>
    </svg>
  );
}

export function PosterFrame({ v, className = '', style }: { v: 1 | 2 | 3; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`pf ${className}`} style={style}>
      <Poster v={v} />
    </div>
  );
}

type G = { kind: 'tee' | 'hood' | 'tote'; tc: string; p: string; q: string };
export function Garment({ kind, tc, p, q }: G) {
  return (
    <svg viewBox="0 0 200 200" className="garment" aria-hidden="true">
      {kind === 'tee' && (
        <>
          <path fill={tc} d="M70 22 22 48l18 40 26-10v100h68V78l26 10 18-40-48-26q-30 28-60 0z" />
          <circle cx="100" cy="102" r="24" fill={p} />
          <path fill={q} d="M78 156l5-32h9l4-14h8l4 14h9l5 32z" />
        </>
      )}
      {kind === 'hood' && (
        <>
          <path fill={tc} d="M68 18 20 46l18 44 28-10v104h68V80l28 10 18-44-48-28q-8 36-32 36t-32-36z" />
          <path d="M76 150h48l6 22H70z" fill="rgba(255,255,255,.12)" />
          <circle cx="100" cy="106" r="20" fill={p} />
          <path fill={q} d="M82 140l4-26h7l3-10h8l3 10h7l4 26z" />
        </>
      )}
      {kind === 'tote' && (
        <>
          <path d="M86 56a14 14 0 0 1 28 0" fill="none" stroke={tc} strokeWidth="8" />
          <path fill={tc} d="M44 60h112l10 124H34z" />
          <circle cx="100" cy="116" r="24" fill={p} />
        </>
      )}
    </svg>
  );
}

export function ProductTile({ art, className = '' }: { art: Art; className?: string }) {
  const bg = { background: art.bg } as React.CSSProperties;
  if (art.kind === 'pack')
    return (
      <div className={`pt pack ${className}`} style={bg}>
        {art.left === 'tee' ? (
          <Garment kind="tee" tc={art.tc} p={art.p} q={art.q} />
        ) : (
          <div className="pt-poster framed"><Poster v={2} /></div>
        )}
        <div className="pt-poster"><Poster v={art.poster} /></div>
      </div>
    );
  if ('poster' in art)
    return (
      <div className={`pt ${className}`} style={bg}>
        <div className={`pt-poster ${art.kind === 'frame' ? 'framed' : ''}`}><Poster v={art.poster} /></div>
      </div>
    );
  return (
    <div className={`pt ${className}`} style={bg}>
      <Garment kind={art.kind} tc={art.tc} p={art.p} q={art.q} />
    </div>
  );
}
