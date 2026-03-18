const express = require('express');
const { readOrders, writeOrders, readBeers, writeBeers, readUsers, uuidv4 } = require('../data/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders - Place an order
router.post('/', authenticateToken, (req, res) => {
  const { items, paymentMethod, deliveryAddress } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }
  if (!paymentMethod || !['upi', 'card'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Valid payment method required (upi or card)' });
  }
  if (!deliveryAddress || deliveryAddress.trim().length < 5) {
    return res.status(400).json({ error: 'Delivery address is required' });
  }

  const beers = readBeers();
  let orderItems = [];
  let total = 0;

  // Validate items and check stock
  for (const item of items) {
    const beer = beers.find(b => b.id === parseInt(item.beerId));
    if (!beer) {
      return res.status(400).json({ error: `Beer with id ${item.beerId} not found` });
    }
    if (beer.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${beer.name}` });
    }
    const itemTotal = beer.price * item.quantity;
    total += itemTotal;
    orderItems.push({
      beerId: beer.id,
      beerName: beer.name,
      brand: beer.brand,
      price: beer.price,
      quantity: item.quantity,
      itemTotal
    });
  }

  // Deduct stock
  for (const item of orderItems) {
    const beerIdx = beers.findIndex(b => b.id === item.beerId);
    beers[beerIdx].stock -= item.quantity;
  }
  writeBeers(beers);

  const deliveryHubs = [
    'BeerStore Hub, MG Road, Bengaluru',
    'BeerStore Hub, Indiranagar, Bengaluru',
    'BeerStore Hub, Koramangala, Bengaluru'
  ];
  const deliveryMinutes = Math.floor(Math.random() * 20) + 25; // 25-45 minutes
  const deliveryHub = deliveryHubs[Math.floor(Math.random() * deliveryHubs.length)];

  const newOrder = {
    id: uuidv4(),
    userId: req.user.id,
    username: req.user.username,
    items: orderItems,
    total,
    paymentMethod,
    paymentStatus: 'completed',
    deliveryAddress: deliveryAddress.trim(),
    deliveryHub,
    status: 'processing',
    estimatedDeliveryMinutes: deliveryMinutes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const orders = readOrders();
  orders.push(newOrder);
  writeOrders(orders);

  res.status(201).json({
    message: 'Order placed successfully!',
    order: newOrder
  });
});

// GET /api/orders/my-orders - Get current user's orders
router.get('/my-orders', authenticateToken, (req, res) => {
  const orders = readOrders();
  const userOrders = orders
    .filter(o => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userOrders);
});

// GET /api/orders/:id - Get specific order
router.get('/:id', authenticateToken, (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Only allow the owner or admin to view
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(order);
});

module.exports = router;
