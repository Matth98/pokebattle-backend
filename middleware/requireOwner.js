// middleware/requireOwner.js
/**
 * Factory : retourne un middleware qui vérifie que req.user est propriétaire
 * de la ressource (resource.userId === req.user._id) ou SuperAdmin.
 *
 * @param {mongoose.Model} Model        — Le modèle Mongoose à interroger
 * @param {string}         idParam      — Nom du paramètre de route (défaut : 'id')
 */
const requireOwner = (Model, idParam = 'id') => async (req, res, next) => {
  if (req.user.role === 'superadmin') return next();

  try {
    const resource = await Model.findById(req.params[idParam]);
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' });

    // userId null = donnée existante avant Phase 3, tout utilisateur connecté peut éditer
    if (!resource.userId) return next();

    if (String(resource.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Non autorisé : tu n\'es pas propriétaire de cette ressource' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = requireOwner;
