const mongoose = require('mongoose')
const Tour = require('./tour')

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'Review can not be empty']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Review must belong to a tour']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user']
  }
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false
})

reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

// calcAverageRatings is a static method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ])
  // console.log(stats)

  if (stats.length > 0) {
    // Save the result in the current tour
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    })
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 1
    })
  }
}

/*
  In Mongoose, a "document" generally means an instance of a model, or other word: model creates document.
  So when we call `this.constructor` in middleware `pre("save", fn)`, the `constructor` prop will return a
  reference to Model constructor that create the current document.
*/

/*
  We are actually performing an asynchronous operation inside our post save hook, but we only have a single
  post save hook in our model, which means we don't have to wait for it to finish or execute multiple post
  save hooks in specific order. If we had another post save hook that would for example send some tour rating
  analytics to lead guide so he can adjust / improve the tour, then we would need to use the asynchronous version
  of the middleware to first make sure our tour rating calculation has completed execution and only then send the
  updated analytics to the guide...
*/

// Call the function after the review has been created (this middelware doesn't use next())
reviewSchema.post('save', function () {
  // "this" point to current review
  this.constructor.calcAverageRatings(this.tour)
})

reviewSchema.pre(/^find/, function (next) {
  /* this.populate({
    path: 'tour',
    select: 'name'
  }).populate({
    path: 'user',
    select: 'name'
  }) */
  this.populate({
    path: 'user',
    select: 'name photo'
  })
  next()
})

/* reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.clone().findOne(this.getQuery())
  // const r = await this.model.findOne(this.getQuery())
  // console.log(this.r)
  next()
})

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour)
}) */

// Another solution
/*
  In post query middleware, we get "docs" parameter which is
  nothing but the executed document. Since we have the document,
  we can use constructor on that to get the model ie docs.constructor.
  Now since we have model, we know that we can directly call statics
  method on that. That is what I have done.
  NOTE:
  Like I mentioned earlier, Jonas said that this.findOne() will not work
  inside post query middleware. Actually, it will work now.
*/

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcAverageRatings(doc.tour)
})

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review
