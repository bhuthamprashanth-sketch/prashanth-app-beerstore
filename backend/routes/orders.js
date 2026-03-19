const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { readOrders, writeOrders, readBeers, writeBeers, readUsers, uuidv4 } = require('../data/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const adminBankDetails = {
  bankName: 'ICIC Bank',
  accountHolder: 'Bhutham Prashanth',
  accountNumber: '440001001205',
  ifscCode: 'ICIC0004400'
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const buildOrderItemsAndTotal = (items, beers) => {
  const orderItems = [];
  let total = 0;

  for (const item of items) {
    const beer = beers.find((b) => b.id === parseInt(item.beerId));
    if (!beer) {
      throw new Error(`Beer with id ${item.beerId} not found`);
    }
    if (beer.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${beer.name}`);
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

  return { orderItems, total };
};

const deductStockForOrderItems = (orderItems, beers) => {
  for (const item of orderItems) {
    const beerIdx = beers.findIndex((b) => b.id === item.beerId);
    if (beerIdx === -1 || beers[beerIdx].stock < item.quantity) {
      throw new Error(`Insufficient stock for ${item.beerName}`);
    }
    beers[beerIdx].stock -= item.quantity;
  }
};

// POST /api/orders/create-payment - Create Razorpay order
router.post('/create-payment', authenticateToken, async (req, res) => {
  const { items, paymentMethod, paymentProvider, deliveryAddress } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }
  if (!paymentMethod || !['upi', 'card'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Valid payment method required (upi or card)' });
  }
  if (paymentMethod === 'upi' && !['phonepe', 'paytm', 'gpay', 'bhim'].includes(paymentProvider)) {
    return res.status(400).json({ error: 'Valid UPI app required (phonepe, paytm, gpay, bhim)' });
  }
  if (!deliveryAddress || deliveryAddress.trim().length < 5) {
    return res.status(400).json({ error: 'Delivery address is required' });
  }

  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return res.status(503).json({
      error: 'Payment gateway is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    });
  }

  try {
    const beers = readBeers();
    const { orderItems, total } = buildOrderItemsAndTotal(items, beers);

    const localOrderId = uuidv4();
    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `beerstore_${localOrderId.slice(0, 12)}`,
      notes: {
        localOrderId,
        userId: req.user.id,
        paymentMethod,
        paymentProvider: paymentProvider || paymentMethod
      }
    });

    const orders = readOrders();
    orders.push({
      id: localOrderId,
      userId: req.user.id,
      username: req.user.username,
      items: orderItems,
      total,
      paymentMethod,
      paymentProvider: paymentProvider || paymentMethod,
      paymentGateway: 'razorpay',
      paymentGatewayOrderId: paymentOrder.id,
      paymentGatewayPaymentId: null,
      paymentStatus: 'pending',
      deliveryAddress: deliveryAddress.trim(),
      deliveryHub: null,
      status: 'payment_pending',
      estimatedDeliveryMinutes: null,
      creditStatus: 'pending',
      creditedToBank: adminBankDetails,
      creditedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    writeOrders(orders);

    res.status(201).json({
      message: 'Payment order created',
      payment: {
        localOrderId,
        razorpayOrderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to create payment order' });
  }
});

// POST /api/orders/verify-payment - Verify Razorpay signature and finalize order
router.post('/verify-payment', authenticateToken, (req, res) => {
  const { localOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!localOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(503).json({ error: 'Payment gateway secret is not configured' });
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (generatedSignature !== razorpaySignature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const orders = readOrders();
  const orderIdx = orders.findIndex((o) => o.id === localOrderId && o.userId === req.user.id);
  if (orderIdx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = orders[orderIdx];
  if (order.paymentStatus === 'completed') {
    return res.json({ message: 'Payment already verified', order });
  }

  try {
    const beers = readBeers();
    deductStockForOrderItems(order.items, beers);
    writeBeers(beers);

    const deliveryHubs = [
      'BeerStore Hub, MG Road, Bengaluru',
      'BeerStore Hub, Indiranagar, Bengaluru',
      'BeerStore Hub, Koramangala, Bengaluru'
    ];
    const deliveryMinutes = Math.floor(Math.random() * 20) + 25;
    const deliveryHub = deliveryHubs[Math.floor(Math.random() * deliveryHubs.length)];

    orders[orderIdx] = {
      ...order,
      paymentGatewayOrderId: razorpayOrderId,
      paymentGatewayPaymentId: razorpayPaymentId,
      paymentStatus: 'completed',
      status: 'processing',
      deliveryHub,
      estimatedDeliveryMinutes: deliveryMinutes,
      creditStatus: 'credited',
      creditedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeOrders(orders);

    return res.json({
      message: 'Payment verified and order confirmed',
      order: orders[orderIdx]
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Unable to finalize order' });
  }
});

// POST /api/orders - Place an order
router.post('/', authenticateToken, (req, res) => {
  const { items, paymentMethod, paymentProvider, deliveryAddress } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }
  if (!paymentMethod || !['upi', 'card'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Valid payment method required (upi or card)' });
  }
  if (paymentMethod === 'upi' && !['phonepe', 'paytm', 'gpay', 'bhim'].includes(paymentProvider)) {
    return res.status(400).json({ error: 'Valid UPI app required (phonepe, paytm, gpay, bhim)' });
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
    paymentProvider: paymentProvider || paymentMethod,
    paymentStatus: 'completed',
    paymentGateway: 'demo',
    paymentGatewayOrderId: null,
    paymentGatewayPaymentId: null,
    creditedToBank: adminBankDetails,
    creditStatus: 'credited',
    creditedAt: new Date().toISOString(),
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
