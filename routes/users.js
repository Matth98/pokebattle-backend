const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Player  = require('../models/Player');

// All these routes receive req.user from requireAuth middleware applied in server.js.

// GET /api/users/me — returns the current MongoDB User
router.get('/me', async (req, res) => {
  res.json(req.user);
});

// PATCH /api/users/me/claim-player — links the User to an existing unclaimed player
router.patch('/me/claim-player', async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId requis' });
  }

  let player;
  try {
    player = await Player.findById(playerId);
  } catch {
    return res.status(400).json({ error: 'playerId invalide' });
  }
  if (!player) return res.status(404).json({ error: 'Joueur introuvable' });
  if (player.userId) return res.status(409).json({ error: 'Ce joueur est déjà réclamé' });

  await Player.findByIdAndUpdate(playerId, { userId: req.user._id, updatedAt: new Date() });
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { playerId, updatedAt: new Date() },
    { new: true }
  );
  res.json(updatedUser);
});

// POST /api/users/me/create-player — creates a new player and links it immediately
router.post('/me/create-player', async (req, res) => {
  const { name, avatar } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name requis' });
  }

  const player = await Player.create({
    name:    name.trim(),
    avatar:  avatar ?? null,
    stats:   { wins: 0, losses: 0 },
    pokemon: [],
    userId:  req.user._id,
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { playerId: player._id, updatedAt: new Date() },
    { new: true }
  );
  res.status(201).json({ user: updatedUser, player });
});

module.exports = router;
