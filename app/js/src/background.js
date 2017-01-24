'use strict'

import {makeAPIRequest, cancelAPIRequest} from './utils/api'
import {CITIES_API} from './utils/cities'
import {config} from './config'
import {send} from './utils/post-message'

const sendToPopup = send.bind(null, 'background', 'popup')
const colors = config.colors
const state = {
  // TODO 1. get cityId from select menu in interface and save to localstorage 2. Think about uniq ID
  cityId: localStorage.getItem('city-id') || config.defaultCityId,
  stopId: localStorage.getItem('stop-id'),
  routeId: localStorage.getItem('route-id')
}

let isStateSync = false
let lastStateSyncTs
let nextBusesFromLastAPICheck
let api = CITIES_API[state.cityId]
let dataUpdateIntervalId
let popupPort = null

const handlers = {
  /**
   * @return {Promise<null|NextBusData[]>}
   */
  getNextBuses: () => {
    if (!state.stopId) {
      cancelAPIRequest()
      return Promise.resolve(null)
    }

    // If state and data is not synced
    // OR from last checking pass more then half of check interval
    // -- check api immediately.
    if (
      !isStateSync ||
      // TODO I do not kno why 30 sec. Have any idea for better value?
      Number.isInteger(lastStateSyncTs) && lastStateSyncTs < (Date.now() - config.dataUpdateInterval / 2)
    ) {
      const params = api.paramsBuilder({
        stopId: state.stopId,
        routeId: state.routeId
      })

      return makeAPIRequest(api.url, params)
        .then(api.responseHandler)
    } else {
      return Promise.resolve(nextBusesFromLastAPICheck)
    }
  },
  /**
   * Re-init city API interval checking
   */
  updateData: (() => {
    const intervalCallback = () => {
      handlers.getNextBuses()
        .then(nextBuses => {
          isStateSync = true
          lastStateSyncTs = Date.now()
          nextBusesFromLastAPICheck = nextBuses

          if (Array.isArray(nextBuses) && nextBuses.length) {
            handlers.updateBadge(null, nextBuses[0].leftMinutes)
          } else {
            // Not data? Clear the badge!
            handlers.updateBadge()
          }

          return Promise.all([
            sendToPopup('updateDataCallback', nextBuses, popupPort),
            sendToPopup('getLastAPICallTsCallback', lastStateSyncTs, popupPort)
          ])
        })
        .catch(err => {
          console.log(`Background updateData get an uncaught err: ${err && err.message}`)

          if (popupPort) {
            popupPort.disconnect()
            popupPort = null
          }
        })
    }

    return () => {
      dataUpdateIntervalId && clearInterval(dataUpdateIntervalId)

      if (!state.stopId) {
        console.log(`Can't execute updateData without state.stopId: ${state.stopId}`)
        cancelAPIRequest()
        sendToPopup('updateDataCallback', null, popupPort)
        sendToPopup('getLastAPICallTsCallback', null, popupPort)
      }

      intervalCallback()
      dataUpdateIntervalId = setInterval(intervalCallback, config.dataUpdateInterval)
    }
  })(),
  /**
   * With no params will clear the badge
   * @param {*} [err]
   * @param {Number} [minutes]
   */
  updateBadge: (err, minutes) => {
    let text
    let color

    if (err) {
      text = 'err'  // TODO replace 'err' with icon?
      color = colors.error
    } else if (typeof minutes === 'number') {
      text = String(minutes)
      color = minutes <= config.alarmStartTime ? colors.alarm : colors.ok
    } else {
      text = ''
      color = colors.empty
    }

    chrome.browserAction.setBadgeText({text})
    chrome.browserAction.setBadgeBackgroundColor({color})
  },
  setState: newState => {
    const cityId = newState.cityId
    const stopId = newState.stopId
    const routeId = newState.routeId

    if (typeof cityId !== 'undefined' && cityId !== state.cityId) {
      if (!CITIES_API[cityId]) {
        throw new Error(`Background can't setCity, because there is no api for city '${cityId}'`)
      }

      api = CITIES_API[cityId]
      state.cityId = cityId
      localStorage.setItem('city-id', cityId)

      isStateSync = false
    }

    if (typeof stopId !== 'undefined' && stopId !== state.stopId) {
      state.stopId = stopId
      localStorage.setItem('stop-id', stopId)

      isStateSync = false
    }

    if (typeof routeId !== 'undefined' && routeId !== state.routeId) {
      state.routeId = routeId
      localStorage.setItem('route-id', routeId)

      isStateSync = false
    }

    isStateSync || handlers.updateData()
  },
  getCity: () => state.cityId,
  getStop: () => state.stopId,
  getRoute: () => state.routeId,
  getLastAPICallTs: () => lastStateSyncTs
}

chrome.runtime.onConnect.addListener(port => {
  if (popupPort) {
    popupPort.disconnect()
  }

  popupPort = port
  popupPort.onMessage.addListener(message => {
    let handler = handlers[message.cmd]

    console.log(`Background get a message: ${JSON.stringify(message)}`)

    if (typeof handler !== 'function') {
      console.log(`Background has no handler for cmd '${message.cmd}'`)
      return
    }

    sendToPopup(message.cmd + 'Callback', handler.call(null, message.data), popupPort)
      .catch(err => {
        console.log(`Background handler pipe get an uncaught err: ${err && err.message}`)

        if (popupPort) {
          popupPort.disconnect()
          popupPort = null
        }
      })
  })
})

handlers.updateData()
