// eslint-disable-next-line no-unused-vars
import { Order, Product, Restaurant, User, sequelizeSession } from '../models/models.js'
import moment from 'moment'
import { Op } from 'sequelize'
const generateFilterWhereClauses = function (req) {
  const filterWhereClauses = []
  if (req.query.status) {
    switch (req.query.status) {
      case 'pending':
        filterWhereClauses.push({
          startedAt: null
        })
        break
      case 'in process':
        filterWhereClauses.push({
          [Op.and]: [
            {
              startedAt: {
                [Op.ne]: null
              }
            },
            { sentAt: null },
            { deliveredAt: null }
          ]
        })
        break
      case 'sent':
        filterWhereClauses.push({
          [Op.and]: [
            {
              sentAt: {
                [Op.ne]: null
              }
            },
            { deliveredAt: null }
          ]
        })
        break
      case 'delivered':
        filterWhereClauses.push({
          sentAt: {
            [Op.ne]: null
          }
        })
        break
    }
  }
  if (req.query.from) {
    const date = moment(req.query.from, 'YYYY-MM-DD', true)
    filterWhereClauses.push({
      createdAt: {
        [Op.gte]: date
      }
    })
  }
  if (req.query.to) {
    const date = moment(req.query.to, 'YYYY-MM-DD', true)
    filterWhereClauses.push({
      createdAt: {
        [Op.lte]: date.add(1, 'days') // FIXME: se pasa al siguiente día a las 00:00
      }
    })
  }
  return filterWhereClauses
}

// Returns :restaurantId orders
const indexRestaurant = async function (req, res) {
  const whereClauses = generateFilterWhereClauses(req)
  whereClauses.push({
    restaurantId: req.params.restaurantId
  })
  try {
    const orders = await Order.findAll({
      where: whereClauses,
      include: {
        model: Product,
        as: 'products'
      }
    })
    res.json(orders)
  } catch (err) {
    res.status(500).send(err)
  }
}

// TODO: Implement the indexCustomer function that queries orders from current logged-in customer and send them back.
// Orders have to include products that belongs to each order and restaurant details
// sort them by createdAt date, desc.
const indexCustomer = async function (req, res) {
  try {
    const orders = await Order.findAll({
      where: [
        {
          userId: req.user.id
        }
      ],
      include: [
        {
          model: Product,
          as: 'products'
        },
        {
          model: Restaurant,
          as: 'restaurant'
        }
      ],
      order: [
        [
          'createdAt',
          'DESC'
        ]
      ]
    })

    res.send(orders)
  } catch (err) {
    res.status(500).send(err)
  }
}

// TODO: Implement the create function that receives a new order and stores it in the database.
// Take into account that:
// 1. If price is greater than 10€, shipping costs have to be 0.
// 2. If price is less or equals to 10€, shipping costs have to be restaurant default shipping costs and have to be added to the order total price
// 3. In order to save the order and related products, start a transaction, store the order, store each product linea and commit the transaction
// 4. If an exception is raised, catch it and rollback the transaction

const priceAndShippingCosts = async (restaurantId, price) => {
  let orderPrice = price
  const restaurant = await Restaurant.findByPk(restaurantId)
  let shippingCosts = restaurant.shippingCosts
  if (orderPrice > 10) {
    shippingCosts = 0
  } else {
    orderPrice += shippingCosts
  }
  return [orderPrice, shippingCosts]
}

const arrayProductsQuantity = async (products, { transaction }) => {
  const productsArray = []
  for (const i of products) {
    const readProduct = await Product.findByPk(i.productId, { transaction })
    productsArray.push({ product: readProduct, quantity: i.quantity })
  }
  return productsArray
}

const totalPrice = async (arrayProductsQuantity) => {
  let finalPrice = 0
  for (const i of arrayProductsQuantity) {
    finalPrice += i.product.price * i.quantity
  }
  return finalPrice
}

const create = async (req, res) => {
  // Use sequelizeSession to start a transaction
  const newOrder = await Order.build(req.body)
  const transaction = await sequelizeSession.transaction()
  try {
    newOrder.userId = req.user.id

    const prodQuant = await arrayProductsQuantity(req.body.products, { transaction })
    const price = await totalPrice(prodQuant)

    const priceAndSCosts = await priceAndShippingCosts(newOrder.restaurantId, price)
    const orderPrice = priceAndSCosts[0]
    const shippingCosts = priceAndSCosts[1]
    newOrder.price = orderPrice
    newOrder.shippingCosts = shippingCosts
    let order = await newOrder.save({ transaction })

    for (const { product, quantity } of prodQuant) {
      await order.addProduct(product, { through: { quantity, unityPrice: product.price }, transaction })
    }

    order = await Order.findByPk(order.id, {
      include: [{ model: Product, as: 'products' }], transaction
    })

    await transaction.commit()
    res.json(order)
  } catch (err) {
    await transaction.rollback()
    res.status(500).send(err)
  }
}

// TODO: Implement the update function that receives a modified order and persists it in the database.
// Take into account that:
// 1. If price is greater than 10€, shipping costs have to be 0.
// 2. If price is less or equals to 10€, shipping costs have to be restaurant default shipping costs and have to be added to the order total price
// 3. In order to save the updated order and updated products, start a transaction, update the order, remove the old related OrderProducts and store the new product lines, and commit the transaction
// 4. If an exception is raised, catch it and rollback the transaction
const update = async (req, res) => {
  const { orderId } = req.params
  const updatedOrderData = req.body

  const transaction = await sequelizeSession.transaction()

  try {
    let order = await Order.findByPk(orderId, { transaction })

    order.restaurantId = updatedOrderData.restaurantId || order.restaurantId

    const prodQuant = await arrayProductsQuantity(updatedOrderData.products, { transaction })

    if (updatedOrderData.products) {
      const price = await totalPrice(prodQuant)

      const priceAndSCosts = await priceAndShippingCosts(order.restaurantId, price)
      const orderPrice = priceAndSCosts[0]
      const shippingCosts = priceAndSCosts[1]

      order.price = orderPrice
      order.shippingCosts = shippingCosts
    }
    order = await order.save({ transaction })

    await order.setProducts([], { transaction })

    if (updatedOrderData.products) {
      for (const { product, quantity } of prodQuant) {
        await order.addProduct(product, { through: { quantity, unityPrice: product.price }, transaction })
      }
    }
    order = await Order.findByPk(order.id, {
      include: [{ model: Product, as: 'products' }],
      transaction
    })

    await transaction.commit()

    res.json(order)
  } catch (err) {
    await transaction.rollback()
    res.status(500).send(err.message || err)
  }
}

// TODO: Implement the destroy function that receives an orderId as path param and removes the associated order from the database.
// Take into account that:
// 1. The migration include the "ON DELETE CASCADE" directive so OrderProducts related to this order will be automatically removed.

const destroy = async function (req, res) {
  try {
    const result = await Order.destroy({ where: { id: req.params.orderId } })
    let message = ''
    if (result === 1) {
      message = 'Order with id ' + req.params.orderId + ' destroyed successfully'
    } else {
      message = 'Order could not be destroyed'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

const confirm = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.startedAt = new Date()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const send = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.sentAt = new Date()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const deliver = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.deliveredAt = new Date()
    const updatedOrder = await order.save()
    const restaurant = await Restaurant.findByPk(order.restaurantId)
    const averageServiceTime = await restaurant.getAverageServiceTime()
    await Restaurant.update({ averageServiceMinutes: averageServiceTime }, { where: { id: order.restaurantId } })
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'status', 'restaurantCategoryId']
      },
      {
        model: User,
        as: 'user',
        attributes: ['firstName', 'email', 'avatar', 'userType']
      },
      {
        model: Product,
        as: 'products'
      }]
    })
    res.json(order)
  } catch (err) {
    res.status(500).send(err)
  }
}

const analytics = async function (req, res) {
  const yesterdayZeroHours = moment().subtract(1, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const todayZeroHours = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  try {
    const numYesterdayOrders = await Order.count({
      where:
      {
        createdAt: {
          [Op.lt]: todayZeroHours,
          [Op.gte]: yesterdayZeroHours
        },
        restaurantId: req.params.restaurantId
      }
    })
    const numPendingOrders = await Order.count({
      where:
      {
        startedAt: null,
        restaurantId: req.params.restaurantId
      }
    })
    const numDeliveredTodayOrders = await Order.count({
      where:
      {
        deliveredAt: { [Op.gte]: todayZeroHours },
        restaurantId: req.params.restaurantId
      }
    })

    const invoicedToday = await Order.sum(
      'price',
      {
        where:
        {
          createdAt: { [Op.gte]: todayZeroHours }, // FIXME: Created or confirmed?
          restaurantId: req.params.restaurantId
        }
      })
    res.json({
      restaurantId: req.params.restaurantId,
      numYesterdayOrders,
      numPendingOrders,
      numDeliveredTodayOrders,
      invoicedToday
    })
  } catch (err) {
    res.status(500).send(err)
  }
}

const OrderController = {
  indexRestaurant,
  indexCustomer,
  create,
  update,
  destroy,
  confirm,
  send,
  deliver,
  show,
  analytics
}
export default OrderController
