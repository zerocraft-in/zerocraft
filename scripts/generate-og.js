const sharp = require('sharp');
const path = require('path');

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="25%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#D4FF00" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#080808" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  
  <rect width="1200" height="630" fill="#09090B"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Brand Monogram -->
  <g transform="translate(100, 110)">
    <rect width="84" height="84" rx="20" fill="#D4FF00"/>
    <path fill="#09090B" d="M18 16 h48 l-36 40 h36 v12 h-50 l36 -40 h-34 Z"/>
  </g>

  <!-- Typography -->
  <text x="100" y="275" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="#F4F4F5" letter-spacing="-1.5">ZEROCRAFT STUDIO</text>
  <text x="100" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="600" fill="#D4FF00" letter-spacing="-0.5">Creative Development Agency</text>
  
  <text x="100" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#A1A1AA">Branding · Web Development · UI/UX Design · Video &amp; Print</text>

  <!-- Location Badge -->
  <g transform="translate(100, 480)">
    <rect width="250" height="44" rx="22" fill="rgba(255,255,255,0.06)" stroke="rgba(212,255,0,0.3)" stroke-width="1.5"/>
    <text x="24" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#D4FF00">📍 TENKASI, INDIA</text>
  </g>

  <!-- Domain -->
  <text x="1100" y="510" text-anchor="end" font-family="monospace" font-size="20" font-weight="600" fill="#71717A">ZEROCRAFT.IN</text>
</svg>
`;

sharp(Buffer.from(svg))
  .jpeg({ quality: 92 })
  .toFile(path.join(__dirname, '../public/og-image.jpg'))
  .then(() => console.log('public/og-image.jpg generated!'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
