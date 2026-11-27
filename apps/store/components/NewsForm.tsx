'use client';
import { useState } from 'react';
import Icon from './Icon';

export default function NewsForm() {
  const [done, setDone] = useState(false);
  return (
    <form id="newsletter-form" className="newsletter-form news-f" data-form="newsletter" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
        <label className="sr" htmlFor="newsletter-email">Email for early access</label>
      {done ? (
        <p role="status" className="news-ok"><b>You are on the list.</b> We will email you before the next drop.</p>
      ) : (
        <>
          <input id="newsletter-email" name="email" autoComplete="email" type="email" required placeholder="Your email for early access" />
          <button className="btn k" type="submit">Get in <Icon name="arrow" /></button>
        </>
      )}
    </form>
  );
}
