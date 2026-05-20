const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const Player = require('../models/Player');
const requireBattleParticipant = require('../middleware/requireBattleParticipant');
const requireBattleCreator     = require('../middleware/requireBattleCreator');

// Helper : applique +1 ou -1 au gagnant et au perdant.
// `delta` doit valoir 1 (combat ajouté) ou -1 (combat annulé / décrément).
// On utilise $inc qui est atomique et qui contourne tout problème de tracking
// de sous-document Mongoose.
const applyStatsDelta = async ({ player1Id, player2Id, winner, delta }) => {
  if (!winner || !player1Id || !player2Id) return; // pas de gagnant = pas de stats
  const winnerId = winner === 'player1' ? player1Id : player2Id;
  const loserId = winner === 'player1' ? player2Id : player1Id;
  await Promise.all([
    Player.updateOne({ _id: winnerId }, { $inc: { 'stats.wins': delta } }),
    Player.updateOne({ _id: loserId }, { $inc: { 'stats.losses': delta } }),
  ]);
};

// Garantit qu'aucune stat ne devient négative — utile au cas où la base ait
// déjà été corrompue par d'anciens bugs.
const clampNegativeStats = async (playerIds) => {
  const players = await Player.find({ _id: { $in: playerIds } });
  await Promise.all(
    players.map((p) => {
      const updates = {};
      if ((p.stats?.wins ?? 0) < 0) updates['stats.wins'] = 0;
      if ((p.stats?.losses ?? 0) < 0) updates['stats.losses'] = 0;
      if (Object.keys(updates).length === 0) return Promise.resolve();
      return Player.updateOne({ _id: p._id }, { $set: updates });
    })
  );
};

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
    const battle = new Battle({ ...req.body, createdBy: req.user._id });
    await battle.save();

    await applyStatsDelta({
      player1Id: battle.player1,
      player2Id: battle.player2,
      winner: battle.winner,
      delta: +1,
    });

    const populatedBattle = await Battle.findById(battle._id)
      .populate('player1', 'name')
      .populate('player2', 'name');
    res.status(201).json(populatedBattle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT mettre à jour un combat
router.put('/:id', requireBattleParticipant, async (req, res) => {
  try {
    const oldBattle = await Battle.findById(req.params.id);
    if (!oldBattle) return res.status(404).json({ error: 'Battle not found' });

    // 1) Annuler les stats correspondant à l'ANCIEN état (anciens joueurs + ancien gagnant)
    await applyStatsDelta({
      player1Id: oldBattle.player1,
      player2Id: oldBattle.player2,
      winner: oldBattle.winner,
      delta: -1,
    });

    // 2) Mettre à jour le combat
    const battle = await Battle.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    // 3) Appliquer les stats du NOUVEL état (nouveaux joueurs + nouveau gagnant)
    await applyStatsDelta({
      player1Id: battle.player1,
      player2Id: battle.player2,
      winner: battle.winner,
      delta: +1,
    });

    // Filet de sécurité : remet à 0 toute stat qui aurait pu virer négative
    await clampNegativeStats([
      oldBattle.player1,
      oldBattle.player2,
      battle.player1,
      battle.player2,
    ]);

    const populated = await Battle.findById(battle._id)
      .populate('player1', 'name')
      .populate('player2', 'name');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE un combat
router.delete('/:id', requireBattleCreator, async (req, res) => {
  try {
    const battle = await Battle.findByIdAndDelete(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    await applyStatsDelta({
      player1Id: battle.player1,
      player2Id: battle.player2,
      winner: battle.winner,
      delta: -1,
    });

    await clampNegativeStats([battle.player1, battle.player2]);

    res.json({ message: 'Battle deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
