const { promisify } = require('util')
const User = require('./../models/mongodb/user')
const AppError = require('./../utils/appError')
const catchAsync = require('./../utils/catchAsync')
const jwt = require('jsonwebtoken')
const sendEmail = require('./../utils/email')
const crypto = require('crypto')

const signToken = id => {
  return jwt.sign(
    { id },
    process.env.JWT_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 60 * 1000), // milliseconds
    httpOnly: true // prevent XSS attacks
  }

  if (process.env.NODE_ENV === 'production') {
    // Use https protocol
    cookieOptions.secure = true
  }

  res.cookie('jwt', token, cookieOptions)

  // Remove password from output client
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  })
}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  })

  createSendToken(newUser, 201, res)

  /* const token = signToken(newUser._id)

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser
    }
  }) */
})

// node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400))
  }

  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  // 3) If everything OK, send token to client
  createSendToken(user, 200, res)
  /* const token = signToken(user._id)
  res.status(200).json({
    status: 'success',
    token
  }) */
})

exports.logout = (req, res, next) => {
  console.log(req)
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  })
  res.status(200).json({ status: 'success' })
}

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's here
  let token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt
  }
  // console.log(token)
  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401))
  }

  /*
    jwt.verify() without a callback is synchronous version https://github.com/auth0/node-jsonwebtoken.
    Using await here have no effect on this function at all.Using async version with callback =>
    you have to add a code block for callback and then wrap all the following code in that block so
    that they won't be executed before your "decode" value is ready. Using promisify() turn your callback
    into a promise, only throw value when it is ready, and "await" wait for it to finish before execute next command => code looks more clean

    The .verify method is an asynchronous operation. We need to await the result of the operation before we can use that result later in our code.
    The problem is, unlike most other asynchronous operations we've worked with up to this point, .verify does not return a promise. Therefore,
    we cannot use async/await syntax on it. However, since Jonas wants to keep things consistent and use async/await for everything,
    he uses promisify to force .verify to return a promise.
  */

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_KEY)

  /* const decoded = await jwt.verify(
    token,
    process.env.JWT_SECRET,
    {}, // passing an empty options object to get to callback
    (err, value) => {
      if (err) {
        return next(new AppError('Error', 401))
      }
      return value;
    }
  ) */

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401))
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User receltly changed password!. Please log in again', 401))
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser
  next()
})

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  // console.log(req.cookies.jwt)
  if (req.cookies.jwt) {
    // 1) Verification token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_KEY
    )

    /* if (!decoded) {
      return next()
    } */

    // 2) Check if user still exists
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) {
      return next()
    }

    // 3) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next()
    }

    // THERE IS A LOGGED IN USER
    res.locals.user = currentUser // pug templates has access to req.locals
    return next()
  } else next() // If there is no cookie, just call the next middelware
})

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403))
    }
    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404))
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken()

  // Add the fields passwordResetToken and passwordResetExpires to the document
  await user.save({ validateModifiedOnly: true })

  // 3) Send it to user's mail
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

  const message = `Forget your password? Submit a PATCH request with your new password and
  + to ${resetURL}.\nIf you didn't forget your password, please ignore this email.`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (only valid for 10 minutes)',
      message
    })

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save({ validateModifiedOnly: true })
    // console.log(err)
    return next(
      new AppError('There was an error sending the email. Try again later!', 500)
    )
  }
  // OBS: qué pasa si el usuario nunca abre el enlace? Los campos passwordResetToken y passwordResetExpires
  // ocuparán espacio en la BD. Se deberían esos campos.
})

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })

  // 2) If token has not expired, and there is user , set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400))
  }
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined

  await user.save()

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res)
  /* const token = signToken(user._id)

  res.status(200).json({
    status: 'success',
    token
  }) */
})

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password')

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong. Try again.', 401))
  }

  // 3) If so, update password
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm

  await user.save()
  // OBS: User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res)
})
