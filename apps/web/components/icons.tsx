import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}
export function SearchIcon(p: IconProps){return <IconBase {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></IconBase>}
export function HeartIcon(p: IconProps){return <IconBase {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></IconBase>}
export function BagIcon(p: IconProps){return <IconBase {...p}><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></IconBase>}
export function MenuIcon(p: IconProps){return <IconBase {...p}><path d="M4 7h16M4 12h16M4 17h16"/></IconBase>}
export function ChevronRight(p: IconProps){return <IconBase {...p}><path d="m9 18 6-6-6-6"/></IconBase>}
export function ArrowRight(p: IconProps){return <IconBase {...p}><path d="M5 12h14M13 6l6 6-6 6"/></IconBase>}
export function TruckIcon(p: IconProps){return <IconBase {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></IconBase>}
export function UserIcon(p: IconProps){return <IconBase {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></IconBase>}
export function StarIcon(p: IconProps){return <IconBase {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></IconBase>}
export function MessageIcon(p: IconProps){return <IconBase {...p}><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></IconBase>}
export function BellIcon(p: IconProps){return <IconBase {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></IconBase>}
export function SendIcon(p: IconProps){return <IconBase {...p}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></IconBase>}
