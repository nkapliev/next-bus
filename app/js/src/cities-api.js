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
 *   @param {?Object} [res]
 *   @param {String} [err]
 */

/**
 * @typedef {Object} Response - Argument for callback function in responseHandler
 *   @property {Object} [error]
 *     @property {String} [message]
 *   @property {Object} [data]
 *     @property {NextBusData[]} nextBuses
 */

/**
 * @typedef {Object} NextBusData
 *   @property {String} routeId - Bus route name, ex.: '7A', '118', '777'
 *   @property {Number} leftMinutes - Minutes until next bus arrival
 *   @property {String} departureTime - Departure time string e.g. 'HH:MM'
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
      let result = {}

      if (err) {
        result.error = {message: err}
        console.log(`Error during API request: ${JSON.stringify(err)}`)
      } else if (!res) {
        result.error = {message: `Empty response from API: ${res}`}
        console.log(result.error.message)
      } else if (res.errorcode === '1') {
        console.log('API found no buses')
        result.data = {nextBuses: []}
      } else if (res.errorcode !== '0') {
        result.error = {message: `Error in API response. ${res.errorcode}: ${res.errormessage}`}
        console.log(result.error.message)
      } else if (!Array.isArray(res.results)) {
        result.error = {message: 'Wrong format in API response'}
        console.log(result.error.message)
      } else {
        result.data = {
          nextBuses: res.results.map(item => {
            let leftMinutes = parseInt(item.departureduetime, 10) || 0
            return {
              routeId: item.route,
              leftMinutes: leftMinutes,
              departureTime: (new Date(Date.now() + leftMinutes * 60 * 1000)).toLocaleTimeString().slice(0, -3)
            }
          })
        }
      }

      callback(result)
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
