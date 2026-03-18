const express = require('express');
const { readUsers, readOrders, readBeers, writeOrders, getCustomersOnly, sanitizeUser } = require('../data/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const customers = getCustomersOnly();
  const orders = readOrders();
  const beers = readBeers();

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const activeLogins = customers.filter(u => u.lastLogin).length;
  const lowStockBeers = beers.filter(b => b.stock < 20).length;

  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Revenue by day (last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayRevenue = orders
      .filter(o => o.createdAt.startsWith(dateStr))
      .reduce((sum, o) => sum + o.total, 0);
    last7Days.push({ date: dateStr, revenue: dayRevenue });
  }

  res.json({
    totalCustomers: customers.length,
    activeLogins,
    totalOrders,
    totalRevenue,
    lowStockBeers,
    recentOrders,
    last7Days
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const customers = getCustomersOnly()
    .map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      address: u.address,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      loginCount: u.loginCount || 0
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(customers);
});

// GET /api/admin/orders
router.get('/orders', (req, res) => {
  const orders = readOrders();
  const sorted = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['processing', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  writeOrders(orders);

  res.json({ message: 'Order status updated', order: orders[idx] });
});

// GET /api/admin/inventory
router.get('/inventory', (req, res) => {
  const beers = readBeers();
  res.json(beers);
});

// GET /api/admin/bank-details (payment information)
router.get('/bank-details', (req, res) => {
  res.json({
    bankName: 'ICIC Bank',
    accountHolder: 'Bhutham Prashanth',
    accountNumber: '440001001205',
    ifscCode: 'ICIC0004400',
    note: 'All customer payments are credited directly to this account'
  });
});

module.exports = router;
