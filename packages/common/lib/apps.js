
var APP,
    onReadyCallbacks = [],
    onEventCallbacks = {};

exports.triggerAllReady = function(app) {
    APP = app;
    APP.getProgram().onGlobalEvent(function(globalEvent) {
        if(onEventCallbacks[globalEvent.name]) {
            onEventCallbacks[globalEvent.name].forEach(function(callback) {
                try {
                    callback(globalEvent.app, globalEvent.event);
                } catch(e) {
                    system.log.error(e);
                }
            });
        }
    });
    onReadyCallbacks.forEach(function(callback) {
        try {
            callback();
        } catch(e) {
            system.log.error(e);
        }
    });
    onReadyCallbacks = [];
}

exports.onReady = function(callback) {
    onReadyCallbacks.push(callback);
}

exports.onEvent = function(name, callback) {
    if(!onEventCallbacks[name]) {
        onEventCallbacks[name] = [];
    }
    onEventCallbacks[name].push(callback);
}

exports.dispatchEvent = function(name, event) {
    APP.getProgram().dispatchGlobalEvent({
        "app": APP,
        "name": name,
        "event": event
    });
}


