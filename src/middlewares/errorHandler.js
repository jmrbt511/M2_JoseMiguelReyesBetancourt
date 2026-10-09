const HttpError = require('../utils/httpError');

const notFound = (req, res) => {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.originalUrl}` });
};

// Mensajes legibles para los errores de restricciones de PostgreSQL
const PG_UNIQUE_MESSAGES = { authors_email_key: 'Cet e-mail est déjà utilisé' };

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalide' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corps de requête trop volumineux' });
  }

  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({ error: PG_UNIQUE_MESSAGES[err.constraint] || 'Cette ressource existe déjà' });
    case '23503': // foreign_key_violation
      return res.status(400).json({ error: 'Référence invalide (clé étrangère)' });
    case '23502': // not_null_violation
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
    case '22001': // string_data_right_truncation
    case '22003': // numeric_value_out_of_range
      return res.status(400).json({ error: 'Données invalides' });
    default:
  }

  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
};

module.exports = { notFound, errorHandler };
