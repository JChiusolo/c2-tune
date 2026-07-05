/**
 * Tiny inline SVG icon components — no external dependency.
 * Replaces lucide-react entirely to eliminate the 'vehicle-assessment'
 * registry lookup crash that occurs in certain lucide-react versions.
 */
const props = (size, rest) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', ...rest,
});

export const IconZap          = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
export const IconAlertTriangle= ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
export const IconAlertCircle  = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
export const IconCheck        = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><polyline points="20 6 9 17 4 12"/></svg>;
export const IconCopy         = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
export const IconPrinter      = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
export const IconDownload     = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
export const IconRefreshCw    = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
export const IconMail         = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
export const IconExternalLink = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
export const IconClock        = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
export const IconTrash        = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
export const IconChevronRight = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><polyline points="9 18 15 12 9 6"/></svg>;
export const IconWrench       = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
export const IconTarget       = ({ size = 16, color, style }) => <svg {...props(size, { color, style })}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
