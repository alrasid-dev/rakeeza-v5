/** Minimal line/solid icons matching Rakeeza dark-login reference style */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, className, ...rest }: P) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', className, 'aria-hidden': true as const, ...rest };
}

export function IconPillar(props: P) {
  const p = base(props);
  return (
    <svg {...p}>
      <rect x="4" y="3" width="16" height="2.2" rx="0.6" fill="currentColor" />
      <rect x="6" y="6" width="12" height="1.6" rx="0.4" fill="currentColor" />
      <rect x="7" y="8.2" width="2.2" height="9" rx="0.4" fill="currentColor" />
      <rect x="10.9" y="8.2" width="2.2" height="9" rx="0.4" fill="currentColor" />
      <rect x="14.8" y="8.2" width="2.2" height="9" rx="0.4" fill="currentColor" />
      <rect x="6" y="17.8" width="12" height="1.6" rx="0.4" fill="currentColor" />
      <rect x="4" y="20" width="16" height="2.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export function IconHome(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export function IconForms(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function IconLibrary(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5a1 1 0 0 1 1-1h3v16H5a1 1 0 0 1-1-1zM10 20V4h4v16h-4zM16 20V4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3z" />
    </svg>
  );
}

export function IconAdmin(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </svg>
  );
}

export function IconSun(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </svg>
  );
}

export function IconMoon(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" />
    </svg>
  );
}

export function IconFingerprint(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 11v4.5M8.5 10.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5v2" />
      <path d="M6 12.2c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M5 15c.4 3.2 3 5.5 7 5.5s6.6-2.3 7-5.5" />
    </svg>
  );
}

export function IconChevron(props: P & { open?: boolean }) {
  const { open, ...rest } = props;
  const p = base(rest);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${p.className || ''} transition-transform ${open ? 'rotate-90' : ''}`}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconCc(props: P) {
  const p = base(props);
  return (
    <svg {...p} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="11" rx="1.5" />
      <path d="M7 9h6M7 12h4" />
      <path d="M19 8v9a1.5 1.5 0 0 1-1.5 1.5H8" />
    </svg>
  );
}
