const Review = require('./../models/mongodb/review')
// const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')

/* exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {}
  if (req.params.tourId) filter = { tour: req.params.tourId }
  const reviews = await Review.find(filter)
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  })
}) */

exports.setTourUserIds = (req, _, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId
  /*
    Hi, later in a course I bumped onto a small bug. In setTourUserIds
    function we take user id from req.user.id, but only when there is no
    user field on request. Because of that, we can add a review as someone
    else, simply passing someone else's id into the request. In my opinion
    this function should look like this
  */
  // if (!req.body.user) req.body.user = req.user.id
  req.body.user = req.user.id
  next()
}

exports.getAllReviews = factory.getAll(Review)
exports.getReview = factory.getOne(Review)
exports.createReview = factory.createOne(Review)
exports.updateReview = factory.updateOne(Review)
exports.deleteReview = factory.deleteOne(Review)
