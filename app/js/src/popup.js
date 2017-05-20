'use strict'
// TODO debug mode console.log filter

import {config} from './config'
import {APIs} from './utils/api'
import {Block} from './utils/Block'
import {send} from './utils/post-message'

const sendToBackground = send.bind(null, 'popup', 'background')
const i18n = config.i18n.en
let backgroundPort = null

/**
 * @type {State}
 */
let state = {}

/**
 * Map from state name to html element name
 * @type {{apiId, stopId, routeId}}
 */
const controlByStateName = {
  apiId: 'apiSelect',
  stopId: 'stopInput',
  routeId: 'routeInput'
}

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

  if (typeof className !== 'undefined') {
    elem.className = className
  }

  if (typeof inner !== 'undefined') {
    elem.innerHTML = inner
  }

  return elem
}

/**
 * @param {NextBusData} nextBusData
 * @return {HTMLElement}
 */
function buildNextBusElement (nextBusData) {
  const nextBusElem = createElement('next-bus')
  const routeIdElem = createElement('next-bus__route-id', nextBusData.routeId)
  const leftMinutes = createElement('next-bus__left-minutes',
    nextBusData.leftMinutes ? `${nextBusData.leftMinutes} min` : 'due')
  const depTimeElem = createElement('next-bus__departure-time', nextBusData.departureTime)

  nextBusElem.appendChild(routeIdElem)
  nextBusElem.appendChild(leftMinutes)
  nextBusElem.appendChild(depTimeElem)

  return nextBusElem
}

/**
 * @param {State} state1
 * @param {State} state2
 * @return {Boolean}
 */
function isStatesEqual (state1, state2) {
  const keys1 = Object.keys(state1)
  const keys2 = Object.keys(state2)

  return keys1.length === keys2.length &&
      keys1.every(key1 => state1[key1] === state2[key1])
}

const favoriteStories = [
  'I bet you like this route!',
  'This is one of your favorite routes.',
  'Nice choice ;)'
]

/**
 * @param {State} favorite
 * @param {Boolean} isCurrent
 * @return {HTMLElement}
 */
function buildFavoriteElement (favorite, isCurrent) {
  const favoriteElemClass = `favorite-state ${isCurrent ? 'favorite-state_current_yes' : ''}`
  const favoriteElem = createElement(favoriteElemClass)
  const apiNameElem = createElement('favorite-api-name', APIs[favorite.apiId] ? APIs[favorite.apiId].name : '-')
  const stopElem = createElement('favorite-stop', favorite.stopId)
  const routeElem = createElement('favorite-route', favorite.routeId)
  const controlDel = createElement('favorite-control favorite-control_type_del')

  const storyIndex = Math.floor(Math.random() * favoriteStories.length)
  const story = favoriteStories[storyIndex]

  apiNameElem.setAttribute('title', story)
  stopElem.setAttribute('title', story)
  routeElem.setAttribute('title', story)
  controlDel.setAttribute('title', 'Remove')

  favoriteElem.appendChild(apiNameElem)
  favoriteElem.appendChild(stopElem)
  favoriteElem.appendChild(routeElem)
  favoriteElem.appendChild(controlDel)

  favoriteElem.dataset.state = JSON.stringify(favorite)

  favoriteElem.addEventListener('click', onFavoriteRowClick)
  controlDel.addEventListener('click', onFavoriteRowDelClick)

  return favoriteElem
}

/**
 * @this {HTMLElement}
 * @param {Event} event
 */
function onFavoriteRowDelClick (event) {
  const favoriteDelIcon = this
  const favoriteTableRow = favoriteDelIcon.parentNode
  const favoriteTable = favoriteTableRow.parentNode
  const msgParams = {rawState: favoriteTableRow.dataset.state, needToUpdateFavorites: true}

  sendToBackground('favoriteInfo', msgParams, backgroundPort)

  favoriteTable.removeChild(favoriteTableRow)

  event.stopPropagation()
}

/**
 * @this {HTMLElement}
 * @param {Event} event
 */
function onFavoriteRowClick (event) {
  const favoriteTableRow = this

  sendToBackground('setState', JSON.parse(favoriteTableRow.dataset.state), backgroundPort)

  blocks.pageTypeMain.toggleMod('visible', 'yes')
  blocks.pageTypeFavorite.toggleMod('visible', 'yes')

  event.stopPropagation()
}

/**
 * @param {String} stateName
 * @param {Boolean} [hasDebounce=false]
 * @return {Function}
 */
function getOnControlChange (stateName, hasDebounce=false) {
  let debounceTimeoutId
  const onChange = event => {
    if (state[stateName] !== event.target.value) {
      state[stateName] = event.target.value

      console.log(`${stateName} changed to: ${state[stateName]}`)

      blocks.updateStatusLoader.setMod('visible', 'yes')
      sendToBackground('setState', {[stateName]: state[stateName]}, backgroundPort)
    }
  }

  return event => {
    if (hasDebounce && event.target.value) {
      debounceTimeoutId && clearTimeout(debounceTimeoutId)
      debounceTimeoutId = setTimeout(() => {
        debounceTimeoutId = null
        onChange(event)
      }, config.inputDebounceTTL)
    } else {
      onChange(event)
    }
  }
}

/**
 * Favorite-total icon click handler
 */
function onFavoriteTotalClick () {
  blocks.pageTypeMain.toggleMod('visible', 'yes')
  blocks.pageTypeFavorite.toggleMod('visible', 'yes')
}

/**
 * Favorite-current icon click handler
 */
function onFavoriteCurrentClick () {
  sendToBackground('favoriteInfo', {needToUpdateFavorites: true}, backgroundPort)
}

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
  sendToBackground('getApi', null, backgroundPort)
  sendToBackground('getStop', null, backgroundPort)
  sendToBackground('getRoute', null, backgroundPort)
  sendToBackground('favoriteInfo', null, backgroundPort)
  sendToBackground('getLastAPICallTs', null, backgroundPort)
  sendToBackground('updateData', null, backgroundPort)
}

/**
 * Hash with callbacks for background requests
 */
const callbacks = {
  setStateCallback: newState => {
    Object.keys(newState).forEach(stateName => {
      const controlName = controlByStateName[stateName]
      const control = blocks[controlName]

      if (!control) {
        console.log(`setStateCallback: don't now that control: ${controlName}`)
      } else if (state[stateName] !== newState[stateName]) {
        state[stateName] = newState[stateName]

        console.log(`setStateCallback: ${stateName} changed to: ${state[stateName]}`)

        control.htmlElem.value = state[stateName] || ''

        blocks.updateStatusLoader.setMod('visible', 'yes')
      }
    })
  },
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
      if (state.stopId) {
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
      data.nextBuses.forEach(bus => {
        blocks.scheduleTable.htmlElem.appendChild(buildNextBusElement(bus))
      })
    }
  },
  /**
   * @param {?String} initApiId
   */
  getApiCallback: initApiId => {
    state.apiId = initApiId

    if (state.apiId) {
      blocks.apiSelect.htmlElem.value = state.apiId
    }
  },
  /**
   * @param {?String} initStopId
   */
  getStopCallback: initStopId => {
    state.stopId = initStopId

    if (state.stopId) {
      blocks.stopInput.htmlElem.value = state.stopId
    }
  },
  /**
   * @param {?String} initRouteId
   */
  getRouteCallback: initRouteId => {
    state.routeId = initRouteId

    if (state.routeId) {
      blocks.routeInput.htmlElem.value = state.routeId
    }
  },
  /**
   * @param {Object} favoriteInfo
   *  @property {Boolean} isCurrentFavorite
   *  @property {Number} favorites
   */
  favoriteInfoCallback: favoriteInfo => {
    if (favoriteInfo.isCurrentFavorite) {
      blocks.favoriteCurrent.delMod('visible', 'yes')
    } else {
      blocks.favoriteCurrent.setMod('visible', 'yes')
    }

    blocks.favoritesTable.htmlElem.innerText = ''

    if (favoriteInfo.favorites.length > 0) {
      blocks.favoriteTotal.htmlElem.dataset.content = String(favoriteInfo.favorites.length)
      blocks.favoriteTotal.delMod('empty', 'yes')

      favoriteInfo.favorites.forEach(rawFavorite => {
        const parsedFavorite = JSON.parse(rawFavorite)
        blocks.favoritesTable.htmlElem.appendChild(
          buildFavoriteElement(parsedFavorite, isStatesEqual(favoriteInfo.state, parsedFavorite)))
      })
    } else {
      blocks.favoriteTotal.htmlElem.dataset.content = 0
      blocks.favoriteTotal.setMod('empty', 'yes')

      if (blocks.pageTypeFavorite.hasMod('visible', 'yes')) {
        blocks.pageTypeMain.toggleMod('visible', 'yes')
        blocks.pageTypeFavorite.toggleMod('visible', 'yes')
      }
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
    {name: 'lastUpdate', cssClass: 'update-status__last-update'},
    {name: 'pageTypeFavorite', cssClass: 'page_type_favorite'},
    {name: 'favoriteTotal', cssClass: 'favorite_type_total'},
    {name: 'favoriteCurrent', cssClass: 'favorite_type_current'},
    {name: 'favoritesTable', cssClass: 'favorites-table'},
    {name: 'scheduleMessage', cssClass: 'schedule__message'},
    {name: 'scheduleTable', cssClass: 'schedule__table'},
    {name: 'pageTypeMain', cssClass: 'page_type_main'},
    {name: 'routeInput', cssClass: 'route-id-input'},
    {name: 'stopInput', cssClass: 'stop-id-input'},
    {name: 'apiSelect', cssClass: 'api-id-select'},
    {name: 'error', cssClass: 'error'},
  ].forEach(block => {
    blocks[block.name] = Block.findBlockInDocument(block.cssClass)
  });

  [
    {name: 'updateStatusLoader', hostCssClass: 'update-status__loader', cssClass: 'loader'},
    {name: 'pageLoader', hostCssClass: 'page__loader', cssClass: 'loader'}
  ].forEach(block => {
    blocks[block.name] = Block.findBlockOn(
      Block.findBlockInDocument(block.hostCssClass).htmlElem,
      block.cssClass)
  })

  connectToBackground()
  restoreState()

  blocks.apiSelect.htmlElem.addEventListener('change', getOnControlChange('apiId'))
  blocks.stopInput.htmlElem.addEventListener('input', getOnControlChange('stopId', true))
  blocks.routeInput.htmlElem.addEventListener('input', getOnControlChange('routeId', true))

  blocks.favoriteTotal.htmlElem.addEventListener('click', onFavoriteTotalClick)
  blocks.favoriteCurrent.htmlElem.addEventListener('click', onFavoriteCurrentClick)

  // For some reason sometimes popup opens only as small square.
  setTimeout(() => {
    blocks.pageLoader.delMod('visible', 'yes')
    blocks.pageTypeMain.setMod('visible', 'yes')
    blocks.favoriteCurrent.setMod('visible', 'yes')
    blocks.favoriteTotal.setMod('visible', 'yes')
  }, config.popupShowTimeout) // TODO Dirty hack
})
