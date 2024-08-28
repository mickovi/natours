const AppError = require('../utils/appError')

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`
  console.log(message)
  return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
  const value = err.keyValue.name
  const message = `Duplicate field value: ${value}.`
  return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(obj => obj.message)
  const message = `Invalid input data. ${errors.join('. ')}`
  return new AppError(message, 400)
}

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401)
const handleTokenExpiredError = () => new AppError('Your token has expired!. Please log in again.', 401)

const sendErrorDev = (err, req, res) => {
  // 1) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      /* status: err.status, */ // redundant
      error: err,
      message: err.message,
      stack: err.stack
    })
  }

  // 2) Rendered website
  console.error('ERROR', err)
  return res.status(err.statusCode).render('error', {
    title: 'Somenthing went wrong',
    msg: err.message
  })
}

const sendErrorProd = (err, req, res) => {
  // 1) API
  if (req.originalUrl.startsWith('/api')) {
    // a) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      })
    }
    // b) Programming or other unknown error: don't leak error details
    // Log error
    console.error('ERROR', err)

    // Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    })
  }

  // 2) Rendered website
  // a) Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log('req.originalUrl')
    return res.status(err.statusCode).render('error', {
      title: 'Somenthing went wrong',
      msg: err.message
    })
  }
  // b) Programming or other unknown error: don't leak error details
  // Log error
  console.error('ERROR', err)

  // Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Somenthing went wrong',
    msg: 'Please try again later'
  })
}

module.exports = (err, req, res, next) => {
  // console.log(err.stack)
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res)
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err) // { ...err } // OBS: https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15065218#questions/11651594
    if (err.name === 'CastError') error = handleCastErrorDB(error)
    if (err.code === 11000) error = handleDuplicateFieldsDB(error)
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error)
    if (err.name === 'JsonWebTokenError') error = handleJWTError()
    if (err.name === 'TokenExpiredError') error = handleTokenExpiredError()

    sendErrorProd(error, req, res)
  }
}
