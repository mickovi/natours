const express = require('express')
const userController = require('./../controllers/user')
const authController = require('./../controllers/auth')

const router = express.Router()

router.post('/signup', authController.signup)
router.post('/login', authController.login)
router.get('/logout', authController.logout)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

// Middelware to protect all routes below
router.use(authController.protect)

router.patch('/updateMyPassword', authController.updateMyPassword)

router.patch('/updateMyData', userController.updateMyData)
router.delete('/deleteAccount', userController.deleteAccount)

/* router.get(
  '/inactiveUsers', authController.restrictTo('admin'), userController.inactiveUsers
) */

router.get('/me', userController.getInfo, userController.getUser)

router.use(authController.restrictTo('admin'))

router
  .route('/')
  .get(userController.getAllUsers)

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser)

module.exports = router
