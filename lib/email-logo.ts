// Email-compatible logo utilities
// This creates a data URI for email embedding

export const emailLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1d4ed8"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="32" fill="url(#grad)"/>
  <g transform="translate(16, 16)">
    <rect x="4" y="4" width="3" height="24" fill="white"/>
    <rect x="4" y="4" width="18" height="3" fill="white"/>
    <rect x="4" y="14.5" width="14" height="3" fill="white"/>
    <rect x="4" y="25" width="18" height="3" fill="white"/>
    <circle cx="26" cy="8" r="2" fill="white"/>
    <circle cx="26" cy="16" r="2" fill="white"/>
    <circle cx="26" cy="24" r="2" fill="white"/>
    <rect x="22" y="7" width="4" height="1" fill="white"/>
    <rect x="18" y="15" width="8" height="1" fill="white"/>
    <rect x="22" y="23" width="4" height="1" fill="white"/>
  </g>
</svg>
`).toString('base64')}`;

export const emailLogoPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="; // Placeholder - replace with actual PNG base64
