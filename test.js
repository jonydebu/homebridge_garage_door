var objekt ={ Error: false,Close: false, Open: false, Relay: false, Motor: false }
console.log(objekt)
var json = '{"System":{"Build": 20000,"Unit": 1, "Uptime": 1143,"Free RAM": 20464,"Local time": 2018-02-20 12:34:24 },"Sensors":[ {"TaskName": "Close","state": 1.00},{"TaskName": "Open","state": 0.00}, { "TaskName": "Relay",  "state": 0.00},{  "TaskName": "Motor",   "state": 0.0 }]}'
var json = "{" + json.match(/"Sensors":\[.+\]/i)[0] + "}"
JSON.parse(json).Sensors.forEach(item => {
    objekt[item.TaskName] = item.state == 1
})
objekt.TimeStamp = new Date().valueOf()
console.log(objekt)