const mongoose = require('mongoose')
const dotenv = require('dotenv')
const app = require('./app')

process.on('uncaughtException', err => {
  console.log('❌ UNCAUGHT EXCEPTION. Shutting down...')
  console.log(err.name, err.message)
  process.exit(1)
})

// Database configuration
dotenv.config({ path: './config.env' })

const db = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
)

mongoose.connect(db).then(c => {
  console.log('database connection successful!')
})

const PORT = process.env.PORT ?? 8000

// Start the server
const server = app.listen(PORT, () => {
  console.log(`listening server on port: ${PORT}`)
})

process.on('unhandledRejection', err => {
  console.log(err.name, err.message)
  console.log('❌ UNHANDLED REJECTION. Shutting down...')
  server.close(() => {
    process.exit(1)
  })
})

// TEST
