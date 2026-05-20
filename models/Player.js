const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatar: { type: String, default: null }, // data URL JPEG (base64), optionnel
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
  },
  pokemon: [{
    id: String,
    pokeId: Number,
    name: String,
    level: { type: Number, default: 50 }
  }],
  // Lié à un User MongoDB après réclamation (Phase 2). null = fiche disponible.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);
