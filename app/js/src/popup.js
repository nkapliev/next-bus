'use strict'

import {Block, buildNextBusElement, sendMessage} from './utils/popup-utils'

// TODO debug mode console.log filter
const CITY_ID = 'DUB' // TODO 1. get from select menu in interface and save to localstorage 2. Think about uniq ID

const PROJECT_REPO_URL = 'https://github.com/nkapliev/next-bus'
const CHECK_API_INTERVAL = 60000 // 1 minute
const TEXTS = {
  NO_BUSES: 'No bus shortly'
}
let checkApiIntervalId
let lastApiCheckTs
let isNewStopId
let stopId

/**
 * Hash with main popup blocks
 * @type {{String: Block}}
 */
const pageBlocks = {}

/**
 * @param {JSON} err
 * @return {String}
 */
function getErrorMessage (err) {
  let errorMessage

  if (typeof err === 'string') {
    errorMessage = err
  } else if (err && err.message) {
    errorMessage = err.message
  } else {
    errorMessage =
      'Something bad just happened.<br>' +
      `Please report here: <a target="_blank" href="${PROJECT_REPO_URL}/issues">next-bus/issues</a>`
  }

  return errorMessage
}

/**
 * @param {Object} err
 */
function errorHandler (err) {
  // If user ask about new stop, then remove schedule
  if (isNewStopId) {
    pageBlocks.scheduleTable.htmlElem.innerHTML = ''
    localStorage.setItem('schedule', '')

    pageBlocks.lastUpdateTime.htmlElem.innerText = (new Date(Date.now())).toLocaleTimeString()
  }

  pageBlocks.error.htmlElem.innerHTML = getErrorMessage(err)
  pageBlocks.error.delMod('hidden', 'yes')
  console.log(`popup errorHandler err: ${JSON.stringify(err)}`)
}

/**
 * @param {Response} response
 */
function renewPopup (response) {
  if (response.error) {
    errorHandler(response.error)
    return
  }

  isNewStopId && (isNewStopId = false)

  // Hide error
  pageBlocks.error.setMod('hidden', 'yes')
  // Clear schedule
  pageBlocks.scheduleTable.htmlElem.innerHTML = ''
  // Save to localStorage successful api check ts
  lastApiCheckTs = Date.now()
  localStorage.setItem('last-api-successful-check-ts', lastApiCheckTs)
  pageBlocks.lastUpdateTime.htmlElem.innerText = (new Date(lastApiCheckTs)).toLocaleTimeString()

  if (response.data.nextBuses.length === 0) {
    pageBlocks.scheduleMessage.htmlElem.innerText = TEXTS.NO_BUSES
    pageBlocks.scheduleMessage.setMod('visible', 'yes')
  } else {
    pageBlocks.scheduleMessage.delMod('visible', 'yes')
    response.data.nextBuses
      .sort((nextBusA, nextBusB) => nextBusA.leftMinutes - nextBusB.leftMinutes)
      .forEach(nextBusData => {
        pageBlocks.scheduleTable.htmlElem.appendChild(buildNextBusElement(nextBusData))
      })
  }

  // Save new schedule to localStorage for being able to restore it after popup will be closed
  localStorage.setItem('schedule', pageBlocks.scheduleTable.htmlElem.innerHTML)
}

/**
 * Send message to background script, which will initiate xhr API request for new data about next buses
 */
function checkNextBus () {
  pageBlocks.lastUpdate.delMod('visible', 'yes')
  pageBlocks.updateStatusLoader.setMod('visible', 'yes')

  sendMessage(
    {cmd: 'getNextBusInfo', cityId: CITY_ID, stopId: stopId},
    renewPopup,
    errorHandler,
    _ => {
      pageBlocks.updateStatusLoader.delMod('visible', 'yes')
      pageBlocks.lastUpdate.setMod('visible', 'yes')
    }
  )
}

/**
 * Debounce stop-id-input
 * @param {event} event
 */
const onStopIdChange = (_ => {
  const DEBOUNCE_TTL = 1000 // 1 second
  let debounceTimeoutId

  return event => {
    debounceTimeoutId && clearTimeout(debounceTimeoutId)
    debounceTimeoutId = setTimeout(_ => {
      debounceTimeoutId = null

      // If value have been changed
      if (stopId !== event.target.value) {
        stopId = event.target.value
        localStorage.setItem('stop-id', stopId)

        console.log('Stop id input changed to: ', stopId)

        // If user clear stop-id input -- erase clear the schedule
        if (stopId === '') {
          pageBlocks.scheduleTable.htmlElem.innerHTML = ''
          localStorage.setItem('schedule', '')
        // Otherwise restart api checking
        } else {
          isNewStopId = true

          clearInterval(checkApiIntervalId)
          checkNextBus()
          checkApiIntervalId = setInterval(checkNextBus, CHECK_API_INTERVAL)
        }
      }
    }, DEBOUNCE_TTL)
  }
})()

document.addEventListener('DOMContentLoaded', function () {
  // Find all necessary HTMLElements
  pageBlocks.scheduleTable = Block.findBlockInDocument('schedule__table')
  pageBlocks.scheduleMessage = Block.findBlockInDocument('schedule__message')
  pageBlocks.lastUpdate = Block.findBlockInDocument('update-status__last-update')
  pageBlocks.lastUpdateTime = Block.findBlockInDocument('update-status__last-update-time')
  pageBlocks.lastUpdateLabel = Block.findBlockInDocument('update-status__last-update-label')
  pageBlocks.updateStatusLoader = Block.findBlockInDocument('update-status__loader')
  pageBlocks.error = Block.findBlockInDocument('error')
  pageBlocks.stopInput = Block.findBlockInDocument('stop-id-input')

  // Listen stop-id value change event
  pageBlocks.stopInput.htmlElem.addEventListener('input', onStopIdChange)

  // Get stop id from localStorage
  stopId = localStorage.getItem('stop-id')

  // Get ts when we last time checked api
  lastApiCheckTs = parseInt(localStorage.getItem('last-api-successful-check-ts'), 10)

  // If already have stopId
  if (stopId) {
    // Set stopId value to input
    pageBlocks.stopInput.htmlElem.value = stopId

    if (lastApiCheckTs) {
      pageBlocks.lastUpdateTime.htmlElem.innerText = (new Date(lastApiCheckTs)).toLocaleTimeString()

      // If from last checking pass more then half of check interval -- check api immediately.
      // TODO I do not kno why 30 sec. Have any idea for better value?
      if (lastApiCheckTs < (Date.now() - CHECK_API_INTERVAL / 2))
        checkNextBus()
      else {
        // Otherwise restore last saved schedule
        let scheduleHTML = localStorage.getItem('schedule')
        if (scheduleHTML) {
          pageBlocks.scheduleTable.htmlElem.innerHTML = scheduleHTML
        // If save exists but empty, show empty schedule text
        } else if (scheduleHTML === '') {
          pageBlocks.scheduleMessage.htmlElem.innerText = TEXTS.NO_BUSES
          pageBlocks.scheduleMessage.setMod('visible', 'yes')
        }

        // And refresh update block
        pageBlocks.updateStatusLoader.delMod('visible', 'yes')
        pageBlocks.lastUpdate.setMod('visible', 'yes')
      }
    } else {
      checkNextBus()
    }

    // Start checking API
    checkApiIntervalId = setInterval(checkNextBus, CHECK_API_INTERVAL)
  } else {
    pageBlocks.updateStatusLoader.delMod('visible', 'yes')
  }
})
