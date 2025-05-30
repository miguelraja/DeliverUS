/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Image, FlatList, TouchableOpacity } from 'react-native'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import ImageCard from '../../components/ImageCard'
import { showMessage } from 'react-native-flash-message'
import { brandBlue, brandPrimary, brandSecondary, flashStyle, flashTextStyle } from '../../styles/GlobalStyles'
import { getDetail, remove } from '../../api/OrderEndpoints'
import DeleteModal from '../../components/DeleteModal'

export default function OrderDetailScreen ({ navigation, route }) {
  const [order, setOrder] = useState({})
  const [restaurant, setRestaurant] = useState({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    async function fetchOrderDetail () {
      try {
        const fetchedOrder = await getDetail(route.params.id)
        setOrder(fetchedOrder)
        setRestaurant(fetchedOrder.restaurant)
      } catch (err) {
        showMessage({
          message: `There was an error while retrieving your order: ${err}`,
          type: 'error',
          style: flashStyle,
          textStyle: flashTextStyle
        })
      }
    }
    fetchOrderDetail()
  }, [route])

  const handleDeleteOrder = async () => {
    try {
      await remove(order.id)
      showMessage({
        message: 'Order deleted successfully',
        type: 'success',
        style: flashStyle,
        textStyle: flashTextStyle
      })
      navigation.reset({ index: 0, routes: [{ name: 'OrdersScreen' }] })
    } catch (err) {
      showMessage({
        message: `There was an error while deleting your order: ${err}`,
        type: 'error',
        style: flashStyle,
        textStyle: flashTextStyle
      })
    }
  }

  const renderHeader = () => {
    return (
    <View style={styles.restaurantHeaderContainer}>
        <Image style={styles.image} source={restaurant.logo ? { uri: process.env.API_BASE_URL + '/' + restaurant.logo, cache: 'force-cache' } : undefined} />
        <TextSemiBold textStyle={styles.textTitle}> Order {order.id}</TextSemiBold>
        <TextRegular textStyle={styles.headerText}> Created at: {new Date(order.createdAt).toLocaleString()}</TextRegular>
        {order.startedAt && <TextRegular textStyle={styles.headerText}> Started at: {new Date(order.startedAt).toLocaleString()}</TextRegular>}
        {order.sentAt && <TextRegular textStyle={styles.headerText}> Sent at: {new Date(order.sentAt).toLocaleString()}</TextRegular>}
        {order.deliveredAt && <TextRegular textStyle={styles.headerText}> Delivered at: {new Date(order.deliveredAt).toLocaleString()}</TextRegular>}
        <TextRegular textStyle={styles.headerText}> Total Price: {order.price}€</TextRegular>
        <TextRegular textStyle={styles.headerText}>Address: {order.address}</TextRegular>
        <TextRegular textStyle={styles.headerText}>Shipping costs: {order.shippingCosts}</TextRegular>
        <TextRegular textStyle={styles.headerText}>Status: {order.status}</TextRegular>
        {order.status === 'pending' && !confirmingDelete && (
        <><TouchableOpacity style={styles.deleteButton} onPress={() => setConfirmingDelete(true)}>
            <TextSemiBold textStyle={styles.buttonText}>Delete Order</TextSemiBold>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditOrderScreen', { id: order.id, restaurantId: order.restaurantId })}>
              <TextSemiBold textStyle={styles.buttonText}>Edit Order</TextSemiBold>
            </TouchableOpacity></>
        )}
      </View>
    )
  }

  const renderEmptyProductList = () => {
    return (
      <TextRegular style={styles.emptyList}>
        There are no orders to be shown.
      </TextRegular>
    )
  }

  const renderProduct = ({ item }) => {
    return (
      <ImageCard imageUri={item.image ? { uri: process.env.API_BASE_URL + '/' + item.image } : undefined } title={item.name}>
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
        <TextSemiBold> Unity price: <TextRegular textStyle={styles.price}> {item.price.toFixed(2)}€ </TextRegular></TextSemiBold>
        <TextSemiBold> Quantity: <TextRegular> {item.OrderProducts.quantity} </TextRegular></TextSemiBold>
        <TextSemiBold> Total price: <TextRegular> {item.price.toFixed(2) * item.OrderProducts.quantity}€ </TextRegular></TextSemiBold>
      </ImageCard>
    )
  }

  return (
    <>
    <FlatList
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyProductList}
      style={styles.container}
      data={order.products}
      renderItem={renderProduct}
      keyExtractor={item => item.id.toString()}
      />
      <DeleteModal
      isVisible={confirmingDelete !== false}
      onCancel={() => setConfirmingDelete(false)}
      onConfirm={() => handleDeleteOrder(confirmingDelete)}>
      <TextRegular> Are you sure you want to delete this order? </TextRegular>
    </DeleteModal>
      </>

  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  row: {
    padding: 15,
    marginBottom: 5,
    backgroundColor: brandSecondary
  },
  restaurantHeaderContainer: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10
  },
  imageBackground: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center'
  },
  image: {
    height: 100,
    width: 100,
    marginBottom: 5,
    marginTop: 1
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
    alignItems: 'center'
  },
  text: {
    fontSize: 16,
    color: brandSecondary,
    textAlign: 'center',
    marginLeft: 5
  },
  headerText: {
    color: 'white',
    textAlign: 'center'
  },
  deleteButton: {
    backgroundColor: brandPrimary,
    padding: 10,
    borderRadius: 8,
    marginTop: 12
  },
  editButton: {
    backgroundColor: brandBlue,
    padding: 10,
    borderRadius: 8,
    marginTop: 12
  },
  buttonText: {
    color: 'white'
  }
})
