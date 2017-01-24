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
     * @type {HTMLElement}
     */
    this.htmlElem = htmlElem
    /**
     * @type {String}
     */
    this.className = className
  }

  /**
   * @param {HTMLElement|HTMLDocument} htmlElemRoot
   * @param {String} className
   * @return {?Block}
   */
  static findBlockIn (htmlElemRoot, className) {
    let htmlElem = htmlElemRoot.getElementsByClassName(className)[0]
    return htmlElem ? new Block(htmlElem, className) : null
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
    return htmlElem.classList.contains(className) ? new Block(htmlElem, className) : null
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
