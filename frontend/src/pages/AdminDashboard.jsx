import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Boxes, IndianRupee, Landmark, RefreshCcw, Users, Warehouse } from 'lucide-react';
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
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStockId, setSavingStockId] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse, inventoryResponse, ordersResponse, bankResponse] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/inventory'),
        axios.get('/api/admin/orders'),
        axios.get('/api/admin/bank-details')
      ]);

      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      setInventory(inventoryResponse.data);
      setOrders(ordersResponse.data);
      setBankDetails(bankResponse.data);
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
        <div className="bg-white border border-zinc-200 rounded-lg p-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-amber-500" />
          <p className="mt-4 text-zinc-600">Loading admin data...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 pb-24">
      <section className="bg-white border-b border-zinc-200 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-600 font-semibold">Admin control center</p>
            <h1 className="mt-3 text-4xl font-bold text-zinc-900">Customer logs, stock details, and order access</h1>
            <p className="mt-3 max-w-3xl text-zinc-600">
              This dashboard shows registered customers, login activity, beer inventory, revenue, and live order status management.
            </p>
          </div>
          <button type="button" onClick={loadDashboard} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 transition text-white font-semibold">
            <RefreshCcw size={18} /> Refresh data
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4 px-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="bg-white rounded-lg border border-zinc-200 p-5 hover:shadow-lg transition">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-600 font-medium">{label}</p>
                <p className="mt-3 text-3xl font-bold text-zinc-900">{value}</p>
              </div>
              <div className="rounded-lg bg-amber-100 p-3 text-amber-700"><Icon size={24} /></div>
            </div>
          </article>
        ))}
      </section>

      <section className="max-w-7xl mx-auto mt-8 grid gap-6 px-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white rounded-lg border border-zinc-200 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-amber-600" />
            <h2 className="text-2xl font-bold text-zinc-900">Registered customers</h2>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-600 font-semibold border-b border-zinc-200">
                <tr>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Phone</th>
                  <th className="pb-3 font-semibold">Logins</th>
                  <th className="pb-3 font-semibold">Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-zinc-100 text-zinc-700 hover:bg-zinc-50">
                    <td className="py-4 pr-4">
                      <div>
                        <p className="font-semibold text-zinc-900">{user.username}</p>
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

        <div className="bg-white rounded-lg border border-zinc-200 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Warehouse size={20} className="text-amber-600" />
            <h2 className="text-2xl font-bold text-zinc-900">Inventory control</h2>
          </div>
          <div className="mt-6 space-y-4">
            {inventory.map((beer) => (
              <div key={beer.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-zinc-900">{beer.name}</p>
                    <p className="text-sm text-zinc-600">Price: Rs. {beer.price}</p>
                  </div>
                  <div className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700">Current: {beer.stock}</div>
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
                    className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-amber-600 max-w-36"
                  />
                  <span className="text-sm text-zinc-600">Update stock</span>
                  {savingStockId === beer.id && <span className="text-sm text-amber-600 font-medium">Saving...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto mt-8 px-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Landmark size={20} className="text-amber-600" />
          <h2 className="text-2xl font-bold text-zinc-900">Payment account details</h2>
        </div>
        {bankDetails && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-zinc-600">Account Holder</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900">{bankDetails.accountHolder}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Bank Name</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900">{bankDetails.bankName}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Account Number</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900 font-mono">{bankDetails.accountNumber}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">IFSC Code</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900 font-mono">{bankDetails.ifscCode}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-white p-4">
              <p className="text-sm text-amber-700">Note: {bankDetails.note}</p>
            </div>
          </div>
        )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto mt-8 px-4">
        <div className="bg-white rounded-lg border border-zinc-200 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Boxes size={20} className="text-amber-600" />
          <h2 className="text-2xl font-bold text-zinc-900">Orders and access details</h2>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-600 border-b border-zinc-200">
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
                <tr key={order.id} className="border-t border-zinc-100 text-zinc-700 hover:bg-zinc-50">
                  <td className="py-4 pr-4">
                    <div>
                      <p className="font-semibold text-zinc-900">{order.id.slice(0, 8)}</p>
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
                  <td className="py-4 pr-4 font-semibold text-amber-700">Rs. {order.total}</td>
                  <td className="py-4 pr-4">{order.paymentMethod.toUpperCase()}</td>
                  <td className="py-4 pr-4">
                    <select
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                      className="min-w-44 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:border-amber-600"
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
        </div>
      </section>
    </div>
  );
}