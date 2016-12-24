"use strict"

// TODO debug mode console.log filter
const CITY_ID = 'DUB' // TODO 1. get from select menu in interface and save to localstorage 2. Think about uniq ID
const STOP_ID = '414' //TODO get from input in interface and save to localstorage


function sendMessage (msg, callback, errorCallback) {
  console.log(`Send message to next-bus script: ${JSON.stringify(msg)}`)

  chrome.runtime.sendMessage(msg, null, function(response) { // TODO how to send only to particular script?
    if (typeof response === 'undefined') {
      console.log(`Error from background page: ${JSON.stringify(chrome.runtime.lastError)}`)
      errorCallback && errorCallback(chrome.runtime.lastError)
      return
    }
    console.log(`Get response from background page: ${JSON.stringify(response)}`);

    callback && callback.apply(this, arguments)
  })
}

function errorHandler (err) {
  // TODO
  console.log(`popup errorHandler err: ${JSON.stringify(err)}`)
}

function renewPopup (data) {
  // TODO
  console.log(`popup renewPopup data: ${JSON.stringify(data)}`)
}

document.addEventListener('DOMContentLoaded', function () {
  sendMessage(
    {cmd: 'getNextBusInfo', cityId: CITY_ID, stopId: STOP_ID},
    renewPopup,
    errorHandler
  )
});
