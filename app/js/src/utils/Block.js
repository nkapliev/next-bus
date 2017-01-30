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
    const htmlElem = htmlElemRoot.getElementsByClassName(className)[0]
    const blockClassName = className.split('_')[0]

    return htmlElem ? new Block(htmlElem, blockClassName) : null
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
    const blockClassName = className.split('_')[0]

    return htmlElem.classList.contains(className) ? new Block(htmlElem, blockClassName) : null
  }

  /**
   * @param {String} modName
   * @param {String} modValue
   */
  setMod (modName, modValue) {
    this.htmlElem.classList.forEach(cssClass => {
      cssClass = cssClass.split('_')

      /**
       * block.setMod('type', 'aaa')
       * If block already has cssClass block_type_bbb, we should remove it.
       */
      if (
        cssClass[0] === this.className &&
        cssClass[1] === modName &&
        cssClass[2] &&
        cssClass[2] !== modValue
      ) {
        this.delMod(cssClass[1], cssClass[2])
      }
    })

    this.htmlElem.classList.add(`${this.className}_${modName}_${modValue}`)
  }

  /**
   * @param {String} modName
   * @param {String} modValue
   */
  toggleMod (modName, modValue) {
    if (this.hasMod(modName, modValue)) {
      this.delMod(modName, modValue)
    } else {
      this.setMod(modName, modValue)
    }
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
