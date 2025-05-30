/* eslint-disable react/prop-types */
import React, { createRef, useContext, useEffect, useState } from 'react'
import { StyleSheet, View, FlatList, Pressable, TextInput } from 'react-native'
import { showMessage } from 'react-native-flash-message'
import { getDetail, update } from '../../api/OrderEndpoints'
import ImageCard from '../../components/ImageCard'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import { brandPrimary, brandPrimaryTap, brandPrimaryDisabled } from '../../styles/GlobalStyles' // Importing classes as members to practise this importing style
import { API_BASE_URL } from '@env'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { AuthorizationContext } from '../../context/AuthorizationContext'
import DeleteModal from '../../components/DeleteModal'

export default function EditOrderScreen ({ navigation, route }) {
  const [order, setOrder] = useState({})
  const [backendErrors, setBackendErrors] = useState([])
  const [address, setAddress] = useState(null)
  const inputRef = createRef()
  const [editingAddress, setEditingAddress] = useState(false)
  const { loggedInUser } = useContext(AuthorizationContext)
  const [confirmingDeleteProduct, setConfirmingDeleteProduct] = useState(null)

  useEffect(() => {
    fetchOrderDetail()
  }, [route])

  const fetchOrderDetail = async () => {
    try {
      const fetchedOrder = await getDetail(route.params.id)
      setOrder(fetchedOrder)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving order details (id ${route.params.id}). ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const confirmOrder = async () => {
    setBackendErrors([])
    if (loggedInUser == null) {
      showMessage({
        message: 'You need to be logged in to place an order.',
        type: 'warning',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })

      navigation.navigate('Profile', { screen: 'LoginScreen' })

      return
    }

    const finalAddress = address || loggedInUser.address

    if (finalAddress === '' || finalAddress == null) {
      showMessage({
        message: 'Please enter a valid address.',
        type: 'warning',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })

      return
    }

    try {
      const createdOrder = await update(route.params.id, {
        products: order.products.map((product) => {
          return {
            productId: product.OrderProducts.ProductId,
            quantity: product.OrderProducts.quantity
          }
        }),
        orderId: route.params.id,
        userId: loggedInUser.id,
        address: finalAddress
      })

      showMessage({
        message: `Order ${createdOrder.id} updated successfully!`,
        type: 'success',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'My Orders',
            params: {
              screen: 'OrdersScreen',
              params: {
                dirty: true
              }
            }
          }]
      })
    } catch (err) {
      setBackendErrors(err.errors)
      showMessage({
        message: `There was an error while creating the order. ${err.errors.join(', ')}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const handleRemoveProduct = (product) => {
    if (order.products.length === 1) {
      showMessage({
        message: 'You cannot remove the last product from the order. Please delete the order if you want to cancel it.',
        type: 'warning',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
      return
    }
    setConfirmingDeleteProduct(product)
  }

  const confirmRemoveProduct = () => {
    const newProducts = order.products.filter(
      (product) => product.OrderProducts.ProductId !== confirmingDeleteProduct.OrderProducts.ProductId
    )
    setOrder({ ...order, products: newProducts })
    setConfirmingDeleteProduct(null) // Cierra el modal
  }

  const renderHeader = () => {
    return (
      <View
        style={{
          paddingTop: 10,
          paddingLeft: 20
        }}
      >
        <TextSemiBold
          textStyle={{
            ...styles.textTitle,
            color: 'black'
          }}
        >
          Confirm your order
        </TextSemiBold>
        {
          editingAddress
            ? (
            <TextInput
              name='address'
              placeholder='Edit Address'
              style={styles.input}
              ref={inputRef}
            />
              )
            : (
            <TextRegular>
              Address: {address == null ? loggedInUser?.address : address}
            </TextRegular>
              )
        }
        {
          !editingAddress
            ? (
            <Pressable
              onPress={() => setEditingAddress(true)}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? brandPrimaryTap : brandPrimary
                },
                styles.button
              ]}>
              <TextRegular
                textStyle={styles.text}
              >
                Edit Address
              </TextRegular>
            </Pressable>
              )
            : (
            <Pressable
              onPress={() => {
                setEditingAddress(false)
                setAddress(inputRef.current.value)
              }}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? brandPrimaryTap : brandPrimary
                },
                styles.button
              ]}>
              <TextRegular
                textStyle={styles.text}
              >
                Save Address
              </TextRegular>
            </Pressable>
              )
        }
      </View>
    )
  }

  const renderFooter = () => {
    return (
      <View
        style={styles.footer}
      >
        {
          backendErrors.length > 0 && backendErrors.map((error, index) => (
            <TextRegular
              key={index}
              textStyle={{
                ...styles.text,
                color: 'red'
              }}
            >
              {error}
            </TextRegular>
          ))
        }
        <TextSemiBold
          textStyle={{
            ...styles.textTitle,
            color: 'black'
          }}
        >
          Total: {order.price}€ {order.price > 10 ? ' (Free delivery)' : ` (${order.price - order.shippingCosts}€ + ${order.shippingCosts}€)`}
        </TextSemiBold>

        <Pressable
          onPress={() =>
            navigation.navigate('RestaurantDetailScreen', {
              id: order.restaurantId,
              editingOrderId: order.id
            })
          }
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? GlobalStyles.brandGreenTap : GlobalStyles.brandGreen
            },
            styles.actionButton
          ]}
        >
          <TextRegular textStyle={styles.text}>Add Products</TextRegular>
        </Pressable>

        <Pressable
          onPress={() => confirmOrder()}
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? GlobalStyles.brandBlueTap : GlobalStyles.brandBlue
            },
            styles.actionButton
          ]}>
          <TextRegular textStyle={styles.text}>
            Confirm
          </TextRegular>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('OrderDetailScreen', { id: order.id })}
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? GlobalStyles.brandPrimaryTap : GlobalStyles.brandPrimary
            },
            styles.actionButton
          ]}>
          <TextRegular textStyle={styles.text}>
            Cancel
          </TextRegular>
        </Pressable>
      </View>
    )
  }

  const renderProduct = ({ item }) => {
    const { OrderProducts } = order.products.find(
      ({ OrderProducts }) => OrderProducts.ProductId === item.id
    )

    const handleQuantityChange = (text) => {
      const newProducts = order.products.map((product) => {
        if (product.OrderProducts.ProductId === item.id) {
          return {
            ...product,
            OrderProducts: {
              ...product.OrderProducts,
              quantity: parseInt(text) || 0
            }
          }
        }
        return product
      })

      const price = newProducts.reduce((acc, product) => {
        return acc + product.OrderProducts.quantity * product.OrderProducts.unityPrice
      }, 0)

      setOrder((prevOrder) => ({
        ...prevOrder,
        products: newProducts,
        price: price > 10 ? price : price + order.shippingCosts,
        shippingCosts: price > 10 ? 0 : order.shippingCosts
      }))
    }

    return (
      <View>
        <ImageCard
          imageUri={item.image ? { uri: API_BASE_URL + '/' + item.image } : undefined}
          title={item.name}
        >
          <TextRegular numberOfLines={2}>{item.description}</TextRegular>
          <TextSemiBold textStyle={styles.price}>{item.price.toFixed(2)}€</TextSemiBold>
          <View style={styles.prodPriceQuant}>
            <TextSemiBold>Quantity:</TextSemiBold>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={OrderProducts.quantity.toString()}
              onChangeText={handleQuantityChange}
            />
          </View>
        <Pressable
          onPress={() => handleRemoveProduct(item)}
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? brandPrimaryDisabled : brandPrimaryTap
            },
            styles.actionButton
          ]}
        >
          <TextRegular textStyle={styles.text}>Remove</TextRegular>
        </Pressable>
        </ImageCard>
      </View>
    )
  }

  return (
    <>
    <FlatList
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      data={order.products}
      renderItem={renderProduct}
      keyExtractor={item => item.id.toString()}
    />
    <DeleteModal
      isVisible={confirmingDeleteProduct !== null}
      onCancel={() => setConfirmingDeleteProduct(null)}
      onConfirm={confirmRemoveProduct}
    >
      <TextRegular>
        Are you sure you want to remove the product from the order?
      </TextRegular>
    </DeleteModal>
    </>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: '50%'
  },
  prodPriceQuant: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  footer: {
    flex: 1,
    padding: 20
  },
  container: {
    flex: 1
  },
  row: {
    padding: 15,
    marginBottom: 5,
    backgroundColor: GlobalStyles.brandSecondary
  },
  restaurantHeaderContainer: {
    height: 250,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'column',
    alignItems: 'center'
  },
  imageBackground: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center'
  },
  image: {
    height: 100,
    width: 100,
    margin: 10
  },
  description: {
    color: 'white'
  },
  textTitle: {
    fontSize: 20,
    color: 'white'
  },
  emptyList: {
    textAlign: 'center',
    padding: 50
  },
  button: {
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    padding: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    width: '80%'
  },
  text: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginLeft: 5
  },
  availability: {
    textAlign: 'right',
    marginRight: 5,
    color: GlobalStyles.brandSecondary
  },
  actionButton: {
    borderRadius: 8,
    height: 40,
    padding: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginHorizontal: 4
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    bottom: 5,
    position: 'absolute',
    width: '90%'
  }
})
