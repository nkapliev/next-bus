'use strict'

/**
 * @param {Object} params
 * @return {String}
 */
function queryBuilder (params) {
  return params
    ? Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    : ''
}

/**
 * @param {String} url
 * @param {Object} [params]
 * @param {Function} [callback]
 */
export function makeAPIRequest (url, params, callback) {
  let xhr = new XMLHttpRequest()

  url = params
    ? `${url}?${queryBuilder(params)}`
    : url

  console.log(`Trying to make API request: ${url}`)

  xhr.open('GET', url) // TODO What about POST|PUT|...?
  xhr.responseType = 'json' // TODO What about other types?
  xhr.onload = _ => {
    console.log('Get response from API:')
    console.log(JSON.stringify(xhr.response, null, 4))
    callback && callback(xhr.response)
  }
  xhr.onerror = callback
    ? err => callback(null, err)
    : err => console.log(`Network error: ${err}`)
  xhr.send()
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
