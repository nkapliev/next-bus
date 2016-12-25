'use strict'

import { makeAPIRequest } from './utils'
import { CITIES_API } from './cities-api'

/**
 * Hash with controllers
 */
const CMDs = {
  getNextBusInfo: (msg, sendResponse) => {
    const city = CITIES_API[msg.cityId]

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
