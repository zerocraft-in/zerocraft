"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function StudioError({
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
    <main className="studio-status-page" aria-labelledby="error-title">
      <div className="studio-status-page__grid" aria-hidden="true" />
      <div className="studio-status-page__content">
        <p className="studio-eyebrow">Zerocraft Studio / System pause</p>
        <p className="studio-status-page__code">ERR / 500</p>
        <h1 id="error-title">Something went<br /><span>off-script.</span></h1>
        <p className="studio-status-page__description">The studio hit an unexpected snag. Try the page again, or return to the workbench and start fresh.</p>
        <div className="studio-status-page__actions">
          <button type="button" className="badge-btn" onClick={reset}>TRY AGAIN <span className="badge-btn__icon" aria-hidden="true">↗</span></button>
          <Link href="/" className="studio-status-page__link">Back to the studio <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <p className="studio-status-page__footer">Design · Code · Story / Tenkasi, India</p>
    </main>
  );
}
