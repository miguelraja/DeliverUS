import React, { useEffect, useState, useContext } from 'react'
import { StyleSheet, FlatList, View } from 'react-native'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import { getAll } from '../../api/OrderEndpoints'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { showMessage } from 'react-native-flash-message'
import ImageCard from '../../components/ImageCard'
import restaurantLogo from '../../../assets/logo.png'
import { AuthorizationContext } from '../../context/AuthorizationContext'

// FR5: List of my confirmed orders

export default function OrdersScreen ({ navigation, route }) {
  const { loggedInUser } = useContext(AuthorizationContext)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (!loggedInUser) {
      setOrders([])
      return
    }
    async function fetchOrders () {
      try {
        const fetchedOrders = await getAll()
        fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setOrders(fetchedOrders.filter(order => order.userId === loggedInUser.id))
      } catch (error) {
        showMessage({
          message: `There was an error while retrieving orders. ${error} `,
          type: 'error',
          style: GlobalStyles.flashStyle,
          titleStyle: GlobalStyles.flashTextStyle
        })
      }
    }
    fetchOrders()
  }, [loggedInUser])

  const renderOrder = ({ item, index }) => {
    const orderNumber = orders.length - index

    return (
      <ImageCard
      imageUri = {item.restaurant.logo ? { uri: process.env.API_BASE_URL + '/' + item.restaurant.logo } : restaurantLogo}
      title={item.name}
      onPress={() => {
        navigation.navigate('OrderDetailScreen', { id: item.id, dirty: true })
      }}
      >

      <TextSemiBold textStyle={{ fontSize: 14, color: 'black' }}>
        Order {orderNumber}</TextSemiBold>

      <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimaryTap }}>
        {item.restaurant.name}</TextSemiBold>

      <TextRegular>Status: <TextSemiBold textStyle={{ color: GlobalStyles.brandGreenTap }}>
          {item.status}</TextSemiBold>
      </TextRegular>

      {item.sentAt && !item.deliveredAt &&
        <TextRegular>Order date: <TextRegular textStyle={{ color: GlobalStyles.flashStyle }}>
          {String(item.sentAt).slice(0, 10)}</TextRegular></TextRegular>}

      <TextRegular>Address: <TextRegular textStyle={{ color: GlobalStyles.flash }}>
        {item.address}</TextRegular></TextRegular>

      <TextSemiBold>Price: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>
        {item.price}€</TextSemiBold></TextSemiBold>
      </ImageCard>
    )
  }

  const renderEmptyOrder = () => {
    return (
      <TextRegular textStyle={styles.text}>
        No orders were retreived. Are you logged in?
      </TextRegular>
    )
  }

  const renderOrderHeader = () => {
    return (
      <View style={{ padding: 10 }}>
        <TextRegular textStyle={styles.header}>
          {orders.length} orders were found.
        </TextRegular>
      </View>
    )
  }

  return (
    <FlatList
      data = {orders}
      renderItem={renderOrder}
      keyExtractor={item => item.id.toString()}
      ListEmptyComponent={renderEmptyOrder}
      ListHeaderComponent={renderOrderHeader}
      />
  )
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center'
  },
  header: {
    fontSize: 16,
    color: GlobalStyles.brandPrimaryTap,
    textAlign: 'center',
    marginBottom: 10
  },

  buttonText: {
    borderRadius: 8,
    margin: 10,
    padding: 10,
    width: '50%',
    backgroundColor: GlobalStyles.brandPrimary
  },
  title: {
    color: 'white',
    fontSize: 24,
    margin: 10,
    padding: 10
  },
  imageBackground: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center'
  },
  headerContainer: {
    height: 150,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }
})
