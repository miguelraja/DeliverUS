import { get, post, put, destroy } from './helpers/ApiRequestsHelper'

function getAll () {
  return get('orders')
}

function getDetail (id) {
  return get(`orders/${id}`)
}

function create (data) {
  return post('orders/', data)
}

function update (id, data) {
  return put(`orders/${id}`, data)
}

function remove (id) {
  return destroy(`orders/${id}`)
}

export { getAll, getDetail, create, update, remove }
