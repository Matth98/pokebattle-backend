// middleware/requireBattleCreator.js
const Battle = require('../models/Battle');

/**
 * Vérifie que req.user a créé le combat (battle.createdBy === req.user._id)
 * ou est SuperAdmin. Utilisé pour les DELETE (suppression de combat).
 */
const requireBattleCreator = async (req, res, next) => {
  if (req.user.role === 'superadmin') return next();

  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Combat introuvable' });

    // createdBy null = combat créé avant Phase 3, autoriser tout utilisateur connecté
    if (!battle.createdBy) return next();

    if (String(battle.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Non autorisé : seul le créateur peut supprimer ce combat' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = requireBattleCreator;
