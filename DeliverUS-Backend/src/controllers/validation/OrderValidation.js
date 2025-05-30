import { Product } from '../../models/models.js'
import { check } from 'express-validator'

const productsNotZero = async (products) => {
  for (const { productId, quantity } of products) {
    if (quantity < 1) {
      return Promise.reject(new Error(`The quantity is ${quantity} and it must be greater than 0`))
    }

    if (productId < 1) {
      return Promise.reject(new Error(`The productId is ${productId} and it must be greater than 0`))
    }
  }

  return Promise.resolve()
}

const productsAvailable = async (products) => {
  for (const { productId } of products) {
    const product = await Product.findByPk(productId)

    if (!product.availability) {
      return Promise.reject(new Error(`Product ${productId} is not available`))
    }
  }

  return Promise.resolve()
}

const productsSameRestaurant = async (products, { req }) => {
  const restaurantId = req.body.restaurantId

  for (const { productId } of products) {
    const product = await Product.findByPk(productId)

    if (!(product.restaurantId === restaurantId)) {
      return Promise.reject(new Error(`Product ${productId} does not belong to restaurant ${restaurantId}`))
    }
  }

  return Promise.resolve()
}

// TODO: Include validation rules for create that should:
// 1. Check that restaurantId is present in the body and corresponds to an existing restaurant
// 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
// 3. Check that products are available
// 4. Check that all the products belong to the same restaurant
const create = [
  check('address').exists().isString().isLength({ min: 1, max: 255 }).trim(),
  check('restaurantId').exists().isInt({ min: 1 }).toInt(),
  check('products').exists().notEmpty(),
  check('products[*].quantity').exists().custom((_, { req }) => {
    return productsNotZero(req.body.products)
  }),
  check('products').exists().custom(productsAvailable),
  check('products').exists().custom(productsSameRestaurant)

]

const productsSameRestaurantOriginalOrder = async (products, { req }) => {
  const first = await Product.findByPk(products[0].productId)

  for (const { productId } of products) {
    const product = await Product.findByPk(productId)

    if (!(product.restaurantId === first.restaurantId)) {
      return Promise.reject(new Error(`Product ${productId} does not belong to restaurant ${first.restaurantId}`))
    }
  }
  return Promise.resolve()
}

// TODO: Include validation rules for update that should:
// 1. Check that restaurantId is NOT present in the body.
// 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
// 3. Check that products are available
// 4. Check that all the products belong to the same restaurant of the originally saved order that is being edited.
// 5. Check that the order is in the 'pending' state.
const update = [
  check('address').exists().isString().isLength({ min: 1, max: 255 }).trim(),
  check('restaurantId').not().exists(),
  check('products[*].quantity').exists().custom((_, { req }) => {
    return productsNotZero(req.body.products)
  }),
  check('products').exists().custom(productsAvailable),
  check('products').exists().custom(productsSameRestaurantOriginalOrder)
]

export { create, update }
