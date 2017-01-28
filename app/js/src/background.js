'use strict'

import {makeAPIRequest, cancelAPIRequest, APIs} from './utils/api'
import {send} from './utils/post-message'
import {config} from './config'

const sendToPopup = send.bind(null, 'background', 'popup')
const i18n = config.i18n.en
const colors = config.colors
const state = {
  apiId: localStorage.getItem('api-id') || config.defaultApiId,
  stopId: localStorage.getItem('stop-id'),
  routeId: localStorage.getItem('route-id')
}

let isStateSync = false
let lastStateSyncTs
let lastAPICheckData
let api = APIs[state.apiId]
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
      return makeAPIRequest({
          url: api.url,
          method: api.method,
          responseType: api.responseType,
          params: api.paramsBuilder({
            stopId: state.stopId,
            routeId: state.routeId
          })
        })
        .then(api.responseHandler)
        .then(data => {
          if (Array.isArray(data.nextBuses)) {
            data.nextBuses.sort((busA, busB) => busA.leftMinutes - busB.leftMinutes)
          }

          return data
        })
    } else {
      return Promise.resolve(lastAPICheckData)
    }
  },
  /**
   * Re-init API interval checking
   */
  updateData: (() => {
    const intervalCallback = () => {
      handlers.getNextBuses()
        .then(data => {
          isStateSync = true
          lastStateSyncTs = Date.now()
          lastAPICheckData = data

          if (data && Array.isArray(data.nextBuses) && data.nextBuses.length) {
            handlers.updateBadge(data.nextBuses[0].leftMinutes)
          } else {
            // Not data? Clear the badge!
            handlers.updateBadge()
          }

          return Promise.all([
            sendToPopup('updateDataCallback', data, popupPort),
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
   * @param {String|Number} [minutes]
   */
  updateBadge: minutes => {
    let text = ''
    let color = colors.empty

    minutes = parseInt(minutes, 10)

    if (Number.isInteger(minutes)) {
      text = minutes === 0 ? i18n.due : String(minutes)
      color = minutes <= config.alarmStartTime ? colors.alarm : colors.ok
    }

    chrome.browserAction.setBadgeText({text})
    chrome.browserAction.setBadgeBackgroundColor({color})
  },
  setState: newState => {
    const apiId = newState.apiId
    const stopId = newState.stopId
    const routeId = newState.routeId

    if (typeof apiId !== 'undefined' && apiId !== state.apiId) {
      if (!APIs[apiId]) {
        throw new Error(`Background can't setApi, because there is no api for '${apiId}'`)
      }

      api = APIs[apiId]
      state.apiId = apiId
      localStorage.setItem('api-id', apiId)

      chrome.browserAction.setIcon({
        path: {
          16: `icons/${apiId}/16.png`,
          24: `icons/${apiId}/24.png`,
          32: `icons/${apiId}/32.png`,
          48: `icons/${apiId}/48.png`,
          128: `icons/${apiId}/128.png`
        }
      })

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
  getApi: () => state.apiId,
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
