const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const Player = require('../models/Player');

// GET tous les combats
router.get('/', async (req, res) => {
  try {
    const battles = await Battle.find()
      .populate('player1', 'name')
      .populate('player2', 'name')
      .sort({ timestamp: -1 });
    res.json(battles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET un combat
router.get('/:id', async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id)
      .populate('player1', 'name')
      .populate('player2', 'name');
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    res.json(battle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer un combat
router.post('/', async (req, res) => {
  try {
    const battle = new Battle(req.body);
    await battle.save();

    // Mettre à jour les stats des joueurs
    const p1 = await Player.findById(battle.player1);
    const p2 = await Player.findById(battle.player2);

    if (battle.winner === 'player1' && p1 && p2) {
      p1.stats.wins += 1;
      p2.stats.losses += 1;
    } else if (battle.winner === 'player2' && p1 && p2) {
      p1.stats.losses += 1;
      p2.stats.wins += 1;
    }

    if (p1) await p1.save();
    if (p2) await p2.save();

    const populatedBattle = await Battle.findById(battle._id)
      .populate('player1', 'name')
      .populate('player2', 'name');
    res.status(201).json(populatedBattle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT mettre à jour un combat
router.put('/:id', async (req, res) => {
  try {
    const oldBattle = await Battle.findById(req.params.id);
    if (!oldBattle) return res.status(404).json({ error: 'Battle not found' });

    // Annuler les stats anciennes
    const p1 = await Player.findById(oldBattle.player1);
    const p2 = await Player.findById(oldBattle.player2);

    if (oldBattle.winner === 'player1' && p1 && p2) {
      p1.stats.wins = Math.max(0, p1.stats.wins - 1);
      p2.stats.losses = Math.max(0, p2.stats.losses - 1);
    } else if (oldBattle.winner === 'player2' && p1 && p2) {
      p1.stats.losses = Math.max(0, p1.stats.losses - 1);
      p2.stats.wins = Math.max(0, p2.stats.wins - 1);
    }

    // Ajouter les stats nouvelles
    if (req.body.winner === 'player1' && p1 && p2) {
      p1.stats.wins += 1;
      p2.stats.losses += 1;
    } else if (req.body.winner === 'player2' && p1 && p2) {
      p1.stats.losses += 1;
      p2.stats.wins += 1;
    }

    if (p1) await p1.save();
    if (p2) await p2.save();

    const battle = await Battle.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate('player1', 'name').populate('player2', 'name');

    res.json(battle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE un combat
router.delete('/:id', async (req, res) => {
  try {
    const battle = await Battle.findByIdAndDelete(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    // Annuler les stats
    const p1 = await Player.findById(battle.player1);
    const p2 = await Player.findById(battle.player2);

    if (battle.winner === 'player1' && p1 && p2) {
      p1.stats.wins = Math.max(0, p1.stats.wins - 1);
      p2.stats.losses = Math.max(0, p2.stats.losses - 1);
    } else if (battle.winner === 'player2' && p1 && p2) {
      p1.stats.losses = Math.max(0, p1.stats.losses - 1);
      p2.stats.wins = Math.max(0, p2.stats.wins - 1);
    }

    if (p1) await p1.save();
    if (p2) await p2.save();

    res.json({ message: 'Battle deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
