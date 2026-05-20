const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const requireAuth = require('./middleware/requireAuth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB avec cache (pattern serverless Vercel)
// Évite de rouvrir une connexion à chaque invocation de la fonction.
let cachedConn = global._mongooseConn;
if (!cachedConn) {
  cachedConn = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cachedConn.conn) return cachedConn.conn;
  if (!cachedConn.promise) {
    cachedConn.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
      })
      .then((m) => {
        console.log('MongoDB connected');
        return m;
      })
      .catch((err) => {
        cachedConn.promise = null; // permet un retry au prochain appel
        console.error('MongoDB error:', err.message);
        throw err;
      });
  }
  cachedConn.conn = await cachedConn.promise;
  return cachedConn.conn;
}

// Garantit qu'on attend la connexion avant de traiter toute requête /api
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed', detail: err.message });
  }
});

// Routes protégées — requireAuth vérifie le token et crée/met à jour req.user
app.use('/api/players', requireAuth, require('./routes/players'));
app.use('/api/teams',   requireAuth, require('./routes/teams'));
app.use('/api/battles', requireAuth, require('./routes/battles'));
app.use('/api/users',   requireAuth, require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState });
});

// app.listen est ignoré par @vercel/node mais utile en local
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

