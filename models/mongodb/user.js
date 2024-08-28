const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE
      validator: function (el) {
        return el === this.password
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    enum: ['false', 'true'],
    default: true,
    select: false
  }
})

// TODO: Solo debe crear un usuario admin
// OBS: Para importar data a la BD comentar los dos middelware de abajo
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next()

  // Hash the password with cost 12
  this.password = await bcrypt.hash(this.password, 12)

  // Delete passwordConfirm field
  this.passwordConfirm = undefined

  next()
})

userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password') || this.isNew) return next()

  this.passwordChangedAt = Date.now()// Date.now() - 1000
  // console.log(new Date(this.passwordChangedAt))

  next()
})

userSchema.pre(/^find/, function (next) {
  // "this" points to the current query
  // if (this.role === 'user') this.find({ active: true })
  // his.find({ active: { $ne: false } })
  this.find({ active: true })
  // console.log(this.role) // undefined

  next()
})

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
    return JWTTimestamp < changedTimeStamp
  }

  return false
}

userSchema.methods.createPasswordResetToken = function () {
  /*
    We chose "sha256" hashing function, which is a very fast operation
    (as opposed to bcrypt's slow hashing function), which is why we don't
    need to do this operation asynchronously, as it takes less than a
    millisecond to complete. The downside to this is that possible attackers
    can compare our hash to a list of commonly used passwords a lot more times
    in a given time frame then if using bcrypt, which is a slow operation.
    So you can do millions of password checks in the same amount of time that
    it takes to make 1 check using bcrypt. However, this is not a problem here as:
    a) we used a very long and very random password (as opposed to user generated
      passwords, which usually have meaning and are far from random) and
    b) our password is only valid for 10 minutes, so there is literally zero
    hance for the attacker to guess the password in that short amount of time.
  */

  // Create a new, temporary password for the user
  const resetToken = crypto.randomBytes(32).toString('hex')

  // Create the hashed version of this password
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  // console.log({ resetToken }, this.passwordResetToken)

  // Password expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User
