import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Flame, ShoppingBag, Sparkles, Star, Waves } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const beerVisuals = {
  'Kingfisher Light': {
    image:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-sky-500 via-cyan-400 to-emerald-300'
  },
  'Kingfisher Strong': {
    image:
      'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-orange-500 via-amber-400 to-red-500'
  },
  'KF Ultra Light': {
    image:
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-violet-500 via-indigo-400 to-sky-400'
  },
  'KF Ultra Strong': {
    image:
      'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-rose-500 via-orange-500 to-amber-300'
  },
  Budweiser: {
    image:
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-red-600 via-red-500 to-amber-300'
  },
  Breezer: {
    image:
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-pink-500 via-fuchsia-500 to-orange-300'
  }
};

export default function Home() {
  const [beers, setBeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const { addItem, totalItems, totalPrice } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    const loadBeers = async () => {
      try {
        const response = await axios.get('/api/beers');
        setBeers(response.data);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Unable to load beers');
      } finally {
        setLoading(false);
      }
    };

    loadBeers();
  }, []);

  const stats = useMemo(() => {
    const brands = new Set(beers.map((beer) => beer.brand));
    const inStock = beers.reduce((sum, beer) => sum + beer.stock, 0);

    return {
      brands: brands.size,
      catalog: beers.length,
      inventory: inStock
    };
  }, [beers]);

  const changeQuantity = (beerId, delta, maxStock) => {
    setQuantities((current) => {
      const nextValue = Math.max(1, Math.min((current[beerId] || 1) + delta, maxStock));
      return { ...current, [beerId]: nextValue };
    });
  };

  const handleAddToCart = (beer) => {
    addItem(beer, quantities[beer.id] || 1);
  };

  return (
    <div className="page-container pb-32">
      <section className="hero-panel grain-overlay relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
        <div className="absolute -right-16 top-6 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
              <Sparkles size={16} /> Cold delivery in under 45 minutes
            </div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Welcome, {user?.username}. Pick your beer, review your cart, and check out in one flow.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              Kingfisher light and strong, KF Ultra, Budweiser, and Breezer are ready to order. The cart summary stays visible so quantity and total price are always clear on mobile.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="stat-card p-4">
              <p className="text-sm text-zinc-400">Brands</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.brands}</p>
            </div>
            <div className="stat-card p-4">
              <p className="text-sm text-zinc-400">Beer types</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.catalog}</p>
            </div>
            <div className="stat-card p-4">
              <p className="text-sm text-zinc-400">Units in stock</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.inventory}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="stat-card flex items-start gap-3 p-5">
          <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300"><Star size={20} /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Curated catalog</h2>
            <p className="mt-1 text-sm text-zinc-400">All requested brands are preloaded with pricing and stock.</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-3 p-5">
          <div className="rounded-2xl bg-orange-400/15 p-3 text-orange-300"><Flame size={20} /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Fast order flow</h2>
            <p className="mt-1 text-sm text-zinc-400">Login, add quantity, review cart, and simulate card or UPI payment.</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-3 p-5">
          <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-300"><Waves size={20} /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Delivery tracking</h2>
            <p className="mt-1 text-sm text-zinc-400">After payment, the app shows dispatch location and estimated delivery minutes.</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Beer catalog</h2>
            <p className="text-sm text-zinc-400">Choose quantity per beer and add directly to cart.</p>
          </div>
          <div className="price-chip">{totalItems} items in cart</div>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="card overflow-hidden">
                <div className="shimmer h-52 w-full" />
                <div className="space-y-3 p-5">
                  <div className="shimmer h-4 w-1/3 rounded" />
                  <div className="shimmer h-6 w-2/3 rounded" />
                  <div className="shimmer h-16 w-full rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {beers.map((beer) => {
              const quantity = quantities[beer.id] || 1;
              const visual = beerVisuals[beer.name] || {};

              return (
                <article key={beer.id} className="card overflow-hidden bg-zinc-900/80">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={visual.image}
                      alt={beer.name}
                      className="h-full w-full object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-tr ${visual.accent || 'from-amber-500/70 to-transparent'} mix-blend-multiply`} />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="inline-flex items-center rounded-full bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-100 backdrop-blur-md">
                        {beer.brand}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold text-white">{beer.name}</h3>
                        <p className="mt-1 text-sm text-zinc-400">{beer.type} • {beer.abv} ABV</p>
                      </div>
                      <span className="text-4xl">{beer.emoji}</span>
                    </div>

                    <p className="text-sm leading-6 text-zinc-300">{beer.description}</p>

                    <div className="flex items-center justify-between rounded-2xl bg-black/25 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Price</p>
                        <p className="mt-1 text-2xl font-bold text-amber-300">Rs. {beer.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Stock</p>
                        <p className="mt-1 text-lg font-bold text-white">{beer.stock}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(beer.id, -1, beer.stock)}
                          className="h-10 w-10 rounded-xl text-lg font-bold text-white transition hover:bg-white/10"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-lg font-bold text-white">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(beer.id, 1, beer.stock)}
                          className="h-10 w-10 rounded-xl text-lg font-bold text-white transition hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(beer)}
                        className="btn-primary flex items-center gap-2"
                        disabled={beer.stock === 0}
                      >
                        <ShoppingBag size={18} /> Add to cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Bottom cart summary</p>
            <p className="text-lg font-bold text-white">{totalItems} beers selected</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Total price</p>
            <p className="text-2xl font-bold text-amber-300">Rs. {totalPrice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}