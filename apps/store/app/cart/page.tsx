import CartView from '@/components/CartView';
export const metadata = { title: 'Your cart | ZeroCraft' };
export default function CartPage() {
  return (
    <div className="wrap cart-p">
      <h1 className="h-lg">Your <em>cart.</em></h1>
      <CartView />
    </div>
  );
}
