const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  const err = new Error(message);
  err.statusCode = 400;
  err.status = 'fail';

  return next(err);
};
const handleJWTError = (error) => {
  const err = new Error('Invalid Token. Please Login again');
  err.status = 'fail';
  err.statusCode = 401;
  return next(err);
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };

  if (err.name === 'CastError') err = handleCastErrorDB(err);
  if (err.name === 'JsonWebTokenError') err = handleJWTError(err);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
