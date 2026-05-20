const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
  format: { type: String, enum: ['1v1', '2v2'], required: true },
  player1: mongoose.Schema.Types.ObjectId,
  player2: mongoose.Schema.Types.ObjectId,
  date: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  winner: { type: String, enum: ['player1', 'player2'] },
  notes: String,
  team1: [{
    id: String,
    pokeId: Number,
    name: String,
    eliminated: { type: Boolean, default: false }
  }],
  team2: [{
    id: String,
    pokeId: Number,
    name: String,
    eliminated: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Utilisateur ayant créé le combat (requis pour les droits de suppression — Phase 3)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

module.exports = mongoose.model('Battle', battleSchema);
