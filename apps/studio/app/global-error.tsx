"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Zerocraft Studio — System pause</title>
        <style>{` :root{color-scheme:dark}*{box-sizing:border-box}html,body{margin:0;min-height:100%}body{background:#10110f;color:#f5f4ef;font-family:Arial,sans-serif}.global-error{min-height:100vh;display:grid;place-items:center;position:relative;overflow:hidden;padding:2rem}.global-error__grid{position:absolute;inset:0;opacity:.22;background-image:linear-gradient(#f5f4ef 1px,transparent 1px),linear-gradient(90deg,#f5f4ef 1px,transparent 1px);background-size:72px 72px;mask-image:radial-gradient(ellipse at center,#000 10%,transparent 78%)}.global-error__content{position:relative;width:min(100%,42rem)}.global-error__eyebrow,.global-error__code{color:#a5a79c;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.global-error__code{color:#d3ff00;margin-top:4rem}h1{margin:1rem 0 1.5rem;font-size:clamp(3.25rem,11vw,8rem);line-height:.9;letter-spacing:-.07em}h1 span{color:#d3ff00}p{max-width:31rem;color:#a5a79c;font-size:1rem;line-height:1.65}button{margin-top:1rem;border:1px solid #deded8;border-radius:4px;background:#fff;color:#10110f;padding:.95rem 1.2rem;font-weight:800;letter-spacing:.08em;cursor:pointer}`}</style>
      </head>
      <body>
        <main className="global-error" aria-labelledby="global-error-title">
          <div className="global-error__grid" aria-hidden="true" />
          <div className="global-error__content">
            <p className="global-error__eyebrow">
              Zerocraft Studio / Global error
            </p>
            <p className="global-error__code">SYSTEM / 500</p>
            <h1 id="global-error-title">
              The canvas needs a reset<span>.</span>
            </h1>
            <p>
              The studio could not load this experience. Try again to rebuild
              the page.
            </p>
            <button type="button" onClick={reset}>
              RELOAD EXPERIENCE ↗
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
