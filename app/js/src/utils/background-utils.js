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
