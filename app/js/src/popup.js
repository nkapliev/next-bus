'use strict'

import {sendMessage} from './utils'

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
 * BEM-like wrapper around HTMLElement
 * @see https://en.bem.info/
 */
class Block {
  /**
   * @param {HTMLElement} htmlElem
   * @param {String} [className=htmlElem.classList[0]]
   */
  constructor (htmlElem, className=htmlElem.classList[0]) {
    /**
     * @type {String}
     */
    this.className = className
    /**
     * @type {HTMLElement}
     */
    this.htmlElem = htmlElem
  }

  /**
   * @param {HTMLElement|HTMLDocument} htmlElemRoot
   * @param {String} className
   * @return {?Block}
   */
  static findBlockIn (htmlElemRoot, className) {
    let htmlElem = htmlElemRoot.getElementsByClassName(className)[0]
    return htmlElem ? new Block(htmlElem) : null
  }

  /**
   * @param {String} className
   * @return {?Block}
   */
  static findBlockInDocument (className) {
    return Block.findBlockIn(document.body, className)
  }

  /**
   * @param {HTMLElement|HTMLDocument} htmlElem
   * @param {String} className
   * @return {?Block}
   */
  static findBlockOn (htmlElem, className) {
    return htmlElem.classList.contains(className) ? new Block(htmlElem) : null
  }

  /**
   * @param {String} modName
   * @param {String} modValue
   */
  setMod (modName, modValue) {
    this.htmlElem.classList.add(`${this.className}_${modName}_${modValue}`)
  }

  /**
   * @param {String} modName
   * @param {String} modValue
   */
  delMod (modName, modValue) {
    this.htmlElem.classList.remove(`${this.className}_${modName}_${modValue}`)
  }

  /**
   * @param {String} modName
   * @param {String} modValue
   * @return {Boolean}
   */
  hasMod (modName, modValue) {
    return this.htmlElem.classList.contains(`${this.className}_${modName}_${modValue}`)
  }
}

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
  let depTimeElem = createElement('next-bus__departure-time', nextBusData.departureTime)
  let routeIdElem = createElement('next-bus__route-id', nextBusData.routeId)
  let nextBusElem = createElement('next-bus')

  nextBusElem.appendChild(routeIdElem)
  nextBusElem.appendChild(depTimeElem)

  return nextBusElem
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
  setInterval(checkNextBus, 5000) // TODO 60000) // Check API every minute
})
