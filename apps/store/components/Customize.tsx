"use client";
import { useState } from "react";
import "./customize.css";

type Kind = "tee" | "hood" | "tote" | "poster";
type ArtKey = "sun" | "skyline" | "reel" | "none";

const PRODUCTS: {
  key: Kind;
  label: string;
  price: number;
  sizes: string[];
  note: string;
}[] = [
  {
    key: "tee",
    label: "Tee",
    price: 799,
    sizes: ["S", "M", "L", "XL", "XXL"],
    note: "240 GSM cotton",
  },
  {
    key: "hood",
    label: "Hoodie",
    price: 1399,
    sizes: ["M", "L", "XL", "XXL"],
    note: "380 GSM fleece",
  },
  {
    key: "tote",
    label: "Tote",
    price: 449,
    sizes: ["One size"],
    note: "12 oz canvas",
  },
  {
    key: "poster",
    label: "Poster",
    price: 349,
    sizes: ["A4", "A3", "A2"],
    note: "300 GSM matte",
  },
];
const COLORS = [
  { name: "Black", hex: "#1C1411" },
  { name: "Cream", hex: "#F0E2C3" },
  { name: "Mustard", hex: "#EFB033" },
  { name: "Tomato", hex: "#C23B22" },
  { name: "Teal", hex: "#1F5F66" },
];
const ARTS: { key: ArtKey; label: string }[] = [
  { key: "sun", label: "Sunrise" },
  { key: "skyline", label: "Temple" },
  { key: "reel", label: "Film reel" },
  { key: "none", label: "Text only" },
];
const IDEAS = ["Thalaiva", "Adipoli", "First show", "Mass", "Chaya kada"];

export type CustomConfig = {
  kind: Kind;
  color: string;
  art: ArtKey;
  text: string;
  size: string;
  price: number;
};

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function wrapLines(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= 10) cur = (cur + " " + w).trim();
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const SHAPES: Record<Kind, { ty: number; s: number; ay: number; w: number }> = {
  tee: { ty: 150, s: 1, ay: 104, w: 80 },
  hood: { ty: 140, s: 1, ay: 100, w: 78 },
  tote: { ty: 166, s: 1.15, ay: 112, w: 104 },
  poster: { ty: 150, s: 1.7, ay: 78, w: 100 },
};

function Preview({
  kind,
  color,
  art,
  text,
}: {
  kind: Kind;
  color: string;
  art: ArtKey;
  text: string;
}) {
  const dark = lum(color) < 0.3;
  const ink = dark ? "#F0E2C3" : "#1C1411";
  const acc = dark ? "#EFB033" : "#C23B22";
  const empty = !text.trim();
  const lines = wrapLines(empty ? "Your line" : text.toUpperCase());
  const longest = Math.max(...lines.map((l) => l.length));
  const sh = SHAPES[kind];
  const f =
    (longest <= 6 ? 22 : longest <= 8 ? 18 : 15) *
    (kind === "poster" ? 1.15 : 1);
  const est = longest * f * 0.46;
  const tl = est > sh.w ? sh.w : undefined;
  const gap = f + 3;
  const y0 = sh.ty - ((lines.length - 1) * gap) / 2;
  return (
    <svg
      viewBox="0 0 200 200"
      className="cz-svg"
      role="img"
      aria-label={`${kind} preview with the text ${empty ? "Your line" : text}`}
    >
      <ellipse cx="100" cy="193" rx="62" ry="5" fill="rgba(0,0,0,.35)" />
      <g
        className="cz-body"
        style={{ fill: color }}
        stroke="rgba(0,0,0,.22)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {kind === "tee" && (
          <path d="M64 20 16 48l18 44 24-10v102h84V82l24 10 18-44-48-28q-36 32-72 0z" />
        )}
        {kind === "hood" && (
          <>
            <path d="M60 18 12 48l18 48 28-12v102h84V84l28 12 18-48-48-30q-8 38-40 38t-40-38z" />
            <path
              d="M72 150h56l8 24H64z"
              fill="rgba(0,0,0,.14)"
              stroke="none"
            />
          </>
        )}
        {kind === "tote" && (
          <>
            <path
              d="M80 66a20 20 0 0 1 40 0"
              fill="none"
              style={{ stroke: color }}
              strokeWidth="9"
            />
            <path d="M42 62h116l12 126H30z" />
          </>
        )}
        {kind === "poster" && (
          <rect x="38" y="10" width="124" height="180" rx="3" />
        )}
      </g>
      {kind === "poster" && (
        <rect
          x="46"
          y="18"
          width="108"
          height="164"
          fill="none"
          stroke={ink}
          strokeWidth="1.2"
        />
      )}
      <g
        transform={`translate(100 ${sh.ay}) scale(${sh.s})`}
        className="cz-art"
      >
        {art === "sun" && (
          <>
            <circle r="18" fill={acc} />
            <circle
              r="24"
              fill="none"
              stroke={ink}
              strokeWidth="1"
              strokeDasharray="1.5 3.5"
            />
          </>
        )}
        {art === "skyline" && (
          <>
            <path
              d="M-28 16 -24 4h8l3-10h7l3-10h6l3 10h7l3 10h8l4 12z"
              fill={acc}
            />
            <circle cy="-20" r="2.2" fill={acc} />
          </>
        )}
        {art === "reel" && (
          <>
            <circle r="17" fill={acc} />
            <g fill={color}>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <circle
                  key={a}
                  r="3.4"
                  cx={9 * Math.cos((a * Math.PI) / 180)}
                  cy={9 * Math.sin((a * Math.PI) / 180)}
                />
              ))}
              <circle r="2.4" />
            </g>
          </>
        )}
      </g>
      <g
        fontFamily="Anton, 'Noto Sans Tamil', 'Noto Sans Malayalam', sans-serif"
        textAnchor="middle"
        fill={ink}
        opacity={empty ? 0.45 : 1}
      >
        {lines.map((l, i) => (
          <text
            key={i + l}
            x="100"
            y={y0 + i * gap}
            fontSize={f}
            textLength={tl}
            lengthAdjust="spacingAndGlyphs"
          >
            {l}
          </text>
        ))}
      </g>
      {kind === "poster" && (
        <text
          x="100"
          y="176"
          textAnchor="middle"
          fontFamily="Space Mono, monospace"
          fontWeight="700"
          fontSize="5"
          letterSpacing="2"
          fill={ink}
        >
          ZEROCRAFT STUDIO
        </text>
      )}
    </svg>
  );
}

function KindIcon({ k }: { k: Kind }) {
  const p = {
    tee: "M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z",
    hood: "M9 3 4 6l1 5 3-1v11h8V10l3 1 1-5-5-3c0 2-1 3-3 3s-3-1-3-3z",
    tote: "M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0",
    poster: "M6 3h12v18H6zM9 15h6",
  }[k];
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={p} />
    </svg>
  );
}

export default function Customize({
  onOrder,
}: {
  onOrder?: (cfg: CustomConfig) => void;
}) {
  const [kind, setKind] = useState<Kind>("tee");
  const [color, setColor] = useState(COLORS[2].hex);
  const [art, setArt] = useState<ArtKey>("sun");
  const [text, setText] = useState("Adipoli");
  const [size, setSize] = useState("M");
  const [done, setDone] = useState(false);

  const prod = PRODUCTS.find((p) => p.key === kind)!;
  const colorName = COLORS.find((c) => c.hex === color)!.name;
  const cfg: CustomConfig = {
    kind,
    color: colorName,
    art,
    text: text.trim(),
    size,
    price: prod.price,
  };
  const code =
    "CZ-" +
    (1000 +
      ((text.length * 37 +
        PRODUCTS.indexOf(prod) * 101 +
        COLORS.findIndex((c) => c.hex === color) * 17) %
        9000));
  const pick =
    <T,>(set: (v: T) => void, v: T) =>
    () => {
      set(v);
      setDone(false);
    };

  return (
    <section className="cz" aria-labelledby="cz-title">
      <div className="cz-wrap">
        <div className="cz-panel">
          <div className="cz-stage-col">
            <div className="cz-stage">
              <span className="cz-mark tl" />
              <span className="cz-mark tr" />
              <span className="cz-mark bl" />
              <span className="cz-mark br" />
              <div className="cz-prev">
                <Preview kind={kind} color={color} art={art} text={text} />
              </div>
              <div className="cz-burst" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                  <path
                    d="M50 0 56 18 72 6 74 25 94 22 86 40 100 50 86 60 94 78 74 75 72 94 56 82 50 100 44 82 28 94 26 75 6 78 14 60 0 50 14 40 6 22 26 25 28 6 44 18z"
                    fill="#C23B22"
                  />
                </svg>
                <span>
                  Made
                  <br />
                  for
                  <br />
                  you
                </span>
              </div>
              <div className="cz-chip mono">Live preview</div>
            </div>
            <div className="cz-price">
              <div>
                <span className="cz-mono">
                  {prod.label} · {colorName}
                  {prod.sizes.length > 1 ? ` · ${size}` : ""}
                </span>
                <b>₹{prod.price.toLocaleString("en-IN")}</b>
              </div>
              <span className="cz-mono cz-note">
                Print included · {prod.note}
              </span>
            </div>
          </div>

          <div className="cz-ctl">
            <span className="cz-mono cz-eyebrow">Custom studio</span>
            <h2 id="cz-title">
              Make it <em>yours.</em>
            </h2>
            <p className="cz-lead">
              Pick a base, a colour and your own line. We print it in our studio
              and ship in 4–6 days.
            </p>

            <ol className="cz-steps">
              <li>
                <div className="cz-sh">
                  <i>1</i>
                  <b id="cz-l1">Pick a product</b>
                </div>
                <div
                  className="cz-opts"
                  role="radiogroup"
                  aria-labelledby="cz-l1"
                >
                  {PRODUCTS.map((p) => (
                    <button
                      key={p.key}
                      role="radio"
                      aria-checked={kind === p.key}
                      className={`cz-opt ${kind === p.key ? "on" : ""}`}
                      onClick={() => {
                        setKind(p.key);
                        setSize(p.sizes[Math.min(1, p.sizes.length - 1)]);
                        setDone(false);
                      }}
                    >
                      <KindIcon k={p.key} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </li>
              <li>
                <div className="cz-sh">
                  <i>2</i>
                  <b id="cz-l2">Choose a colour</b>
                  <span className="cz-mono">{colorName}</span>
                </div>
                <div
                  className="cz-sws"
                  role="radiogroup"
                  aria-labelledby="cz-l2"
                >
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      role="radio"
                      aria-checked={color === c.hex}
                      aria-label={c.name}
                      title={c.name}
                      className={`cz-sw ${color === c.hex ? "on" : ""}`}
                      style={{ background: c.hex }}
                      onClick={pick(setColor, c.hex)}
                    />
                  ))}
                </div>
              </li>
              <li>
                <div className="cz-sh">
                  <i>3</i>
                  <label id="cz-l3" htmlFor="cz-text">
                    <b>Add your line</b>
                  </label>
                  <span className="cz-mono">{text.length}/22</span>
                </div>
                <input
                  id="cz-text"
                  className="cz-input"
                  value={text}
                  maxLength={22}
                  onChange={(e) => {
                    setText(e.target.value);
                    setDone(false);
                  }}
                  placeholder="Type a dialogue, name or date"
                />
                <div className="cz-ideas">
                  {IDEAS.map((i) => (
                    <button key={i} onClick={pick(setText, i)}>
                      {i}
                    </button>
                  ))}
                </div>
                <div
                  className="cz-opts art"
                  role="radiogroup"
                  aria-label="Graphic"
                >
                  {ARTS.map((a) => (
                    <button
                      key={a.key}
                      role="radio"
                      aria-checked={art === a.key}
                      className={`cz-opt sm ${art === a.key ? "on" : ""}`}
                      onClick={pick(setArt, a.key)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </li>
              {prod.sizes.length > 1 && (
                <li>
                  <div className="cz-sh">
                    <i>4</i>
                    <b id="cz-l4">Size</b>
                  </div>
                  <div
                    className="cz-sizes"
                    role="radiogroup"
                    aria-labelledby="cz-l4"
                  >
                    {prod.sizes.map((s) => (
                      <button
                        key={s}
                        role="radio"
                        aria-checked={size === s}
                        className={`cz-size ${size === s ? "on" : ""}`}
                        onClick={pick(setSize, s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </li>
              )}
            </ol>

            {done ? (
              <div className="cz-done" role="status">
                <div>
                  <span className="cz-mono">Design {code}</span>
                  <b>Your design is ready</b>
                  <p>
                    {prod.label}, {colorName}
                    {prod.sizes.length > 1 ? `, size ${size}` : ""}, printed
                    with “{text.trim() || "Your line"}”.
                  </p>
                </div>
                <button className="cz-btn ghost" onClick={() => setDone(false)}>
                  Edit design
                </button>
              </div>
            ) : (
              <button
                className="cz-btn"
                onClick={() => {
                  setDone(true);
                  onOrder?.(cfg);
                }}
              >
                Create my design · ₹{prod.price.toLocaleString("en-IN")}
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
