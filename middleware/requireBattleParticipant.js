// middleware/requireBattleParticipant.js
const Battle = require('../models/Battle');

/**
 * Vérifie que req.user est l'un des deux joueurs du combat (player1 ou player2)
 * ou SuperAdmin. Utilisé pour les PUT (modification de combat).
 */
const requireBattleParticipant = async (req, res, next) => {
  if (req.user.role === 'superadmin') return next();

  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Combat introuvable' });

    // createdBy null = combat créé avant Phase 3, autoriser tout utilisateur connecté
    if (!battle.createdBy) return next();

    const userPlayerId = String(req.user.playerId ?? '');
    const isParticipant =
      String(battle.player1) === userPlayerId ||
      String(battle.player2) === userPlayerId;

    if (!isParticipant) {
      return res.status(403).json({ error: 'Non autorisé : tu n\'es pas participant de ce combat' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = requireBattleParticipant;
