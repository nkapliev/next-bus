'use strict'

import { sendMessage } from './utils'

const MINUTE = 60000 // 1000ms * 60s

// TODO debug mode console.log filter
const CITY_ID = 'DUB' // TODO 1. get from select menu in interface and save to localstorage 2. Think about uniq ID
const STOP_ID = '414' //TODO get from input in interface and save to localstorage

function errorHandler (err) {
  console.log(`popup errorHandler err: ${JSON.stringify(err)}`)
  // TODO Add to popup a red string with notification about some error
}

/**
 * @param {Response} response
 */
function renewPopup (response) {
  response.nextBuses
    .sort((nextBusA, nextBusB) => nextBusA.departureTime - nextBusB.departureTime)
    .forEach(nextBus => {
      // TODO Build popup view from new data

    })
}

function checkNextBus () {
  sendMessage(
    {cmd: 'getNextBusInfo', cityId: CITY_ID, stopId: STOP_ID},
    renewPopup,
    errorHandler
  )
}

document.addEventListener('DOMContentLoaded', function () {
  checkNextBus()
  setInterval(checkNextBus, MINUTE)
})
