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
 * Current request
 */
let xhr

/**
 * @param {String} url
 * @param {Object} [params]
 * @param {Function} [callback]
 * @return {Promise}
 */
export function makeAPIRequest (url, params, callback) {
  cancelAPIRequest()

  xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    url = params
      ? `${url}?${queryBuilder(params)}`
      : url

    console.log(`Trying to make API request: ${url}`)

    xhr.open('GET', url) // TODO What about POST|PUT|...?
    xhr.responseType = 'json' // TODO What about other types?
    xhr.onload = () => {
      console.log('Get response from API:')
      console.log(JSON.stringify(xhr.response, null, 4))
      resolve(xhr.response)
      callback && callback(null, xhr.response)
    }
    xhr.onerror = err => {
      console.log(`makeAPIRequest error: ${err}`)
      reject(err)
      callback && callback(err)
    }
    xhr.onloadend = () => {
      xhr = null
    }
    xhr.send()
  })
}

/**
 * Abort current API request
 */
export function cancelAPIRequest () {
  xhr && xhr.abort()
}
