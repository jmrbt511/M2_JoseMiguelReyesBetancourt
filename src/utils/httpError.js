// Error de aplicación con un código HTTP (capturado por el middleware global).
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
module.exports = HttpError;
