const mongoose = require('mongoose')
const slugify = require('slugify')
const User = require('./user')

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
    trim: true,
    maxlength: [40, 'A tour name must have less or equal then 40 characters'],
    minlength: [10, 'A tour name must have more or equal then 10 characters']
  },
  slug: String,
  duration: {
    type: Number,
    required: [true, 'A tour must have a duration']
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'A tour must have a group size']
  },
  difficulty: {
    type: String,
    required: [true, 'A tour must have a difficulty'],
    enum: {
      values: ['easy', 'medium', 'difficult'], /* TODO: case sensitive */
      message: 'Difficulty is either: easy or medium or difficult'
    }
  },
  ratingsAverage: {
    type: Number,
    default: 1,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: val => val.toPrecision(3)
    // set: val => Math.round(val * 10) / 10
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price']
  },
  /* priceDiscount: Number, */
  priceDiscount: {
    type: Number,
    validate: {
      validator: function (val) {
        // console.log(this.op)
        if (this.op === 'find') {
          console.log(this.getUpdate().$set.priceDiscount)
          // console.log(this.getUpdate().$set.price) // tengo que colocar el precio :(
          console.log(this.price)
          return (
            this.getUpdate().$set.priceDiscount < this.get('price') // cuando es update price es del query
          )
        }
        return val < this.price // cuando es create price es del documento
      },
      message: 'Discount ({VALUE}) should be below regular price'
    }
  },
  summary: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    requried: [true, 'A tour must have a duration']
  },
  imageCover: {
    type: String,
    required: [true, 'A tour must have a image coever']
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  },
  startDates: [Date],
  secretTour: {
    type: Boolean,
    default: false
  },
  startLocation: {
    // GeoJSON
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    address: String,
    description: String
  },
  locations: [
    {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String,
      day: Number
    }
  ],
  /* guides: Array */
  guides: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  ]
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false
})

// tourSchema.index({ price: 1 })
tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationWeeks').get(function () {
  if (this.duration) return (this.duration / 7).toFixed(2)
})

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
})

// Document Middleware: runs before .save() and .create()
// It doesn't run on update()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true })
  next()
})

/*
  User.findById(id) actually returns a Query, not a Promise, so "guidesPromises"
  holds an array of Queries if you write it that way. In this particular case that
  code still works, but only because Mongoose Queries return a thenable (being able
  to call a .then() method on them), which will act as a Promise, but this is not
  the best way to do it... We should manually execute a Query with .exec() method
  in this case, which will return a proper Promise:
*/

tourSchema.pre('save', async function (doc, next) {
  const guidesPromises = this.guides.map(id => User.findById(id).exec())
  this.guides = await Promise.all(guidesPromises)
  // next()
})

/*
tourSchema.post('save', function (doc, next) {
  console.log(doc)
  next()
}) */

// Query Middelware
// This query executes when Tour.find executes first.
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } })
  this.start = Date.now()
  next()
})

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  })
  next()
})

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`)
  next()
})

// Aggregation Middelware
/* tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } })
  // console.log(this.pipeline())
  next()
})
 */
const Tour = mongoose.model('Tour', tourSchema)

module.exports = Tour
