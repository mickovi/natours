const express = require('express')
const morgan = require('morgan')
const path = require('node:path')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xssClean = require('xss-clean')
const hpp = require('hpp')
const cookieParser = require('cookie-parser')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/error')
const tourRouter = require('./routes/tour')
const userRouter = require('./routes/user')
const reviewRouter = require('./routes/review')
const viewRouter = require('./routes/view')

const app = express()

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// 1) GLOBAL MIDDELWARES

// Set security HTTP headers
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }))

// Further HELMET configuration for Security Policy (CSP)
const scriptSrcUrls = ['cdnjs.cloudflare.com', 'https://unpkg.com/', 'https://tile.openstreetmap.org']
const styleSrcUrls = [
  'cdnjs.cloudflare.com',
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/'
]
const connectSrcUrls = [
  'cdnjs.cloudflare.com', 'https://unpkg.com', 'https://tile.openstreetmap.org']
const fontSrcUrls = [
  'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com']

// Set security http headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", ...fontSrcUrls]
    }
  })
)

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')) // HTTP request logger
}

// Limit request from same API
const limiter = rateLimit({
  max: 5,
  windowMilliseconds: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour.'
})
app.use('/api', limiter)

// Body parser, reading data from the body into req.doby
app.use(express.json({ limit: '10kb' }))

// Parser data from the cookies
app.use(cookieParser())

// Data sanitization against NoSQL query injection
app.use(mongoSanitize())

// Data sanitization against XSS
app.use(xssClean())

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['duration', 'ratingsAverage', 'ratingsQuantity', 'difficulty', 'price']
}))

// Server static files
app.use(express.static(path.join(__dirname, 'public')))

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toUTCString()
  // console.log(req.cookies) // Access to cookies
  next()
})

// 2) ROUTES
app.use('/', viewRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)

// This middleware catch any bad url and show a custom message.
app.all('*', (req, _, next) => {
  /* res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.originalUrl} on this server.`
  }) */
  /* const err = new Error(`Cannot find ${req.originalUrl} on this server.`)
  err.status = 'fail'
  err.statusCode = 404

  next(err) */

  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404))
})

app.use(globalErrorHandler)

module.exports = app
