/**
 * Tests unitaires — middleware errorHandler
 * Pas de DB requise : tests purs du middleware Express.
 */

const errorHandler = require('../src/middleware/errorHandler');

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('gère les erreurs de validation Joi (400)', () => {
    const joiErr = {
      isJoi: true,
      details: [{ message: '"email" is required' }],
    };
    errorHandler(joiErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: '"email" is required' });
  });

  it('gère les erreurs avec statut HTTP personnalisé (404)', () => {
    const err = Object.assign(new Error('Ressource introuvable'), { status: 404 });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Ressource introuvable' });
  });

  it('gère les erreurs avec statut 403', () => {
    const err = Object.assign(new Error('Accès refusé'), { status: 403 });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès refusé' });
  });

  it('utilise le statut 500 par défaut pour les erreurs génériques', () => {
    errorHandler(new Error('crash inattendu'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'crash inattendu' });
  });

  it('utilise le message par défaut si err.message est absent', () => {
    errorHandler({}, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erreur interne du serveur' });
  });

  it('utilise le message par défaut si err est un objet vide sans message', () => {
    errorHandler({ status: 500 }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erreur interne du serveur' });
  });
});
