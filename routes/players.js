const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Battle = require('../models/Battle');
const requireOwner = require('../middleware/requireOwner');

// POST recompute-stats : recalcule les stats victoires/défaites de chaque joueur
// à partir des combats existants. À appeler ponctuellement si les stats ont
// divergé suite à un ancien bug.
router.post('/recompute-stats', async (req, res) => {
  try {
    const battles = await Battle.find();
    // Map<playerId, {wins, losses}>
    const stats = new Map();
    const bump = (playerId, key) => {
      const id = String(playerId);
      const s = stats.get(id) || { wins: 0, losses: 0 };
      s[key] += 1;
      stats.set(id, s);
    };
    for (const b of battles) {
      if (b.winner === 'player1' && b.player1 && b.player2) {
        bump(b.player1, 'wins');
        bump(b.player2, 'losses');
      } else if (b.winner === 'player2' && b.player1 && b.player2) {
        bump(b.player2, 'wins');
        bump(b.player1, 'losses');
      }
    }
    const players = await Player.find();
    let updated = 0;
    for (const p of players) {
      const s = stats.get(String(p._id)) || { wins: 0, losses: 0 };
      await Player.updateOne(
        { _id: p._id },
        { $set: { 'stats.wins': s.wins, 'stats.losses': s.losses } }
      );
      updated++;
    }
    res.json({ message: 'Stats recalculées', playersUpdated: updated, battlesCounted: battles.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tous les joueurs
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET un joueur
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer un joueur
router.post('/', async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /:id/pokemon — met à jour uniquement le roster Pokémon d'un joueur.
// Exception aux règles de propriété : tout utilisateur authentifié peut appeler
// cet endpoint. Usage principal : sync automatique des rosters lors de la
// création d'un combat (les 2 joueurs reçoivent leurs nouveaux Pokémon).
router.patch('/:id/pokemon', async (req, res) => {
  try {
    const { pokemon } = req.body;
    if (!Array.isArray(pokemon)) {
      return res.status(400).json({ error: '"pokemon" doit être un tableau' });
    }
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { pokemon, updatedAt: Date.now() },
      { new: true }
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT mettre à jour un joueur
router.put('/:id', requireOwner(Player), async (req, res) => {
  try {
    // IMPORTANT : on retire `stats` du payload — les stats victoires/défaites
    // sont gérées exclusivement par les routes /api/battles (incréments/décréments).
    // Si on les laissait passer, un PUT joueur fait juste après un POST combat
    // écraserait l'incrément côté serveur avec une valeur stale du client.
    const { stats, ...rest } = req.body;

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { ...rest, updatedAt: Date.now() },
      { new: true }
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE un joueur
router.delete('/:id', requireOwner(Player), async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
