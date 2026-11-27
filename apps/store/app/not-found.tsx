import Link from 'next/link';
import { Clap } from '@/components/Graphics';
export default function NotFound() {
  return (
    <div className="wrap empty-s">
      <Clap style={{ width: 160 }} />
      <h1 className="h-md">Scene not found</h1>
      <p>That page is not in the programme. Head back to the shop.</p>
      <Link className="btn" href="/shop">Back to the shop</Link>
    </div>
  );
}
