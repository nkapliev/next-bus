'use strict'

/**
 * BEM-like wrapper around HTMLElement
 * @see https://en.bem.info/
 */
export class Block {
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
 * @param {String} [className]
 * @param {String} [inner]
 * @param {String} [tagName='div']
 * @return {HTMLElement}
 */
export function createElement (className, inner, tagName='div') {
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
export function buildNextBusElement (nextBusData) {
  let depTimeElem = createElement('next-bus__departure-time', nextBusData.departureTime)
  let routeIdElem = createElement('next-bus__route-id', nextBusData.routeId)
  let nextBusElem = createElement('next-bus')

  nextBusElem.appendChild(routeIdElem)
  nextBusElem.appendChild(depTimeElem)

  return nextBusElem
}

/**
 * @param {Object} msg
 * @param {Function} [callback]
 * @param {Function} [errorCallback]
 */
export function sendMessage (msg, callback, errorCallback) {
  console.log(`Send message to next-bus script: ${JSON.stringify(msg)}`)

  chrome.runtime.sendMessage(msg, null, response => { // TODO how to send only to particular script?
    if (typeof response === 'undefined') {
      console.log(`Error occurs while connecting to message receiver: ${JSON.stringify(chrome.runtime.lastError)}`)
      errorCallback && errorCallback(chrome.runtime.lastError)
    } else {
      console.log(`Get response from background page: ${JSON.stringify(response)}`)
      callback && callback(response)
    }
  })
}
