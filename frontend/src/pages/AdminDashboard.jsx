import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Boxes, IndianRupee, RefreshCcw, Users, Warehouse } from 'lucide-react';
import toast from 'react-hot-toast';

const statusOptions = [
  'processing',
  'confirmed',
  'out_for_delivery',
  'delivered',
  'cancelled'
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStockId, setSavingStockId] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse, inventoryResponse, ordersResponse] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/inventory'),
        axios.get('/api/admin/orders')
      ]);

      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      setInventory(inventoryResponse.data);
      setOrders(ordersResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const updateStock = async (beerId, stock) => {
    try {
      setSavingStockId(beerId);
      await axios.put(`/api/beers/${beerId}/stock`, { stock: Number(stock) });
      toast.success('Stock updated');
      await loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update stock');
    } finally {
      setSavingStockId(null);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`/api/admin/orders/${orderId}/status`, { status });
      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
      toast.success('Order status updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update order status');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="hero-panel p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-300" />
          <p className="mt-4 text-zinc-300">Loading admin data...</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Customers', value: stats?.totalCustomers ?? 0, icon: Users },
    { label: 'Customer logins', value: stats?.activeLogins ?? 0, icon: Activity },
    { label: 'Orders', value: stats?.totalOrders ?? 0, icon: Boxes },
    { label: 'Revenue', value: `Rs. ${stats?.totalRevenue ?? 0}`, icon: IndianRupee }
  ];

  return (
    <div className="page-container pb-24">
      <section className="hero-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Admin control center</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Customer logs, stock details, and order access</h1>
            <p className="mt-3 max-w-3xl text-zinc-300">
              This dashboard shows registered customers, login activity, beer inventory, revenue, and live order status management.
            </p>
          </div>
          <button type="button" onClick={loadDashboard} className="btn-secondary inline-flex items-center justify-center gap-2">
            <RefreshCcw size={18} /> Refresh data
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="stat-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">{label}</p>
                <p className="mt-3 text-3xl font-bold text-white">{value}</p>
              </div>
              <div className="rounded-2xl bg-amber-300/10 p-3 text-amber-300"><Icon size={24} /></div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="hero-panel p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-amber-300" />
            <h2 className="text-2xl font-bold text-white">Registered customers</h2>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Logins</th>
                  <th className="pb-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-white/10 text-zinc-200">
                    <td className="py-4 pr-4">
                      <div>
                        <p className="font-semibold text-white">{user.username}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                        <p className="mt-1 text-xs text-zinc-500">{user.address || 'No address added'}</p>
                      </div>
                    </td>
                    <td className="py-4 pr-4">{user.phone || 'Not added'}</td>
                    <td className="py-4 pr-4">{user.loginCount}</td>
                    <td className="py-4 pr-4">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hero-panel p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Warehouse size={20} className="text-amber-300" />
            <h2 className="text-2xl font-bold text-white">Inventory control</h2>
          </div>
          <div className="mt-6 space-y-4">
            {inventory.map((beer) => (
              <div key={beer.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{beer.name}</p>
                    <p className="text-sm text-zinc-500">Price: Rs. {beer.price}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-zinc-300">Current stock: {beer.stock}</div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    defaultValue={beer.stock}
                    onBlur={(event) => {
                      const nextStock = event.target.value;
                      if (String(beer.stock) !== nextStock) {
                        updateStock(beer.id, nextStock);
                      }
                    }}
                    className="input-field max-w-36"
                  />
                  <span className="text-sm text-zinc-500">Update stock on blur</span>
                  {savingStockId === beer.id && <span className="text-sm text-amber-300">Saving...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 hero-panel p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Boxes size={20} className="text-amber-300" />
          <h2 className="text-2xl font-bold text-white">Orders and access details</h2>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Items</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Payment</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-white/10 text-zinc-200">
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-semibold text-white">{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div>
                      <p>{order.username}</p>
                      <p className="text-xs text-zinc-500">{order.deliveryAddress}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="py-4 pr-4 font-semibold text-amber-300">Rs. {order.total}</td>
                  <td className="py-4 pr-4">{order.paymentMethod.toUpperCase()}</td>
                  <td className="py-4 pr-4">
                    <select
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                      className="input-field min-w-44 py-2"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}