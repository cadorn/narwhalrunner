
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var UTIL = require("util");


var timers = {};


exports.resetTimers = function() {
    timers = {};
}

exports.startTimer = function(group, name) {
    if(!timers[group]) timers[group] = {};
    if(!timers[group][name]) timers[group][name] = [];
    timers[group][name].push([new Date().getTime(),0]);
}

exports.stopTimer = function(group, name) {
    if(!timers[group]) return;
    if(!timers[group][name]) return;
    timers[group][name][timers[group][name].length-1][1] = new Date().getTime();
}

exports.dumpTimers = function() {
    print("=== TIMERS ===");
    UTIL.forEach(timers, function(groups) {
        print("  " + groups[0]);
        UTIL.forEach(groups[1], function(timers) {
            var totals = {
                "min": 1000000,
                "max": 0,
                "mean": 0,
                "count": 0,
                "total": 0
            };
            UTIL.forEach(timers[1], function(timer) {
                if(timer[1]===0) return;
                var duration = timer[1]-timer[0];
                if(duration<totals.min) totals.min = duration;
                if(duration>totals.max) totals.max = duration;
                totals.count++;
                totals.total += duration;
            });
            totals.mean = totals.total/totals.count;
            print("    " + timers[0] + ": " + (totals.total/1000) + " (count: "+totals.count+", mean: "+(totals.mean/1000)+", min: "+(totals.min/1000)+", max: "+(totals.max/1000)+")");
        });
    });
    exports.resetTimers();
}
