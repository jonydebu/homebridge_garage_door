// This is plugin for homebridge
var request = require('request');
var Service, Characteristic;
module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    DoorState = homebridge.hap.Characteristic.CurrentDoorState;

    homebridge.registerAccessory("ESPEasyGarageOpener", "ESPEasyGarageOpener", ESPEasyGarageOpener);
};

class ESPEasyGarageOpener {
    constructor(log, config) {
        this.log = log;
        this.name = config.name;
        this.ip = config.ip;
        this.lastOpened = new Date();
        this.SensorState = { Close: true, Open: false, Relay: false , Motor: false};
        this.service = new Service.GarageDoorOpener(this.name, this.name);
        this.setupGarageDoorOpenerService();

        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'ESPEasy Garage Door')
            .setCharacteristic(Characteristic.Model, 'ESPEasy Remote Control')
            .setCharacteristic(Characteristic.SerialNumber, '1068');
    }

    setupGarageDoorOpenerService() {

        this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
        this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

        this.service.getCharacteristic(Characteristic.TargetDoorState)
            .on('get', this.getState.bind(this))
            .on('set', this.setState.bind(this));

    }
    getState(callback) {
        var log = this.log;
        request.get({
            url: 'http://' + this.ip + '/json',
            timeout: 120000
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                var json = JSON.parse(body);

                log.debug('State: ' + json.Sensors);
                for (var keyStat in this.SensorsState){
                    this.SensorsState[keyStat] = getStateFromJson(json, keyStat);
                }
                
                callback(null, (json.state == 1));
                return;
            }

            log.debug('Error getting door state. (%s)', error);

            callback();
        });
    }

}
getStateFromJson(json, key){
    try {
        return (parseInt(json.Sensors.find(item => item.TaskName.toUpper() == key.toUpper()).state) == 1);

    }
    catch{
        return false;
    }
}
setState(callback){

}
getServices() {
    return [this.informationService, this.service];
}
}