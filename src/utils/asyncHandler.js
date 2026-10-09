// Express 4 no captura las promesas rechazadas: las pasamos a next().
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
