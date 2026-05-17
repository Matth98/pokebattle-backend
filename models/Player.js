const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);
