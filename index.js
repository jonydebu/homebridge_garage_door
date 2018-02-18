// This is plugin for homebridge
var request = require('request');
var Service, Characteristic, DoorState;

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    DoorState = Characteristic.CurrentDoorState;

    homebridge.registerAccessory("ESPEasyGarageOpener", "ESPEasyGarageOpener", ESPEasyGarageOpener);
};

class ESPEasyGarageOpener {
    constructor(log, config) {
        this.log = log;
        this.name = config.name;
        this.ip = config.ip;
        this.doorOpensInSeconds = config.doorOpensInSeconds || 16;
        this.doorCloseInSeconds = config.doorCloseInSeconds || this.doorOpensInSeconds;
        this.SensorState = { Error: false, Close: true, Open: false, Relay: false, Motor: false };
        this.initService();
    }


    initService() {
        this.operating = false;
        this.garageDoorOpener = new Service.GarageDoorOpener(this.name, this.name);

        this.currentDoorState = this.garageDoorOpener.getCharacteristic(DoorState);
        this.currentDoorState.getCharacteristic(Characteristic.CurrentDoorState)
            .on('get', this.getCurrentState.bind(this));

        this.targetDoorState = this.garageDoorOpener.getCharacteristic(Characteristic.TargetDoorState);
        this.targetDoorState
            .on('get', this.getTargetState.bind(this))
            .on('set', this.setTargetState.bind(this));

        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'ESPEasy Garage Door')
            .setCharacteristic(Characteristic.Model, 'ESPEasy Remote Control')
            .setCharacteristic(Characteristic.SerialNumber, '1068')

        this.readSensorState(() => {
            var tmpstate = this.getCharacteristicState();
            if (!this.SensorState.Error) {
                this.log("We have a door sensor, monitoring door state enabled.");
            }
            this.currentDoorState.updateValue(tmpstate)
            this.targetDoorState.updateValue(tmpstate)

        })

    }

    getCharacteristicState() {
        if (this.SensorState.Error) {
            return Characteristic.STOPPED;
        }
        return this.SensorState.Close ? Characteristic.CLOSED : (this.SensorsState.Open ? Characteristic.OPEN : Characteristic.STOPPED)
    }

    getCurrentState(callback) {
        var log = this.log;
        this.readSensorState(() => {
            if (!this.SensorState.Error) {
                var state = this.getCharacteristicState();
                this.log("GarageDoor is " + this.doorStateToString(state));
                callback(null, state);
            }

            else {
                log.debug('Error getting door state. (%s)', error);
                callback();
            }
        })
    }

    setFinalDoorState() {
        this.readSensorState(() => {

            if ((this.targetState == DoorState.CLOSED && !this.SensorState.Close) || (this.targetState == DoorState.OPEN && !this.SensorState.Open)) {
                this.log("Was trying to finish operation" + (this.targetState == DoorState.CLOSED ? "CLOSE" : "OPEN") + " the door, but it is still " + (ihis.SensorState.Close ? "CLOSED" : "OPEN"));
                //this.currentDoorState.updateValue(DoorState.STOPPED);
            } else {
                this.log("Set current state to " + (this.targetState == DoorState.CLOSED ? "CLOSED" : "OPEN"));
                this.wasClosed = this.targetState == DoorState.CLOSED;
                this.currentDoorState.updateValue(this.targetState);
            }
            this.operating = false;
        })
    }

    readSensorState(callback) {
        request.get({
            url: 'http://' + this.ip + '/json',
            timeout: 120000
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                var json = JSON.parse(body);

                json.Sensors.ForEach(item => {
                    this.SensorsState[item.TaskName] = (item.state == 1)
                })
                this.SensorState.Error = false;

                log.debug('State: ' + this.SensorsState);
                callback()
            }
            else {
                log.debug('Error getting door state. (%s)', error);
                this.SensorState.Error = false;
                callback();
            }
        })

    }

    getTargetState(callback) {
        callback(null, this.targetState);
    }

    setTargetState(state, callback) {
        this.log("Setting state to " + state);
        this.targetState = state;
        this.readSensorState(() => {

            if ((state == DoorState.OPEN && this.SensorState.Close) || (state == DoorState.CLOSED && !this.SensorState.Close)) {
                this.log("Triggering GarageDoor Relay");
                this.operating = true;
                if (state == DoorState.OPEN) {
                    this.currentDoorState.updateValue(DoorState.OPENING);
                } else {
                    this.currentDoorState.updateValue(DoorState.CLOSING);
                }
                setTimeout(this.setFinalDoorState.bind(this), this.doorOpensInSeconds * 1000);
                this.switchDoor(state == DoorState.OPEN ? 'Close' : 'Open');
            }

            callback();
            return true;
        })
    }

    switchDoor(cmd) {
        request.get({
            url: 'http://' + this.ip + '/control?cmd=event,' + (cmd || 'Signal'),
            timeout: 120000
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                if (body == 'OK')
                    return;

                log.debug('Response Error: %s', body);
                return;
            }

            log.debug('Error setting door state. (%s)', error);
        });


    }
    getServices() {
        return [this.informationService, this.garageDoorOpener];
    }

    // Tools procedures

    doorStateToString(state) {
        switch (state) {
            case DoorState.OPEN:
                return "OPEN";
            case DoorState.CLOSED:
                return "CLOSED";
            case DoorState.STOPPED:
                return "STOPPED";
            default:
                return "UNKNOWN";
        }
    }

}