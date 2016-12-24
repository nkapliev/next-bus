"use strict"

const CITIES_CONFIG = {
  DUB: {
    iconsPrefix: 'dublin', // TODO should be also available in popup.js
    apiUrl: 'https://data.dublinked.ie/cgi-bin/rtpi/realtimebusinformation',
    /**
     * @param {Object} source
     * @property {String} source.stopId
     * @property {String} [source.routeId]
     * @returns {Object} Params for API query string
     */
    paramsBuilder: source => {
      const params = {}

      params.stopid = source.stopId
      source.routeId && (params.routeid = source.routeId)

      return params
    },
    /**
     * @param {Function} callback
     * @param {?*} err
     * @param {?Object} [res]
     */
    responseHandler: (callback, err, res) => {
      if (err !== null) {
        console.log(`Error during API request: ${JSON.stringify(err)}`)
        return
      } else if (res.errorcode !== '0') {
        console.log(`Error in API response. ${res.errorcode}: ${res.errormessage}`)
        return
      } else if (!Array.isArray(res.results)) {
        console.log(`Wrong API response format`)
        return
      }

      callback({
        response: res.results.map(item => {
          return {
            routeId: item.route,
            departureTime: item.departureduetime
          }
        })
      })
    }
  }
}

CITIES_CONFIG.DEFAULT = CITIES_CONFIG.DUB // TODO Fix this when second city appear

/**
 * @param {Object} params
 * @returns {String}
 */
function queryBuilder (params) {
  return params
    ? Object.keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&')
    : ''
}

/**
 * @param {String} url
 * @param {?Object} params
 * @param {Function} callback
 */
function makeAPIRequest (url, params, callback) {
  let xhr = new XMLHttpRequest()

  url = `${url}?${queryBuilder(params)}`
  console.log(`Trying to make API request: ${url}`)

  xhr.open('GET', url) // TODO What about POST?
  xhr.responseType = 'json' // TODO What about other types?
  xhr.onload = _ => {
    let res = xhr.response;

    console.log('Get response from API:')
    console.log(JSON.stringify(res, null, 4))

    callback(null, res)
  }
  xhr.onerror = err => callback(err)
  xhr.send()
}

/**
 * Hash with controllers
 */
const CMDs = {
  getNextBusInfo: (msg, sendResponse) => {
    const city = CITIES_CONFIG[msg.cityId]

    makeAPIRequest(
      city.apiUrl,
      city.paramsBuilder(msg),
      city.responseHandler.bind(null, sendResponse))

    return true
  }
}

chrome.runtime.onMessage.addListener(function(msg, _, sendResponse) {
  return CMDs[msg.cmd](msg, sendResponse)
})
