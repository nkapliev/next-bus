export let config = {
  defaultCityId: 'DUB',
  colors: {
    ok: [0, 128, 0, 255],
    alarm: [192, 0, 0, 255],
    error: [192, 192, 192, 255],
    empty: [0, 0, 0, 0]
  },
  dataUpdateInterval: 60000, // 60 * 1000ms = 1 minute
  alarmStartTime: 5, // minutes
  nextBusListSize: 10,
  inputDebounceTTL: 300, // ms
  popupShowTimeout: 500, // ms
  i18n: {
    en: {
      no_buses: 'No bus shortly',
      no_info: 'No info about stop',
      due: 'due'
    }
  },
  repo: 'https://github.com/nkapliev/next-bus'
}
