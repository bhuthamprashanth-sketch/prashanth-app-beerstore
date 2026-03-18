const express = require('express');
const { readBeers, writeBeers } = require('../data/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/beers - Public: get all beers
router.get('/', (req, res) => {
  const beers = readBeers();
  res.json(beers);
});

// GET /api/beers/:id
router.get('/:id', (req, res) => {
  const beers = readBeers();
  const beer = beers.find(b => b.id === parseInt(req.params.id));
  if (!beer) return res.status(404).json({ error: 'Beer not found' });
  res.json(beer);
});

// PUT /api/beers/:id/stock - Admin only
router.put('/:id/stock', authenticateToken, requireAdmin, (req, res) => {
  const { stock } = req.body;
  if (stock === undefined || stock < 0) {
    return res.status(400).json({ error: 'Valid stock quantity required' });
  }

  const beers = readBeers();
  const idx = beers.findIndex(b => b.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Beer not found' });

  beers[idx].stock = parseInt(stock);
  writeBeers(beers);

  res.json({ message: 'Stock updated', beer: beers[idx] });
});

// PUT /api/beers/:id/price - Admin only
router.put('/:id/price', authenticateToken, requireAdmin, (req, res) => {
  const { price } = req.body;
  if (!price || price <= 0) {
    return res.status(400).json({ error: 'Valid price required' });
  }

  const beers = readBeers();
  const idx = beers.findIndex(b => b.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Beer not found' });

  beers[idx].price = parseFloat(price);
  writeBeers(beers);

  res.json({ message: 'Price updated', beer: beers[idx] });
});

module.exports = router;
