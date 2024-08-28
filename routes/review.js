const express = require('express')
const reviewController = require('./../controllers/review')
const authController = require('./../controllers/auth')

const router = express.Router({ mergeParams: true })

// Nested routes
// With mergeParams: true  the patterns can be:
// POST /tour/[id]/reviews
// POST /reviews

router.use(authController.protect)

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  )

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('admin', 'user'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('admin', 'user'),
    reviewController.deleteReview
  )

module.exports = router
