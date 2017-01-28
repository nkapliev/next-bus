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

// TODO Dirty bad hack
let requestedRoute = null

/**
 * Current request
 */
let xhr

/**
 * @param {Object} options
 *   @property {String} url
 *   @property {String} [method='GET']
 *   @property {String} [responseType='json']
 *   @property {Object} [params]
 *   @property {Function} [callback]
 * @return {Promise}
 */
export function makeAPIRequest (options) {
  let url = options.url
  let method = options.method || 'GET'
  let responseType = options.responseType || 'json'
  let params = options.params
  let callback = options.callback

  cancelAPIRequest()

  xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    url = params
      ? `${url}?${queryBuilder(params)}`
      : url

    console.log(`Trying to make API request: ${url}`)

    xhr.open(method, url)
    xhr.responseType = responseType
    xhr.onload = () => {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200) {
          console.log('Get response from API:')
          console.log(responseType === 'json' ? JSON.stringify(xhr.response, null, 4) : xhr.response)

          resolve(xhr.response)
          callback && callback(null, xhr.response)
        }
      }
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
 * @property {String} [responseType='json']
 * @property {String} [method='GET']
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
    iconsPrefix: 'dublin', // TODO
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
  },
  /**
   * http://api.irishrail.ie/realtime/
   */
  irish_rail: {
    iconsPrefix: 'dublin', // TODO
    url: 'http://api.irishrail.ie/realtime/realtime.asmx/getStationDataByNameXML',
    responseType: 'document',
    paramsBuilder: source => {
      // TODO Dirty bad hack
      if (source.routeId) {
        requestedRoute = String(source.routeId).toUpperCase()
      } else {
        requestedRoute = ''
      }

      return {
        StationDesc: source.stopId
      }
    },
    responseHandler: response => {
      let result = {}

      if (!response) {
        result.error = {message: `Empty response from API: ${response}`}
        console.log(result.error.message)
      } else {
        const DIRECTIONS_SHORTCUTS = {
          Northbound: 'North',
          Southbound: 'South'
        }

        result.nextBuses = Array.from(response.getElementsByTagName('objStationData'))
          .filter(item => {
            const directionNode = item.getElementsByTagName('Direction')[0]
            const direction = directionNode ? directionNode.textContent : ''

            // TODO String.prototype.startsWith() not working in old Chrome. Need to change babel env
            return direction.toUpperCase().indexOf(requestedRoute) === 0
          })
          .map(item => {
            const expectedDepartureNode = item.getElementsByTagName('Expdepart')[0]
            const directionNode = item.getElementsByTagName('Direction')[0]
            const dueInNode = item.getElementsByTagName('Duein')[0]

            return {
              departureTime: expectedDepartureNode ? expectedDepartureNode.textContent : '-',
              leftMinutes: dueInNode && parseInt(dueInNode.textContent, 10) || 0,
              routeId: directionNode
                ? DIRECTIONS_SHORTCUTS[directionNode.textContent] || directionNode.textContent
                : ''
            }
          })
      }

      return result
    }
  }
  /* @see type ApiDriver
   your_api_id: {
   iconsPrefix: 'you-api-icon-prefix',
   url: 'http://...',
   paramsBuilder: function (source) {...},
   responseHandler = function (response) {...}
   }
   */
}
