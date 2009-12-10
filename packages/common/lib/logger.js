
var JSDUMP = require('test/jsdump').jsDump;
var UTIL = require("util");
var STREAM = require('term').stream;


var INCLUDE_NOTES = false;


exports.error = function(error) {
    
    STREAM.print("  \0red(*****************************************************************************\0)");
    STREAM.print("  \0red(*\0) Error: \0red(\0bold(" + ((typeof error.message !="undefined")?error.message:error) + "\0)\0)");
    STREAM.print("  \0red(*\0) File : \0cyan(\0bold(" + error.fileName + "\0)\0)");    
    STREAM.print("  \0red(*\0) Line : \0yellow(\0bold(" + error.lineNumber + "\0)\0)");
    if(error.stack) {
        STREAM.print("  \0red(*\0) Stack:");
        UTIL.forEach(error.stack.split("\n"), function(line) {
            STREAM.print("  \0red(*\0)        " + line);
        });
    }
    if(INCLUDE_NOTES && error.notes) {
        STREAM.print("  \0red(*\0) Notes:");
        
        // TODO: Use better dumper to catch circular references etc...
        var dump = JSDUMP.parse(error.notes);
        
        UTIL.forEach(dump.split("\n"), function(line) {
            STREAM.print("  \0red(*\0)        " + line);
        });
    }
    STREAM.print("  \0red(*****************************************************************************\0)");

}
