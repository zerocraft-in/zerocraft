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


  <!-- Brand Monogram -->
  <g transform="translate(100,110) scale(3.5)"><path fill="#D3FF00" d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z"/></g>

  <!-- Typography -->
  <text x="100" y="275" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="#F4F4F5" letter-spacing="-1.5">ZEROCRAFT STUDIO</text>
  <text x="100" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="600" fill="#D4FF00" letter-spacing="-0.5">Creative &amp; Digital Studio</text>
  
  <text x="100" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#A1A1AA">Branding · Digital Experiences · Photography · Film &amp; Motion</text>

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
