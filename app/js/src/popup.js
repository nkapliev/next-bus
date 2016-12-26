'use strict'

import {Block, buildNextBusElement, sendMessage} from './utils/popup-utils'

// TODO debug mode console.log filter
const CITY_ID = 'DUB' // TODO 1. get from select menu in interface and save to localstorage 2. Think about uniq ID
const STOP_ID = '3163' // TODO get from input in interface and save to localstorage

/**
 * @type {Block}
 */
let pageScheduleBlock

/**
 * @type {Block}
 */
let pageErrorBlock

/**
 * @param {JSON} err
 */
function errorHandler (err) {
  err = JSON.stringify(err)
  pageErrorBlock.htmlElem.innerHTML = `<pre>${err}</pre>`
  pageErrorBlock.delMod('hidden', 'yes')
  console.log(`popup errorHandler err: ${err}`)
}

/**
 * @param {Response} response
 */
function renewPopup (response) {
  pageErrorBlock.setMod('hidden', 'yes')
  pageScheduleBlock.htmlElem.innerHTML = '' // TODO Yes, it is slow. But there are not so many elements =)
  /** Much faster way:
  while (myNode.firstChild) {
    myNode.removeChild(myNode.firstChild);
  } */

  response.nextBuses
    .sort((nextBusA, nextBusB) => nextBusA.departureTime - nextBusB.departureTime)
    .forEach(nextBusData => {
      pageScheduleBlock.htmlElem.appendChild(buildNextBusElement(nextBusData))
    })
}

/**
 * Send message to background script, which will initiate xhr API request for new data about next buses
 */
function checkNextBus () {
  sendMessage(
    {cmd: 'getNextBusInfo', cityId: CITY_ID, stopId: STOP_ID},
    renewPopup,
    errorHandler
  )
}

document.addEventListener('DOMContentLoaded', function () {
  pageScheduleBlock = Block.findBlockInDocument('page__schedule')
  pageErrorBlock = Block.findBlockInDocument('page__error')
  checkNextBus()
  setInterval(checkNextBus, 60000) // Check API every minute
})
