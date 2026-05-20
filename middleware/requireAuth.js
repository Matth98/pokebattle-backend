// middleware/requireAuth.js
const admin = require('firebase-admin');
const User  = require('../models/User');

// Initialisation de l'Admin SDK (une seule fois, pattern serverless)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } catch (err) {
    // En environnement de test, les variables d'env Firebase peuvent être absentes.
    // L'erreur sera levée lors du premier appel réel à admin.auth().verifyIdToken().
    console.warn('[requireAuth] Firebase Admin SDK non initialisé :', err.message);
  }
}

/**
 * Vérifie le token JWT Firebase, crée ou met à jour le User en base (upsert),
 * attache req.user pour les middlewares suivants.
 */
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié : header Authorization manquant' });
  }

  try {
    const token   = header.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(token);

    const user = await User.findOneAndUpdate(
      { firebaseUid: decoded.uid },
      {
        $set: {
          email:       decoded.email ?? null,
          displayName: decoded.name ?? decoded.email?.split('@')[0] ?? 'Joueur',
          updatedAt:   new Date(),
        },
        $setOnInsert: {
          firebaseUid: decoded.uid,
          role:        'user',
          playerId:    null,
          createdAt:   new Date(),
        },
      },
      { upsert: true, new: true }
    );

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

module.exports = requireAuth;
