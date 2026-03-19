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

const deliveryPartners = [
  { name: 'Ravi', phone: '9000012345', vehicle: 'KA-01-AB-2244' },
  { name: 'Ajay', phone: '9000012346', vehicle: 'KA-02-CD-7788' },
  { name: 'Kiran', phone: '9000012347', vehicle: 'KA-03-EF-9921' }
];

const hubCoordinates = {
  'BeerStore Hub, MG Road, Bengaluru': { lat: 12.9756, lng: 77.6050 },
  'BeerStore Hub, Indiranagar, Bengaluru': { lat: 12.9784, lng: 77.6408 },
  'BeerStore Hub, Koramangala, Bengaluru': { lat: 12.9352, lng: 77.6245 },
  'BeerStore Hub, Bengaluru': { lat: 12.9716, lng: 77.5946 }
};

const getElapsedMinutes = (fromIso, toIso = new Date().toISOString()) => {
  return Math.max(0, Math.floor((new Date(toIso) - new Date(fromIso)) / 60000));
};

const getAutoStatusFromElapsed = (elapsedMinutes) => {
  if (elapsedMinutes < 2) return 'accepted';
  if (elapsedMinutes < 6) return 'processing';
  if (elapsedMinutes < 10) return 'confirmed';
  if (elapsedMinutes < 20) return 'out_for_delivery';
  return 'delivered';
};

const getDeliveryProgress = (elapsedMinutes) => {
  if (elapsedMinutes <= 10) return 0;
  if (elapsedMinutes >= 20) return 1;
  return (elapsedMinutes - 10) / 10;
};

const selectDeliveryPartner = (orderId = '') => {
  const sum = orderId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return deliveryPartners[sum % deliveryPartners.length];
};

const ensureTimeline = (order) => {
  if (Array.isArray(order.statusTimeline) && order.statusTimeline.length) {
    return order.statusTimeline;
  }

  const createdAt = order.createdAt || new Date().toISOString();
  return [
    {
      status: order.status === 'payment_pending' ? 'payment_pending' : 'accepted',
      label: order.status === 'payment_pending' ? 'Payment pending' : 'Order accepted',
      at: createdAt
    }
  ];
};

const appendStatusIfMissing = (timeline, status, at, label) => {
  if (!timeline.find((entry) => entry.status === status)) {
    timeline.push({ status, at, label });
  }
};

const getDestinationCoordinates = (order) => {
  const base = hubCoordinates[order.deliveryHub] || hubCoordinates['BeerStore Hub, Bengaluru'];
  const seed = order.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const latOffset = ((seed % 12) - 6) * 0.0036;
  const lngOffset = (((seed >> 2) % 12) - 6) * 0.0031;

  return {
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6))
  };
};

const interpolateCoordinates = (origin, destination, progress) => ({
  lat: Number((origin.lat + (destination.lat - origin.lat) * progress).toFixed(6)),
  lng: Number((origin.lng + (destination.lng - origin.lng) * progress).toFixed(6))
});

const hydrateTracking = (order) => {
  const elapsedMinutes = getElapsedMinutes(order.createdAt);
  const progress = getDeliveryProgress(elapsedMinutes);
  const partner = selectDeliveryPartner(order.id);
  const deliveryHub = order.deliveryHub || 'BeerStore Hub, Bengaluru';
  const originCoordinates = hubCoordinates[deliveryHub] || hubCoordinates['BeerStore Hub, Bengaluru'];
  const destinationCoordinates = getDestinationCoordinates(order);
  let currentCoordinates = originCoordinates;

  let locationStatus = 'Preparing at hub';
  let currentLocation = deliveryHub;
  let distanceKm = 6;

  if (order.status === 'confirmed') {
    locationStatus = 'Delivery partner assigned';
    currentLocation = `Partner assigned near ${deliveryHub}`;
    distanceKm = 5.5;
  }

  if (order.status === 'out_for_delivery') {
    currentCoordinates = interpolateCoordinates(originCoordinates, destinationCoordinates, progress);
    if (progress < 0.3) {
      locationStatus = 'Left delivery hub';
      currentLocation = `On route from ${deliveryHub}`;
    } else if (progress < 0.75) {
      locationStatus = 'Near your area';
      currentLocation = 'Approaching your locality';
    } else {
      locationStatus = 'Almost reached';
      currentLocation = 'Very close to your address';
    }
    distanceKm = Math.max(0.2, Number((6 * (1 - progress)).toFixed(1)));
  }

  if (order.status === 'delivered') {
    locationStatus = 'Delivered';
    currentLocation = order.deliveryAddress;
    distanceKm = 0;
    currentCoordinates = destinationCoordinates;
  }

  return {
    acceptedAt: (order.statusTimeline || []).find((t) => t.status === 'accepted')?.at || order.createdAt,
    estimatedArrivalTime: order.estimatedArrivalTime || null,
    etaMinutes: Math.max(0, order.estimatedDeliveryMinutes || 0),
    progress,
    deliveryPartner: {
      ...partner,
      status: locationStatus,
      currentLocation,
      distanceKm,
      currentCoordinates,
      originCoordinates,
      destinationCoordinates
    }
  };
};

const applyAutoTrackingProgress = (order) => {
  if (['cancelled', 'delivered', 'payment_pending'].includes(order.status)) {
    order.statusTimeline = ensureTimeline(order);
    order.tracking = hydrateTracking(order);
    return false;
  }

  const elapsedMinutes = getElapsedMinutes(order.createdAt);
  const desiredStatus = getAutoStatusFromElapsed(elapsedMinutes);
  const statusOrder = ['accepted', 'processing', 'confirmed', 'out_for_delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.status);
  const desiredIndex = statusOrder.indexOf(desiredStatus);
  const timeline = ensureTimeline(order);
  let changed = false;

  if (desiredIndex > currentIndex) {
    order.status = desiredStatus;
    order.updatedAt = new Date().toISOString();
    changed = true;
  }

  appendStatusIfMissing(timeline, 'accepted', order.createdAt, 'Order accepted');
  if (['processing', 'confirmed', 'out_for_delivery', 'delivered'].includes(order.status)) {
    appendStatusIfMissing(timeline, 'processing', order.updatedAt || order.createdAt, 'Order is being prepared');
  }
  if (['confirmed', 'out_for_delivery', 'delivered'].includes(order.status)) {
    appendStatusIfMissing(timeline, 'confirmed', order.updatedAt || order.createdAt, 'Order confirmed by store');
  }
  if (['out_for_delivery', 'delivered'].includes(order.status)) {
    appendStatusIfMissing(timeline, 'out_for_delivery', order.updatedAt || order.createdAt, 'Delivery partner is on the way');
  }
  if (order.status === 'delivered') {
    appendStatusIfMissing(timeline, 'delivered', order.updatedAt || new Date().toISOString(), 'Order delivered successfully');
  }

  order.statusTimeline = timeline;

  if (!order.estimatedArrivalTime && order.estimatedDeliveryMinutes) {
    order.estimatedArrivalTime = new Date(
      new Date(order.createdAt).getTime() + order.estimatedDeliveryMinutes * 60000
    ).toISOString();
    changed = true;
  }

  if (order.estimatedArrivalTime) {
    order.estimatedDeliveryMinutes = Math.max(0, getElapsedMinutes(new Date().toISOString(), order.estimatedArrivalTime));
  }

  order.tracking = hydrateTracking(order);
  return changed;
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

  try {
    const beers = readBeers();
    const { orderItems, total } = buildOrderItemsAndTotal(items, beers);
    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(200).json({
        message: 'Payment gateway not configured. Falling back to demo checkout.',
        payment: {
          mode: 'demo',
          localOrderId: null,
          amount: Math.round(total * 100),
          currency: 'INR'
        }
      });
    }

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
    const createdAt = new Date().toISOString();
    const etaMinutes = Math.floor(Math.random() * 20) + 25;
    const estimatedArrivalTime = new Date(new Date(createdAt).getTime() + etaMinutes * 60000).toISOString();
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
      estimatedDeliveryMinutes: etaMinutes,
      estimatedArrivalTime,
      creditStatus: 'pending',
      creditedToBank: adminBankDetails,
      creditedAt: null,
      statusTimeline: [
        { status: 'payment_pending', label: 'Payment pending', at: createdAt }
      ],
      tracking: null,
      createdAt,
      updatedAt: createdAt
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
      status: 'accepted',
      deliveryHub,
      estimatedDeliveryMinutes: deliveryMinutes,
      estimatedArrivalTime: new Date(new Date(order.createdAt).getTime() + deliveryMinutes * 60000).toISOString(),
      creditStatus: 'credited',
      creditedAt: new Date().toISOString(),
      statusTimeline: [
        ...ensureTimeline(order),
        { status: 'accepted', label: 'Order accepted', at: new Date().toISOString() }
      ],
      updatedAt: new Date().toISOString()
    };

    applyAutoTrackingProgress(orders[orderIdx]);
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

  const createdAt = new Date().toISOString();
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
    creditedAt: createdAt,
    deliveryAddress: deliveryAddress.trim(),
    deliveryHub,
    status: 'accepted',
    estimatedDeliveryMinutes: deliveryMinutes,
    estimatedArrivalTime: new Date(new Date(createdAt).getTime() + deliveryMinutes * 60000).toISOString(),
    statusTimeline: [
      { status: 'accepted', label: 'Order accepted', at: createdAt }
    ],
    tracking: null,
    createdAt,
    updatedAt: createdAt
  };

  applyAutoTrackingProgress(newOrder);

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
  let changed = false;
  const userOrders = orders
    .filter(o => o.userId === req.user.id)
    .map((order) => {
      const orderChanged = applyAutoTrackingProgress(order);
      if (orderChanged) changed = true;
      return order;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (changed) {
    writeOrders(orders);
  }

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

  const changed = applyAutoTrackingProgress(order);
  if (changed) {
    writeOrders(orders);
  }

  res.json(order);
});

// GET /api/orders/:id/live - lightweight live tracking payload for frequent polling
router.get('/:id/live', authenticateToken, (req, res) => {
  const orders = readOrders();
  const order = orders.find((o) => o.id === req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const changed = applyAutoTrackingProgress(order);
  if (changed) {
    writeOrders(orders);
  }

  return res.json({
    id: order.id,
    status: order.status,
    statusTimeline: order.statusTimeline || [],
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    estimatedArrivalTime: order.estimatedArrivalTime,
    tracking: order.tracking || hydrateTracking(order)
  });
});

module.exports = router;
