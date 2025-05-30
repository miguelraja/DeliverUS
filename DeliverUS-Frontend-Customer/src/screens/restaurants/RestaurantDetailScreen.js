/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View, FlatList, ImageBackground, Image, Pressable, TextInput } from 'react-native'
import { showMessage } from 'react-native-flash-message'
import { getDetail } from '../../api/RestaurantEndpoints'
import { update } from '../../api/OrderEndpoints'
import ImageCard from '../../components/ImageCard'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import { API_BASE_URL } from '@env'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { AuthorizationContext } from '../../context/AuthorizationContext'

export default function RestaurantDetailScreen ({ navigation, route }) {
  const [restaurant, setRestaurant] = useState({})
  const [order, setOrder] = useState({})
  const { loggedInUser } = useContext(AuthorizationContext)

  useEffect(() => {
    fetchRestaurantDetail()
  }, [loggedInUser, route])

  const fetchRestaurantDetail = async () => {
    try {
      const fetchedRestaurant = await getDetail(route.params.id)
      setRestaurant(fetchedRestaurant)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving restaurant details (id ${route.params.id}). ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const getOrderTotal = () => {
    console.log(order)
    return Object.entries(order).map(pair => {
      return restaurant.products.find(p => p.id === parseInt(pair[0])).price * pair[1]
    }).reduce((prev, cur) => prev + cur, 0)
  }

  const getOrderWithShipping = () => {
    const total = getOrderTotal()

    return total > 10 ? total : total + restaurant.shippingCosts
  }

  const updatePriceQuantity = (val, item) => {
    const newOrder = { ...order }
    const quantity = parseInt(val)

    if (quantity == null || isNaN(quantity) || quantity <= 0) {
      delete newOrder[item.id]
    } else {
      newOrder[item.id] = quantity
    }

    setOrder(newOrder)
  }

  const handlePlaceOrder = async () => {
    if (!loggedInUser) {
      showMessage({
        message: 'You need to be logged in to place an order.',
        type: 'warning',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
      navigation.navigate('Profile', { screen: 'LoginScreen' })
      return
    }

    const selectedProducts = Object.entries(order)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({
        productId: parseInt(productId),
        quantity
      }))

    if (route.params?.editingOrderId) {
      try {
        await update(route.params.editingOrderId, {
          products: selectedProducts,
          userId: loggedInUser.id,
          address: loggedInUser.address
        })
        navigation.navigate('EditOrderScreen', { id: route.params.editingOrderId })
        setOrder({})
      } catch (error) {
        showMessage({
          message: 'Failed to update order',
          type: 'danger',
          style: GlobalStyles.flashStyle,
          titleStyle: GlobalStyles.flashTextStyle
        })
      }
    } else {
      navigation.navigate('RestaurantPlaceOrderScreen', {
        order,
        totalCost: getOrderWithShipping(),
        shippingCosts: getOrderTotal() <= 10 ? restaurant.shippingCosts : 0,
        id: route.params.id
      })
      setOrder({})
    }
  }

  const renderHeader = () => {
    return (
      <View>
        <ImageBackground source={(restaurant?.heroImage) ? { uri: API_BASE_URL + '/' + restaurant.heroImage, cache: 'force-cache' } : undefined} style={styles.imageBackground}>
          <View style={styles.restaurantHeaderContainer}>
            <TextSemiBold textStyle={styles.textTitle}>{restaurant.name}</TextSemiBold>
            <Image style={styles.image} source={restaurant.logo ? { uri: API_BASE_URL + '/' + restaurant.logo, cache: 'force-cache' } : undefined} />
            <TextRegular textStyle={styles.description}>{restaurant.description}</TextRegular>
            <TextRegular textStyle={styles.description}>{restaurant.restaurantCategory ? restaurant.restaurantCategory.name : ''}</TextRegular>
          </View>
        </ImageBackground>
      </View>
    )
  }

  const renderFooter = () => {
    return restaurant.shippingCosts && (
      <View
        style={styles.footer}
      >
        <TextSemiBold>
          Shipping cost is free if the total price is more than 10€
        </TextSemiBold>
        {
          Object.keys(order).length > 0 && (
            <>
              <TextSemiBold
                textStyle={{
                  ...styles.textTitle,
                  color: 'black'
                }}
              >
                Total: {getOrderTotal().toFixed(2)}€ {getOrderTotal() > 10 ? '' : `+ ${restaurant.shippingCosts.toFixed(2)}€`} {getOrderTotal() > 10 ? '' : `= ${getOrderWithShipping().toFixed(2)}€`}
              </TextSemiBold>
              <Pressable
                onPress={handlePlaceOrder}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? GlobalStyles.brandBlueTap : GlobalStyles.brandBlue
                  },
                  styles.actionButton
                ]}>
                <TextRegular textStyle={styles.text}>
                  Place order
                </TextRegular>
              </Pressable>
              <Pressable
                onPress={() => setOrder({})}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed ? GlobalStyles.brandPrimaryTap : GlobalStyles.brandPrimary
                  },
                  styles.actionButton
                ]}>
                <TextRegular textStyle={styles.text}>
                  Discard
                </TextRegular>
              </Pressable>
            </>
          )
        }
      </View>
    )
  }

  const renderProduct = ({ item, index }) => {
    return (
      <View>
        <ImageCard
          imageUri={item.image ? { uri: API_BASE_URL + '/' + item.image } : undefined}
          title={item.name}
        >
          <TextRegular numberOfLines={2}>{item.description}</TextRegular>
          <TextSemiBold textStyle={styles.price}>{item.price.toFixed(2)}€</TextSemiBold>
          {!item.availability &&
            <TextRegular textStyle={styles.availability}>Not available</TextRegular>
          }
          {
            item.availability && (
              <View
                style={styles.prodPriceQuant}
              >
                <View>
                  <TextRegular>
                    Select quantity:
                  </TextRegular>
                  <TextInput
                    name='quantity'
                    value={order[item.id] || 0}
                    placeholder='quantity'
                    keyboardType='numeric'
                    onChangeText={val => updatePriceQuantity(val, item)}
                    style={styles.quantInput}
                  />
                </View>
                {
                  order[item.id] > 0 && (
                    <TextSemiBold>Total: {(order[item.id] * item.price).toFixed(2)}€</TextSemiBold>
                  )
                }
              </View>
            )
          }
        </ImageCard>
      </View>
    )
  }

  const renderEmptyProductsList = () => {
    return (
      <TextRegular textStyle={styles.emptyList}>
        This restaurant has no products yet.
      </TextRegular>
    )
  }

  return (
    <FlatList
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyProductsList}
      style={styles.container}
      data={restaurant.products}
      renderItem={renderProduct}
      keyExtractor={item => item.id.toString()}
    />
  )
}

const styles = StyleSheet.create({
  prodPriceQuant: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  quantInput: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: '50%'
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
    marginTop: 12,
    margin: '1%',
    padding: 10,
    alignSelf: 'center',
    flexDirection: 'column',
    width: '50%'
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    bottom: 5,
    position: 'absolute',
    width: '90%'
  }
})
