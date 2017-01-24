'use strict'
// TODO debug mode console.log filter

import {config} from './config'
import {Block} from './utils/Block'
import {send} from './utils/post-message'

const sendToBackground = send.bind(null, 'popup', 'background')
const i18n = config.i18n.en
let backgroundPort = null
let stopId = null

/**
 * Hash with popup blocks
 * @type {{String: Block}}
 */
const blocks = {}

/**
 * @param {String} [className]
 * @param {String} [inner]
 * @param {String} [tagName='div']
 * @return {HTMLElement}
 */
function createElement (className, inner, tagName='div') {
  let elem = document.createElement(tagName)

  if (typeof className !== 'undefined')
    elem.className = className
  if (typeof inner !== 'undefined')
    elem.innerHTML = inner

  return elem
}

/**
 * @param {NextBusData} nextBusData
 * @return {HTMLElement}
 */
function buildNextBusElement (nextBusData) {
  let nextBusElem = createElement('next-bus')
  let routeIdElem = createElement('next-bus__route-id', nextBusData.routeId)
  let leftMinutes = createElement('next-bus__left-minutes',
    nextBusData.leftMinutes ? `${nextBusData.leftMinutes} min` : 'due')
  let depTimeElem = createElement('next-bus__departure-time', nextBusData.departureTime)

  nextBusElem.appendChild(routeIdElem)
  nextBusElem.appendChild(leftMinutes)
  nextBusElem.appendChild(depTimeElem)

  return nextBusElem
}

/**
 * Debounce stop-id-input
 * @param {event} event
 */
const onStopIdChange = (() => {
  let debounceTimeoutId
  const stopIdChangeHandler = event => {
    if (stopId !== event.target.value) {
      stopId = event.target.value
      console.log('Stop id input changed to: ', stopId)
      blocks.updateStatusLoader.setMod('visible', 'yes')
      sendToBackground('setState', {stopId}, backgroundPort)
    }
  }

  return event => {
    if (!event.target.value) {
      stopIdChangeHandler(event)
    } else {
      debounceTimeoutId && clearTimeout(debounceTimeoutId)
      debounceTimeoutId = setTimeout(() => {
        debounceTimeoutId = null
        stopIdChangeHandler(event)
      }, config.inputDebounceTTL)
    }
  }
})()

/**
 * Establish permanent connection to constantly worked background script
 */
function connectToBackground () {
  if (backgroundPort) {
    backgroundPort.disconnect()
  }

  backgroundPort = chrome.runtime.connect({name: 'background'})
  backgroundPort.onMessage.addListener(message => {
    let callback = callbacks[message.cmd]

    console.log(`Popup get a message: ${JSON.stringify(message)}`)

    if (typeof callback !== 'function') {
      console.log(`Popup has no callback for cmd '${message.cmd}'`)
      return
    }

    callback(message.data)
  })
}

/**
 * Restore last state
 */
function restoreState () {
  sendToBackground('getStop', null, backgroundPort)
  sendToBackground('getLastAPICallTs', null, backgroundPort)
  sendToBackground('updateData', null, backgroundPort)
}

/**
 * Hash with callbacks for background requests
 */
const callbacks = {
  /**
   * @param {APIHandledData} data
   */
  updateDataCallback: data => {
    blocks.updateStatusLoader.delMod('visible', 'yes')

    if (data && data.error) {
      blocks.error.delMod('hidden', 'yes')
      console.log(`Popup get an error in updateDataCallback: ${JSON.stringify(data.error)}`)
      return
    }

    blocks.error.setMod('hidden', 'yes')
    blocks.scheduleTable.htmlElem.innerHTML = ''

    if (!data || !Array.isArray(data.nextBuses)) {
      if (stopId) {
        blocks.scheduleMessage.htmlElem.innerText = i18n.no_info
        blocks.scheduleMessage.setMod('visible', 'yes')
      } else {
        blocks.scheduleMessage.delMod('visible', 'yes')
      }
    } else if (data.nextBuses.length === 0) {
      blocks.scheduleMessage.htmlElem.innerText = i18n.no_buses
      blocks.scheduleMessage.setMod('visible', 'yes')
    } else {
      blocks.scheduleMessage.delMod('visible', 'yes')
      data.nextBuses
        .sort((busA, busB) => busA.leftMinutes - busB.leftMinutes)
        .forEach(bus => blocks.scheduleTable.htmlElem.appendChild(buildNextBusElement(bus)))
    }
  },
  /**
   * @param {?String} initStopId
   */
  getStopCallback: initStopId => {
    stopId = initStopId

    if (stopId) {
      blocks.stopInput.htmlElem.value = stopId
    }
  },
  /**
   * @param {?Number} lastAPICallTs
   */
  getLastAPICallTsCallback: lastAPICallTs => {
    if (lastAPICallTs) {
      blocks.lastUpdateTime.htmlElem.innerText = (new Date(lastAPICallTs)).toLocaleTimeString()
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Find all necessary HTMLElements
  [
    {name: 'lastUpdateLabel', cssClass: 'update-status__last-update-label'},
    {name: 'lastUpdateTime', cssClass: 'update-status__last-update-time'},
    {name: 'updateStatusLoader', cssClass: 'update-status__loader'},
    {name: 'lastUpdate', cssClass: 'update-status__last-update'},
    {name: 'scheduleMessage', cssClass: 'schedule__message'},
    {name: 'scheduleTable', cssClass: 'schedule__table'},
    {name: 'pageLoader', cssClass: 'page__loader'},
    {name: 'stopInput', cssClass: 'stop-id-input'},
    {name: 'error', cssClass: 'error'},
    {name: 'page', cssClass: 'page'},
  ].forEach(block => {
    blocks[block.name] = Block.findBlockInDocument(block.cssClass)
  })

  connectToBackground()
  restoreState()

  // Listen stop-id value change event
  blocks.stopInput.htmlElem.addEventListener('input', onStopIdChange)

  // For some reason sometimes popup opens only as small square.
  setTimeout(() => {
    blocks.pageLoader.delMod('visible', 'yes')
    blocks.page.setMod('visible', 'yes')
  }, config.popupShowTimeout)
})
