import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({ width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...p });

export const HelpIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" /><circle cx="12" cy="17.5" r=".6" fill="currentColor" /></svg>
);
export const GearIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const ExpandIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
);
export const ShrinkIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m15 18-6-6 6-6" /></svg>);
export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>);
export const PadIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 11h4M8 9v4M15 12h.01M18 10h.01M17.32 5H6.68a4 4 0 0 0-3.98 3.6 60 60 0 0 0-.3 7.4c.1 1.2 1.2 2 2.4 2 .9 0 1.7-.5 2.2-1.3L8 15h8l1 1.7c.5.8 1.3 1.3 2.2 1.3 1.2 0 2.3-.8 2.4-2a60 60 0 0 0-.3-7.4A4 4 0 0 0 17.32 5z" /></svg>
);
export const KeyboardIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6" /></svg>
);
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m5 12 5 5L20 7" /></svg>);

/** Emblem mark used until the real logo arrives (see image-requests.md). */
export const Emblem = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <radialGradient id="emblem-g" cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="#ffb36b" />
        <stop offset="0.55" stopColor="#ff5b6e" />
        <stop offset="1" stopColor="#1f5d6b" />
      </radialGradient>
    </defs>
    <path d="M32 4 L37.5 24 L55 13 L42.5 30 L61 34 L42.5 38 L53 57 L37.5 42 L32 61 L26.5 42 L11 57 L21.5 38 L3 34 L21.5 30 L9 13 L26.5 24 Z" fill="url(#emblem-g)" />
    <circle cx="32" cy="34" r="7.5" fill="#eefaf6" />
    <circle cx="32" cy="34" r="3.4" fill="#07202a" />
  </svg>
);
