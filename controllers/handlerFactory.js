const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const APIFeatures = require('./../utils/apiFeatures')

exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {
  // const doc = await Model.findById(req.params.id).populate('reviews')
  let query = Model.findById(req.params.id)
  if (popOptions) query = query.populate(popOptions)
  const doc = await query

  const modelName = Model.modelName.toLowerCase()

  if (!doc) {
    return next(new AppError(`No ${modelName} found with that ID`, 404))
  }
  res.status(200).json({
    status: 'success',
    data: {
      [modelName]: doc
    }
  })
})

exports.getAll = Model => catchAsync(async (req, res, next) => {
  // To allow for nested GET reviews on tour (hack)
  let filter = {}
  if (req.params.tourId) filter = { tour: req.params.tourId }

  // EXECUTE QUERY
  // sería recomendable manejar el error de la DB, mongoose ya se encarga de eso
  const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()

  // const doc = await features.query.explain() // To view indexes
  const doc = await features.query

  const modelName = Model.modelName.toLowerCase()

  // SEND RESPONSE
  res.json({
    status: 'success',
    results: doc.length,
    data: {
      [modelName]: doc
    }
  })
})

exports.createOne = Model => catchAsync(async (req, res, next) => {
  // No hay ningun tipo de error en este caso?
  const doc = await Model.create(req.body)
  const modelName = Model.modelName.toLowerCase()
  res.status(201).json({
    status: 'success',
    data: {
      [modelName]: doc
    }
  })
})

exports.updateOne = Model => catchAsync(async (req, res, next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: 'query'
  })
  const modelName = Model.modelName.toLowerCase()
  if (!doc) {
    return next(new AppError(`No ${modelName} found with that ID`, 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      [modelName]: doc
    }
  })
})

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
  // OBS: cuando el id no tiene el formato de la DB sale un error raro
  // Aplicación de clousures en JS
  const doc = await Model.findByIdAndDelete(req.params.id)
  if (!doc) {
    // return next(new AppError('No document found with that ID', 404))
    // console.log(Model.collection.collectionName)
    return next(new AppError(`Invalid ${Model.modelName.toLowerCase()} ID`, 404))
  }
  res.status(204).json({
    status: 'success',
    data: null
  })
})
