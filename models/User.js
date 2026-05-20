// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid:  { type: String, required: true, unique: true, index: true },
  email:        { type: String, default: null },
  displayName:  { type: String, default: null },
  role:         { type: String, enum: ['user', 'superadmin'], default: 'user' },
  // Sera renseigné en Phase 2 (liaison User ↔ Player)
  playerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
