const express = require('express')
const tourController = require('./../controllers/tour')
const authController = require('./../controllers/auth')
const reviewRouter = require('./../routes/review')

const router = express.Router()

router
  .route('/top-5-cheap')
  .get(tourController.aliasTours, tourController.getAllTours)

router
  .route('/tour-stats')
  .get(tourController.getTourStats)

router
  .route('/monthly-plan/:year')
  .get(authController.protect,
    authController.restrictTo('admin', 'guide', 'lead-guide'),
    tourController.getMonthlyPlan
  )

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  )

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin)

router
  .route('/distances/:latlng/unit/:unit')
  .get(tourController.getDistances)

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  )

router.use('/:tourId/reviews', reviewRouter)

/* router.route('/:tourId/reviews')
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.createReview
  ) */

module.exports = router
