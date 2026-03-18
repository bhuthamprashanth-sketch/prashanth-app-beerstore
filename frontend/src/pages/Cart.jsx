import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="page-container">
        <div className="hero-panel mx-auto max-w-2xl p-8 text-center sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-4xl">🛒</div>
          <h1 className="mt-6 text-4xl font-bold text-white">Your cart is empty</h1>
          <p className="mt-3 text-zinc-300">
            Add beers from the home page and this screen will show item quantity, price, and the checkout action.
          </p>
          <Link to="/" className="btn-primary mt-8 inline-flex items-center gap-2">
            <ShoppingCart size={18} /> Browse beers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container pb-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Cart details</h1>
          <p className="mt-2 text-zinc-400">Review beer quantity and pricing before payment.</p>
        </div>
        <div className="price-chip">{totalItems} items</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-4">
          {items.map((item) => (
            <article key={item.beerId} className="card overflow-hidden p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`beer-${item.color} flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-lg`}>
                    {item.emoji}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{item.brand}</p>
                    <h2 className="mt-1 text-2xl font-bold text-white">{item.name}</h2>
                    <p className="mt-2 text-sm text-zinc-400">Rs. {item.price} each</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.beerId, item.quantity - 1)}
                      className="h-10 w-10 rounded-xl text-white transition hover:bg-white/10"
                    >
                      <Minus size={18} className="mx-auto" />
                    </button>
                    <span className="w-10 text-center text-lg font-bold text-white">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.beerId, item.quantity + 1)}
                      className="h-10 w-10 rounded-xl text-white transition hover:bg-white/10"
                    >
                      <Plus size={18} className="mx-auto" />
                    </button>
                  </div>

                  <div className="min-w-28 text-right">
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Item total</p>
                    <p className="mt-1 text-2xl font-bold text-amber-300">Rs. {item.price * item.quantity}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.beerId)}
                    className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-300 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="hero-panel h-fit p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Order summary</p>
          <h2 className="mt-3 text-3xl font-bold text-white">Ready for checkout</h2>
          <div className="mt-6 space-y-4 rounded-3xl bg-black/20 p-5">
            <div className="flex items-center justify-between text-zinc-300">
              <span>Total beers</span>
              <span className="font-bold text-white">{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span>Delivery fee</span>
              <span className="font-bold text-white">Free</span>
            </div>
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Total price</span>
                <span className="text-3xl font-bold text-amber-300">Rs. {totalPrice}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-semibold">
              <Truck size={18} /> Estimated delivery in 25 to 45 minutes after payment.
            </div>
          </div>

          <Link to="/payment" className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2">
            Continue to payment
          </Link>
        </aside>
      </div>
    </div>
  );
}