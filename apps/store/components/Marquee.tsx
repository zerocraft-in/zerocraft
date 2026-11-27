import React from 'react';

export default function Marquee({ id, items, className = '', seconds = 40, reverse = false }: { id?: string; items: string[]; className?: string; seconds?: number; reverse?: boolean }) {
  const row = [...items, ...items].map((t, i) => (
    <span key={i} className="mq-item">{t}<i className="mq-dot" aria-hidden="true" /></span>
  ));
  return (
    <div id={id} className={`site-marquee marquee ${className}`} data-animation="marquee" aria-label={items.join(' · ')}>
      <div className="mq-track" style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
        <div className="mq-row">{row}</div>
        <div className="mq-row" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}
