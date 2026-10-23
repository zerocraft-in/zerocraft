// @ts-nocheck
/**
 * Procedural SVG artwork for posters, tees, hoodies, frames, mugs and more.
 * Placeholder art: swap <Art/> for next/image product photos when you have real mockups.
 * ids are prefixed per render so multiple SVGs on a page never collide.
 */
export const PL = [
  ["#8E0F17", "#E0452B", "#F2B705", "#120C0A", "#F3EAD3"],
  ["#F2B705", "#F7DB7C", "#B3121B", "#120C0A", "#F3EAD3"],
  ["#0B2A3A", "#2E7D8C", "#F2B705", "#07141C", "#F3EAD3"],
  ["#2A0F3D", "#D9486B", "#F2B705", "#12071C", "#F7EBD9"],
  ["#18301F", "#C9A24A", "#E8452C", "#0A150D", "#F3EAD3"],
  ["#0E0B09", "#5E0A10", "#F2B705", "#050303", "#F3EAD3"],
];
const TC = {
  black: "#141010",
  red: "#A5121B",
  mustard: "#E9A90E",
  bone: "#EADFC6",
  charcoal: "#2A2522",
};
function createArt(pre) {
  let n = 0;
  function P(p, v, t, s) {
    const i = pre + "g" + n++,
      [a, b, c, d, e] = p;
    let x = `<defs><linearGradient id="${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="300" height="400" fill="url(#${i})"/>`;
    if (v == 0)
      x += `<circle cx="190" cy="150" r="62" fill="${c}"/><path d="M0 280L90 190L160 260L230 170L300 280V400H0Z" fill="${d}" opacity=".85"/><path d="M0 320L70 260L150 310L240 240L300 320V400H0Z" fill="${d}"/>`;
    if (v == 1) {
      x += `<circle cx="80" cy="90" r="38" fill="${e}" opacity=".9"/>`;
      for (let k = 0; k < 9; k++) {
        const h = 70 + ((k * 53) % 110);
        x += `<rect x="${k * 34 - 4}" y="${330 - h}" width="34" height="${h + 80}" fill="${d}"/><rect x="${k * 34 + 6}" y="${340 - h}" width="6" height="8" fill="${c}"/><rect x="${k * 34 + 18}" y="${362 - h}" width="6" height="8" fill="${c}"/>`;
      }
    }
    if (v == 2) {
      for (let k = 0; k < 14; k++) {
        const q = (k * Math.PI) / 7;
        x += `<path d="M150 190L${150 + 400 * Math.cos(q)} ${190 + 400 * Math.sin(q)}L${150 + 400 * Math.cos(q + 0.2)} ${190 + 400 * Math.sin(q + 0.2)}Z" fill="${c}" opacity=".35"/>`;
      }
      x += `<circle cx="150" cy="150" r="28" fill="${d}"/><path d="M95 330Q150 175 205 330Z" fill="${d}"/>`;
    }
    if (v == 3) {
      x += `<circle cx="150" cy="230" r="70" fill="${c}"/><rect y="230" width="300" height="170" fill="${d}"/>`;
      for (let k = 0; k < 5; k++)
        x += `<path d="M0 ${250 + k * 22}Q75 ${240 + k * 22} 150 ${250 + k * 22}T300 ${250 + k * 22}" stroke="${e}" stroke-opacity=".25" fill="none"/>`;
      x += `<path d="M235 340Q225 250 245 170" stroke="${d}" stroke-width="7" fill="none"/><path d="M245 170Q205 150 180 185Q215 165 245 170ZM245 170Q290 140 300 175Q270 155 245 170ZM245 170Q250 125 215 110Q240 140 245 170Z" fill="${d}"/>`;
    }
    if (v == 4)
      x += `<circle cx="170" cy="150" r="80" fill="${c}"/><path d="M0 400L110 210L220 400Z" fill="${d}"/><path d="M110 400L200 280L300 400Z" fill="${e}" opacity=".35"/><path d="M0 0H300L0 150Z" fill="${d}" opacity=".5"/>`;
    if (v == 5) {
      const L = t.split("|");
      x += L.map(
        (l, k) =>
          `<text x="150" y="${135 + k * 74}" text-anchor="middle" font-size="${l.length > 7 ? 50 : 68}" fill="${k % 2 ? c : e}" font-family="Anton,Noto Sans Tamil,Noto Sans Malayalam" font-weight="700">${l}</text>`,
      ).join("");
      t = "";
    }
    return (
      x +
      `<rect width="300" height="400" filter="url(#gr)" opacity=".28"/><rect y="300" width="300" height="100" fill="${d}" opacity=".55"/><text x="150" y="24" text-anchor="middle" font-size="8" letter-spacing="3" fill="${e}" opacity=".8" font-family="Space Mono">PADAM CLUB ORIGINAL</text>` +
      (t
        ? `<text x="150" y="354" text-anchor="middle" font-size="31" letter-spacing="1" fill="${e}" font-family="Anton">${t.toUpperCase()}</text>`
        : "") +
      (s
        ? `<text x="150" y="378" text-anchor="middle" font-size="13" fill="${c}" font-family="Noto Sans Tamil,Noto Sans Malayalam" font-weight="700">${s}</text>`
        : "")
    );
  }
  const A = (x, y, w, h, p) =>
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 300 400">${P(PL[p.pal], p.v, p.t, p.s)}</svg>`;
  const PLANT = `<g fill="#5b6b3a"><path d="M36 452Q14 370 56 326Q48 390 68 452Z"/><path d="M58 452Q92 380 72 306Q112 380 92 452Z"/></g><path d="M30 450h66l-8 46H38z" fill="#d8cdbb"/>`;
  function S(p) {
    const w = p.ty;
    let g = "";
    if (w == "poster")
      g =
        `<rect x="70" y="62" width="260" height="346" fill="#fbf7ee" filter="url(#sh)"/>` +
        A(80, 72, 240, 320, p) +
        PLANT;
    else if (w == "frame")
      g =
        `<rect x="58" y="48" width="284" height="384" fill="#a8723e" filter="url(#sh)"/><rect x="66" y="56" width="268" height="368" fill="#8a5a2c"/><rect x="78" y="68" width="244" height="344" fill="#f6f0e4"/>` +
        (p.col
          ? [0, 1, 2, 3]
              .map((k) =>
                A(92 + (k % 2) * 108, 84 + (k > 1) * 144, 100, 133, {
                  ...p,
                  pal: (p.pal + k) % 6,
                  v: (p.v + k) % 5,
                  t: "",
                  s: "",
                }),
              )
              .join("")
          : A(98, 88, 204, 272, p) +
            `<text x="200" y="392" text-anchor="middle" font-size="10" fill="#8a7d6a" font-family="Space Mono" letter-spacing="3">SCENE NO. 01</text>`) +
        PLANT;
    else if (w == "tee" || w == "hoodie") {
      const c = TC[p.col || "black"];
      g =
        `<path d="M130 80L90 100L50 170L95 195L115 165V420H285V165L305 195L350 170L310 100L270 80Q200 125 130 80Z" fill="${c}" filter="url(#sh)"/>` +
        (w == "hoodie"
          ? `<path d="M150 84Q200 6 250 84Q200 138 150 84Z" fill="${c}" stroke="rgba(255,255,255,.14)" stroke-width="3"/><path d="M135 345H265L280 415H120Z" fill="rgba(0,0,0,.22)"/>`
          : "") +
        `${PRN(p)}`;
    } else if (w == "tote")
      g = `<path d="M150 150Q150 55 200 55Q250 55 250 150" fill="none" stroke="#c9b48a" stroke-width="10"/><rect x="95" y="140" width="210" height="290" fill="#eee3cd" filter="url(#sh)"/><g transform="translate(0,52)">${PRN(p)}</g>`;
    else if (w == "mug")
      g = `<path d="M285 215Q345 215 345 285Q345 345 285 345" fill="none" stroke="#f1e7d3" stroke-width="22"/><path d="M115 170H285V395Q285 425 255 425H145Q115 425 115 395Z" fill="#f1e7d3" filter="url(#sh)"/><g clip-path="url(#cm)">${A(115, 215, 170, 227, { ...p, t: "", s: "" })}</g>`;
    else if (w == "stick")
      g =
        `<rect x="40" y="70" width="320" height="360" fill="#c9a97a" filter="url(#sh)"/>` +
        [0, 1, 2, 3]
          .map((k) => {
            const q = PL[(p.pal + k) % 6],
              X = (k % 2) * 170,
              Y = (k > 1) * 165;
            return `<g transform="rotate(${[-6, 5, 4, -4][k]} ${130 + X} ${160 + Y})"><rect x="${58 + X}" y="${90 + Y}" width="145" height="145" rx="20" fill="${q[4]}"/><circle cx="${130 + X}" cy="${150 + Y}" r="34" fill="${q[2]}"/><path d="M${70 + X} ${225 + Y}L${130 + X} ${170 + Y}L${195 + X} ${225 + Y}Z" fill="${q[3]}"/></g>`;
          })
          .join("");
    else
      g =
        `<rect x="26" y="36" width="348" height="430" rx="20" fill="#0d0a12" filter="url(#sh)"/>` +
        A(66, 66, 268, 357, p) +
        `<rect x="130" y="436" width="140" height="20" rx="10" fill="#d9ff4f"/><text x="200" y="450" text-anchor="middle" font-size="9" font-weight="700" fill="#111" font-family="Space Mono" letter-spacing="1.5">INSTANT DOWNLOAD</text>`;
    return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice"><rect width="400" height="500" fill="${p.bg || "url(#wl)"}"/><rect y="450" width="400" height="50" fill="rgba(0,0,0,.07)"/>${g}</svg>`;
  }

  const PRN = (p) => {
    if (p.v != 5)
      return `<g clip-path="url(#cc)">${A(135, 157, 130, 173, { ...p, t: "", s: "" })}</g>`;
    const q = PL[p.pal],
      L = p.t.split("|");
    return (
      L.map(
        (l, k) =>
          `<text x="200" y="${205 + k * 42}" text-anchor="middle" font-size="${l.length > 6 ? 32 : 42}" fill="${k % 2 ? p.ink2 || q[2] : p.ink || q[4]}" font-family="Anton,Noto Sans Tamil,Noto Sans Malayalam" font-weight="700">${l}</text>`,
      ).join("") +
      `<text x="200" y="${222 + L.length * 42}" text-anchor="middle" font-size="8" fill="${p.ink || q[4]}" font-family="Space Mono" letter-spacing="3">PADAM CLUB</text>`
    );
  };
  return { P, S };
}
export const productArt = (p, key = "") => createArt(`${key}${p.id}-`).S(p);
export const posterInner = (p, key) => {
  const a = createArt(`${key}-`);
  return a.P(PL[p.pal], p.v, p.t, p.s);
};
