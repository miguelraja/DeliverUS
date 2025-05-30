/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, FlatList } from 'react-native'
import TextSemiBold from '../../components/TextSemibold'
import TextRegular from '../../components/TextRegular'
import * as GlobalStyles from '../../styles/GlobalStyles' // Imported globally to practise a different import style unlike that of RestaurantDetailScreen
import { getRestaurants } from '../../api/RestaurantEndpoints'
import { getPopularProducts } from '../../api/ProductEndpoints'
import { showMessage } from 'react-native-flash-message'
import { API_BASE_URL } from '@env'
import ImageCard from '../../components/ImageCard'
import restaurantLogo from '../../../assets/restaurantLogo.jpeg'

export default function RestaurantsScreen ({ navigation, route }) {
  // TODO: Create a state for storing the restaurantss
  const [restaurants, setRestaurants] = useState([])
  const [topThreeProducts, setTopThreeProducts] = useState([])

  useEffect(() => {
    // TODO: Fetch all restaurants and set them to state.
    //      Notice that it is not required to be logged in.
    fetchRestaurants()

    // TODO: set restaurants to state
  }, [route])

  useEffect(() => {
    fectchTopThreeProducts()
  }, [])

  const fectchTopThreeProducts = async () => {
    try {
      const allProducts = await getPopularProducts()
      setTopThreeProducts(allProducts)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving top 3 products. ${error} `,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const fetchRestaurants = async () => {
    try {
      const fetchedRestaurants = await getRestaurants()
      setRestaurants(fetchedRestaurants)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving restaurants. ${error} `,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const renderTopProducts = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.image ? { uri: API_BASE_URL + '/' + item.image } : restaurantLogo}
        title={item.name}
        onPress={() => {
          navigation.navigate('RestaurantDetailScreen', { id: item.restaurantId, dirty: true })
        }}
      >
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
        <TextSemiBold>Price: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.price.toFixed(2)}€</TextSemiBold></TextSemiBold>
      </ImageCard>
    )
  }

  const renderHeaderTopProducts = () => {
    return (
      <View>
        <TextSemiBold textStyle={{ textAlign: 'center', fontSize: 16, marginVertical: 10 }}>
          These are the 3 most popular products:
        </TextSemiBold>
        <FlatList
          horizontal={true}
          data={topThreeProducts}
          style={styles.container}
          renderItem={renderTopProducts}
        />
      </View>
    )
  }

  const renderRestaurant = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.logo ? { uri: API_BASE_URL + '/' + item.logo } : restaurantLogo}
        title={item.name}
        onPress={() => {
          navigation.navigate('RestaurantDetailScreen', { id: item.id })
        }}
      >
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
        {item.averageServiceMinutes !== null &&
          <TextSemiBold>Avg. service time: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.averageServiceMinutes} min.</TextSemiBold></TextSemiBold>
        }
        <TextSemiBold>Shipping: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.shippingCosts.toFixed(2)}€</TextSemiBold></TextSemiBold>
      </ImageCard>
    )
  }

  return (
    <>
      <FlatList
        ListHeaderComponent={renderHeaderTopProducts}
        style={styles.container}
        data={restaurants}
        renderItem={renderRestaurant}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={() => (
          <TextRegular textStyle={styles.emptyList}>
            No restaurants were retreived.
          </TextRegular>
        )}
      />
    </>
  )
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    margin: 50,
    padding: 5
  },
  button: {
    borderRadius: 8,
    height: 40,
    margin: 12,
    padding: 10,
    width: '100%'
  },
  text: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center'
  },
  emptyList: {
    textAlign: 'center',
    padding: 50
  }
})
