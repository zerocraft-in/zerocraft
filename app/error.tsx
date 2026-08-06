"use client";

import { useEffect } from "react";

export default function Error({
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', padding: '2rem', textAlign: 'center', color: '#fff' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong!</h2>
      <button
        style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
