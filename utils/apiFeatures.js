class APIFeatures {
  constructor(query, reqQuery) {
    this.query = query
    this.reqQuery = reqQuery
  }

  filter() {
    // TODO: si la URL es malformada retorna todos los documentos, ejm: page=3limit=2.
    // Debe retornar Error 400 bad request
    const { page, sort, limit, fields, ...rest } = this.reqQuery
    // Advance filtering
    let queryStr = JSON.stringify(rest)
    queryStr = queryStr.replace(/\b(gte?|lte?)\b/g, match => `$${match}`)

    this.query = this.query.find(JSON.parse(queryStr))

    return this
  }

  sort() {
    if (this.reqQuery.sort) {
      const sortBy = this.reqQuery.sort.split(',').join(' ')
      this.query = this.query.sort(sortBy)
    } /* else {
      query = this.query.sort('-createdAt')
    } */

    return this
  }

  limitFields() {
    if (this.reqQuery.fields) {
      const fields = this.reqQuery.fields.split(',').join(' ')
      this.query = this.query.select(fields) // projecting
    } else {
      // this.query = this.query.select('-__v -_id') // exclude the __v and _id fields
      this.query = this.query.select('-__v') // exclude the __v field
    }

    return this
  }

  paginate() {
    const page = Number(this.reqQuery.page) ?? 1
    const limit = Number(this.reqQuery.limit) ?? 100
    const skip = (page - 1) * limit
    // TODO:skip y limit son muy costosos con muchos documentos. Usar el patrón bucket.
    this.query = this.query.skip(skip).limit(limit)
    /* if (this.reqQuery.page) {
      const numTours = await Tour.countDocuments()
      if (skip >= numTours) throw new Error('This page does not exist')
    } */

    return this
  }
}

module.exports = APIFeatures
