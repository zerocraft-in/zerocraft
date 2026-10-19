import Link from "next/link";

export default function NotFound() {
  return (
    <main className="studio-status-page" aria-labelledby="not-found-title">
      <div className="studio-status-page__grid" aria-hidden="true" />
      <div className="studio-status-page__content">
        <p className="studio-eyebrow">Zerocraft Studio / Lost direction</p>
        <p className="studio-status-page__code">ERR / 404</p>
        <h1 id="not-found-title">This page took<br /><span>a wrong turn.</span></h1>
        <p className="studio-status-page__description">The link you followed does not lead to a published piece. Let’s get you back to the main collection.</p>
        <div className="studio-status-page__actions">
          <Link href="/" className="badge-btn">BACK TO HOME <span className="badge-btn__icon" aria-hidden="true">↗</span></Link>
          <Link href="/works" className="studio-status-page__link">Browse selected work <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <p className="studio-status-page__footer">Design · Code · Story / Tenkasi, India</p>
    </main>
  );
}
