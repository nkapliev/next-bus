'use strict'

/**
 * @typedef {String} CityId
 */

/** @typedef {Object} CityApiDriver
 * @property {String} [iconPrefix=default]
 * @property {String} apiUrl
 * @property {Function} paramsBuilder - Build API request params based on user data
 *   @param {Object} source
 *     @property {String} source.stopId
 *     @property {String} [source.routeId]
 *   @returns {Object} Params for API query string
 * @property {Function} responseHandler - Handle success response from API.
 *                                        In case of success response should call `callback` function
 *                                        with Response argument
 *   @param {Function} callback
 *     @param {Response}
 *   @param {Object} res
 *   @param {*} err
 */

/**
 * @typedef {Object} Response - Argument for callback function in responseHandler
 *   @property {NextBusData[]} nextBuses
 */

/**
 * @typedef {Object} NextBusData
 *   @property {String} routeId - Bus route name, ex.: '7A', '118', '777'
 *   @property {String} departureTime - Minutes until next bus arrival
 */

/**
 * @type {{CityId: CityApiDriver}}
 */
export const CITIES_API = {
  /**
   * https://data.gov.ie/dataset/real-time-passenger-information-rtpi-for-dublin-bus-bus-eireann-luas-and-irish-rail
   */
  DUB: {
    iconsPrefix: 'dublin', // TODO should be also available in popup.js
    apiUrl: 'https://data.dublinked.ie/cgi-bin/rtpi/realtimebusinformation',
    paramsBuilder: source => {
      const params = {}

      params.stopid = source.stopId
      if (source.routeId)
        params.routeid = source.routeId

      return params
    },
    responseHandler: (callback, res, err) => {
      if (err) {
        console.log(`Error during API request: ${JSON.stringify(err)}`)
      } else if (!res) {
        console.log(`Empty response: ${res}`)
      } else if (res.errorcode !== '0') {
        console.log(`Error in API response. ${res.errorcode}: ${res.errormessage}`)
      } else if (!Array.isArray(res.results)) {
        console.log('Wrong API response format')
      } else {
        callback({
          nextBuses: res.results.map(item => {
            return {
              routeId: item.route,
              departureTime: parseInt(item.departureduetime, 10)
            }
          })
        })
      }
    }
  }
  /* @see type CityApiDriver
  YOUR_CITY_ID: {
    iconsPrefix: 'you-city-icon-prefix',
    apiUrl: 'http://...'
    paramsBuilder: function (source) {...},
    responseHandler = function (callback, res, err) {...}
  }
  */
}

CITIES_API.DEFAULT = CITIES_API.DUB // TODO Fix this when the second city appear
