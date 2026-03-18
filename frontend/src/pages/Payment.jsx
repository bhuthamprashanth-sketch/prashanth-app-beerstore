import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, MapPin, Smartphone, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  paymentMethod: 'upi',
  deliveryAddress: '',
  upiId: '',
  cardNumber: '',
  cardHolder: '',
  expiry: '',
  cvv: ''
};

export default function Payment() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    if (!items.length) {
      toast.error('Your cart is empty');
      return false;
    }

    if (!form.deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return false;
    }

    if (form.paymentMethod === 'upi' && !form.upiId.trim()) {
      toast.error('Please enter a valid UPI ID');
      return false;
    }

    if (form.paymentMethod === 'card') {
      if (!form.cardNumber.trim() || !form.cardHolder.trim() || !form.expiry.trim() || !form.cvv.trim()) {
        toast.error('Please fill all card details');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        paymentMethod: form.paymentMethod,
        deliveryAddress: form.deliveryAddress,
        items: items.map((item) => ({ beerId: item.beerId, quantity: item.quantity }))
      };

      const response = await axios.post('/api/orders', payload);
      clearCart();
      toast.success('Payment successful. Order created.');
      navigate(`/order/${response.data.order.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container pb-24">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Payment gateway</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Complete payment for your cart items</h1>
        <p className="mt-3 text-zinc-400">
          This checkout supports simulated UPI and card flows. After successful payment you will see dispatch location and estimated delivery time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="hero-panel p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, paymentMethod: 'upi' }))}
              className={`rounded-3xl border p-5 text-left transition ${
                form.paymentMethod === 'upi'
                  ? 'border-amber-300/40 bg-amber-300/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 text-white">
                <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300"><Smartphone size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold">UPI payment</h2>
                  <p className="text-sm text-zinc-400">PhonePe, Google Pay, Paytm, BHIM</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, paymentMethod: 'card' }))}
              className={`rounded-3xl border p-5 text-left transition ${
                form.paymentMethod === 'card'
                  ? 'border-amber-300/40 bg-amber-300/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 text-white">
                <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-300"><CreditCard size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold">Debit or credit card</h2>
                  <p className="text-sm text-zinc-400">Visa, Mastercard, Rupay</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <label className="label">Delivery address</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <textarea
                name="deliveryAddress"
                rows="4"
                value={form.deliveryAddress}
                onChange={handleChange}
                placeholder={user?.address || 'Enter your full delivery address'}
                className="input-field min-h-32 pl-11"
              />
            </div>
          </div>

          {form.paymentMethod === 'upi' ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
              <label className="label">UPI ID</label>
              <input
                type="text"
                name="upiId"
                value={form.upiId}
                onChange={handleChange}
                placeholder="yourname@upi"
                className="input-field"
              />
              <p className="mt-3 text-sm text-zinc-500">This is a demo payment flow. The app records a successful payment after form validation.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Card number</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={form.cardNumber}
                  onChange={handleChange}
                  placeholder="1234 5678 9012 3456"
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Card holder name</label>
                <input
                  type="text"
                  name="cardHolder"
                  value={form.cardHolder}
                  onChange={handleChange}
                  placeholder="Name on card"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Expiry</label>
                <input
                  type="text"
                  name="expiry"
                  value={form.expiry}
                  onChange={handleChange}
                  placeholder="MM/YY"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">CVV</label>
                <input
                  type="password"
                  name="cvv"
                  value={form.cvv}
                  onChange={handleChange}
                  placeholder="123"
                  className="input-field"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2">
            <Wallet size={18} />
            {submitting ? 'Processing payment...' : `Pay Rs. ${totalPrice}`}
          </button>
        </form>

        <aside className="hero-panel h-fit p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Payment summary</p>
          <h2 className="mt-3 text-3xl font-bold text-white">{totalItems} items ready</h2>
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.beerId} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-zinc-400">{item.quantity} x Rs. {item.price}</p>
                </div>
                <p className="font-bold text-amber-300">Rs. {item.quantity * item.price}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-black/20 p-5">
            <div className="flex items-center justify-between text-zinc-300">
              <span>Items total</span>
              <span className="font-bold text-white">Rs. {totalPrice}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-zinc-300">
              <span>Delivery fee</span>
              <span className="font-bold text-white">Rs. 0</span>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Payable amount</span>
                <span className="text-3xl font-bold text-amber-300">Rs. {totalPrice}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}