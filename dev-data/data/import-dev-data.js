const fs = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const User = require('./../../models/mongodb/user')
const Tour = require('./../../models/mongodb/tour')
const Review = require('./../../models/mongodb/review')

dotenv.config({ path: './config.env' })

const db = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
)

mongoose.connect(db).then(c => {
  console.log('database connection successful!')
})

// READ JSON FILE
const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8'))
const tours = JSON.parse(fs.readFileSync(path.join(__dirname, 'tours.json'), 'utf-8'))
const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'reviews.json'), 'utf-8'))

// IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    await User.create(users, { validateBeforeSave: false })
    await Tour.create(tours)
    await Review.create(reviews)
    console.log('🆗 Data successfully loaded!')
    process.exit()
  } catch (err) {
    console.log(err)
  }
}

// DELETE ALL DATA FROM DATABASE COLLECTION
const deleteData = async () => {
  try {
    await User.deleteMany()
    await Tour.deleteMany()
    await Review.deleteMany()
    console.log('🆗 Old data successfully deleted!')
    process.exit()
  } catch (err) {
    console.log(err)
  }
}

if (process.argv[2] === '--import') {
  importData()
} else if (process.argv[2] === '--delete') {
  deleteData()
}
