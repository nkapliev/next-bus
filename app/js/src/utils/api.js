'use strict'

/**
 * @param {Object} params
 * @return {String}
 */
function queryBuilder (params) {
  return params
    ? Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    : ''
}

/**
 * Current request
 */
let xhr

/**
 * @param {String} url
 * @param {Object} [params]
 * @param {Function} [callback]
 * @return {Promise}
 */
export function makeAPIRequest (url, params, callback) {
  cancelAPIRequest()

  xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    url = params
      ? `${url}?${queryBuilder(params)}`
      : url

    console.log(`Trying to make API request: ${url}`)

    xhr.open('GET', url) // TODO What about POST|PUT|...?
    xhr.responseType = 'json' // TODO What about other types?
    xhr.onload = () => {
      console.log('Get response from API:')
      console.log(JSON.stringify(xhr.response, null, 4))
      resolve(xhr.response)
      callback && callback(null, xhr.response)
    }
    xhr.onerror = err => {
      console.log(`makeAPIRequest error: ${err}`)
      reject(err)
      callback && callback(err)
    }
    xhr.onloadend = () => {
      xhr = null
    }
    xhr.send()
  })
}

/**
 * Abort current API request
 */
export function cancelAPIRequest () {
  xhr && xhr.abort()
}

/** @typedef {Object} ApiDriver
 * @property {String} [iconPrefix=default]
 * @property {String} url
 * @property {Function} paramsBuilder - Build API request params based on user data
 *   @param {Object} source
 *     @property {String} source.stopId
 *     @property {String} [source.routeId]
 *   @return {Object} Params for API query string
 * @property {Function} responseHandler - Handle success response from API
 *   @param {Object} [response]
 *   @return {APIHandledData}
 */

/**
 * @typedef {Object} APIHandledData
 *   @property {Object} [error]
 *     @property {String} [message]
 *   @property {NextBusData[]} [nextBuses]
 */

/**
 * @typedef {Object} NextBusData
 *   @property {String} routeId - Bus route name, ex.: '7A', '118', '777'
 *   @property {Number} leftMinutes - Minutes until next bus arrival
 *   @property {String} departureTime - Departure time string e.g. 'HH:MM'
 */

/**
 * @type {Object<ApiDriver>}
 */
export const APIs = {
  /**
   * https://data.gov.ie/dataset/real-time-passenger-information-rtpi-for-dublin-bus-bus-eireann-luas-and-irish-rail
   */
  dublin_bus: {
    iconsPrefix: 'dublin',
    url: 'https://data.dublinked.ie/cgi-bin/rtpi/realtimebusinformation',
    paramsBuilder: source => {
      const params = {}

      params.stopid = source.stopId
      if (source.routeId)
        params.routeid = source.routeId

      return params
    },
    responseHandler: response => {
      let result = {}

      if (!response) {
        result.error = {message: `Empty response from API: ${response}`}
        console.log(result.error.message)
      } else if (response.errorcode === '1') {
        console.log('API found no buses')
        result.data = {nextBuses: []}
      } else if (response.errorcode !== '0') {
        result.error = {message: `Error in API response. ${response.errorcode}: ${response.errormessage}`}
        console.log(result.error.message)
      } else if (!Array.isArray(response.results)) {
        result.error = {message: 'Wrong format in API response'}
        console.log(result.error.message)
      } else {
        result.nextBuses = response.results.map(item => {
          let leftMinutes = parseInt(item.departureduetime, 10) || 0
          return {
            routeId: item.route,
            leftMinutes: leftMinutes,
            departureTime: (new Date(Date.now() + leftMinutes * 60 * 1000)).toLocaleTimeString().slice(0, -3)
          }
        })
      }

      return result
    }
  }
  /* @see type ApiDriver
   your_api_id: {
   iconsPrefix: 'you-api-icon-prefix',
   url: 'http://...'
   paramsBuilder: function (source) {...},
   responseHandler = function (response) {...}
   }
   */
}
