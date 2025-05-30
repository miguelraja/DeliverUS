/* eslint-disable react/prop-types */
import React, { createRef, useContext, useEffect, useState } from 'react'
import { StyleSheet, View, FlatList, Pressable, TextInput } from 'react-native'
import { showMessage } from 'react-native-flash-message'
import { getDetail } from '../../api/RestaurantEndpoints'
import ImageCard from '../../components/ImageCard'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import { brandPrimary, brandPrimaryTap } from '../../styles/GlobalStyles' // Importing classes as members to practise this importing style
import { API_BASE_URL } from '@env'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { AuthorizationContext } from '../../context/AuthorizationContext'
import { create } from '../../api/OrderEndpoints'

export default function RestaurantPlaceOrderScreen ({ navigation, route }) {
  const [restaurant, setRestaurant] = useState({})
  const [backendErrors, setBackendErrors] = useState([])
  const [address, setAddress] = useState(null)
  const inputRef = createRef()
  const [editingAddress, setEditingAddress] = useState(false)
  const { loggedInUser } = useContext(AuthorizationContext)

  useEffect(() => {
    fetchRestaurantDetail()
  }, [route])

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
      const createdOrder = await create({
        products: Object.entries(route.params.order).map(([id, quantity]) => {
          return {
            productId: id,
            quantity
          }
        }),
        userId: loggedInUser.id,
        restaurantId: restaurant.id,
        address: finalAddress
      })

      showMessage({
        message: `Order ${createdOrder.id} created successfully!`,
        type: 'success',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })

      // navigation.navigate('My Orders', { dirty: true })
      // navigation.navigate('RestaurantsScreen')
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
              style={styles.addrInput}
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
          Total: {route.params.totalCost}€ {route.params.totalCost > 10 ? ' (Free delivery)' : ` (${route.params.totalCost - route.params.shippingCosts}€ + ${route.params.shippingCosts}€)`}
        </TextSemiBold>
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
          onPress={() => navigation.navigate('RestaurantDetailScreen', { id: restaurant.id })}
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

  const renderProduct = ({ item, index }) => {
    return route.params.order[item.id] > 0 && (
      <View>
        <ImageCard
          imageUri={item.image ? { uri: API_BASE_URL + '/' + item.image } : undefined}
          title={item.name}
        >
          <TextRegular numberOfLines={2}>{item.description}</TextRegular>
          <TextSemiBold textStyle={styles.price}>{item.price.toFixed(2)}€</TextSemiBold>
          {
            item.availability && (
              <View
                style={styles.prodPriceQuant}
              >
                {
                  route.params.order[item.id] > 0 && (
                    <>
                      <TextSemiBold>Quantity: {route.params.order[item.id]}</TextSemiBold>
                      <TextSemiBold>Total: {(route.params.order[item.id] * item.price).toFixed(2)}€</TextSemiBold>
                    </>
                  )
                }
              </View>
            )
          }
        </ImageCard>
      </View>
    )
  }

  return (
    <FlatList
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      data={restaurant.products}
      renderItem={renderProduct}
      keyExtractor={item => item.id.toString()}
    />
  )
}

const styles = StyleSheet.create({
  FRHeader: { // TODO: remove this style and the related <View>. Only for clarification purposes
    justifyContent: 'center',
    alignItems: 'left',
    margin: 50
  },
  addrInput: {
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
