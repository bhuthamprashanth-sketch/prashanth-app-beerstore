import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Clock3, MapPinned, PackageCheck, Route, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const statusLabels = {
  processing: 'Processing order',
  confirmed: 'Order confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const response = await axios.get(`/api/orders/${id}`);
        setOrder(response.data);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Unable to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const progressIndex = useMemo(() => {
    const statuses = ['processing', 'confirmed', 'out_for_delivery', 'delivered'];
    return Math.max(statuses.indexOf(order?.status), 0);
  }, [order?.status]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="hero-panel p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-300" />
          <p className="mt-4 text-zinc-300">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <div className="hero-panel p-10 text-center">
          <h1 className="text-3xl font-bold text-white">Order not found</h1>
          <Link to="/" className="btn-primary mt-6 inline-flex">Back to catalog</Link>
        </div>
      </div>
    );
  }

  const stages = ['processing', 'confirmed', 'out_for_delivery', 'delivered'];

  return (
    <div className="page-container pb-24">
      <section className="hero-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Order placed</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Track delivery for order {order.id.slice(0, 8)}</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Payment was successful. Your order is being prepared and you can see the dispatch location and estimated arrival below.
            </p>
          </div>
          <div className="price-chip">{statusLabels[order.status] || order.status}</div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="stat-card p-5">
          <div className="flex items-center gap-3 text-amber-200">
            <Clock3 size={20} />
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">ETA</p>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{order.estimatedDeliveryMinutes} mins</p>
        </div>
        <div className="stat-card p-5">
          <div className="flex items-center gap-3 text-sky-200">
            <MapPinned size={20} />
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Dispatch from</p>
          </div>
          <p className="mt-4 text-lg font-bold text-white">{order.deliveryHub}</p>
        </div>
        <div className="stat-card p-5">
          <div className="flex items-center gap-3 text-emerald-200">
            <ShieldCheck size={20} />
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Delivery address</p>
          </div>
          <p className="mt-4 text-lg font-bold text-white">{order.deliveryAddress}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="hero-panel p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Route size={20} className="text-amber-300" />
            <h2 className="text-2xl font-bold text-white">Delivery progress</h2>
          </div>
          <div className="mt-8 space-y-6">
            {stages.map((stage, index) => {
              const isComplete = index <= progressIndex;

              return (
                <div key={stage} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${isComplete ? 'border-amber-300 bg-amber-300 text-black' : 'border-white/10 bg-white/5 text-zinc-500'}`}>
                      {index + 1}
                    </div>
                    {index < stages.length - 1 && (
                      <div className={`mt-2 h-16 w-px ${isComplete ? 'bg-amber-300/70' : 'bg-white/10'}`} />
                    )}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-lg font-bold text-white">{statusLabels[stage]}</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {stage === 'processing' && 'The store is packing your selected beers.'}
                      {stage === 'confirmed' && 'The order is verified and assigned to a delivery run.'}
                      {stage === 'out_for_delivery' && 'The rider has picked up the order and is on the way.'}
                      {stage === 'delivered' && 'The delivery is completed at your address.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="hero-panel p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <PackageCheck size={20} className="text-amber-300" />
              <h2 className="text-2xl font-bold text-white">Ordered beers</h2>
            </div>
            <div className="mt-6 space-y-3">
              {order.items.map((item) => (
                <div key={`${item.beerId}-${item.beerName}`} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{item.beerName}</p>
                    <p className="text-sm text-zinc-400">{item.quantity} x Rs. {item.price}</p>
                  </div>
                  <p className="font-bold text-amber-300">Rs. {item.itemTotal}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Total paid</span>
                <span className="text-3xl font-bold text-amber-300">Rs. {order.total}</span>
              </div>
            </div>
          </div>

          <Link to="/" className="btn-secondary inline-flex w-full items-center justify-center">Order more beers</Link>
        </div>
      </section>
    </div>
  );
}