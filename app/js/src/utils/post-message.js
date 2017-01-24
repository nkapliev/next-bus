'use strict'

/**
 * @param {String} [from='sender']
 * @param {String} [to='receiver']
 * @param {String} cmd
 * @param {*} data
 * @param {chrome.runtime.Port} port - Last, because it changes every time when you reconnect
 * @return {Promise}
 */
export function send (from='sender', to='receiver', cmd, data, port) {
  return Promise.resolve(data)
    .then(data => {
      let message = {cmd, data}

      console.log(`${from} send post message to ${to}: ${JSON.stringify(message, null, 4)}`)

      if (port) {
        port.postMessage(message)
      } else {
        throw new Error(`${from} can't send post message to ${to} because port was disconnected.`)
      }
    })
    .catch(err => {
      let message = {cmd, err: err && err.message}

      console.log(`${from} send post message with error to ${to}: ${message.err}`)

      if (port) {
        port.postMessage(message)
      } else {
        throw new Error(`${from} can't send post message with error to ${to} because port was disconnected.`)
      }
    })
}
