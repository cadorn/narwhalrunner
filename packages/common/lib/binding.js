
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");


exports.Binding = function (pkgId, object, name) {

    // PRIVATE

    var Binding = {};


    // PUBLIC
    
    Binding.getObject = function() {
        return object;
    }    

    Binding.ping = function() {
    }

    return Binding;
    
    // PRIVATE
    
}
