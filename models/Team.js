const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: String,
  ownerId: mongoose.Schema.Types.ObjectId,
  format: { type: String, enum: ['1v1', '2v2'], default: '2v2' },
  pokemon: [{
    id: String,
    pokeId: Number,
    name: String
  }],
  // Lié au User MongoDB propriétaire de l'équipe (Phase 3)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);
