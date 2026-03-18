const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const beerRoutes = require('./routes/beers');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/beers', beerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BeerStore API is running!' });
});

// Serve frontend build when available.
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🍺 BeerStore API running on http://localhost:${PORT}`);

  // Keep-alive self-ping for Render free tier (prevents 15-min sleep)
  if (process.env.RENDER_EXTERNAL_URL) {
    const https = require('https');
    const pingUrl = process.env.RENDER_EXTERNAL_URL + '/api/health';
    setInterval(() => {
      https.get(pingUrl, (res) => {
        console.log(`[keep-alive] ping ${res.statusCode}`);
      }).on('error', (err) => {
        console.error('[keep-alive] ping failed:', err.message);
      });
    }, 14 * 60 * 1000); // every 14 minutes
    console.log(`[keep-alive] enabled → ${pingUrl}`);
  }
});
