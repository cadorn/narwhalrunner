
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var FILE = require('file');
var UTIL = require("util");
var STREAM = require('term').stream;
var TEMPLATE = require("template", "template");


exports.process = function(callbacks, data) {
    callbacks.forEach(function(callback) {
        var args = UTIL.copy(callback[1]);
        args.unshift(data);
        args.unshift(callbacks);
        data = callback[0].apply(null, args);
    });
    return data;
}

exports.copyWhile = function(fromPath, toPath, callbacks) {
    print("Copying '" + fromPath + "' to '" + toPath + "':");
    toPath.dirname().mkdirs();

    switch(fromPath.basename().valueOf().split(".").pop()) {
        case "js":
        case "jsm":
        case "xul":
        case "xml":
        case "css":
        case "htm":
        case "html":
        case "rdf":
        case "dtd":
        case "ini":
        case "txt":
            var data = fromPath.read();
            callbacks.forEach(function(callback) {
                var args = UTIL.copy(callback[1]);
                args.unshift(data);
                args.unshift(callbacks);
                data = callback[0].apply(null, args);
            });
            toPath.write(data);
            break;
        default:
            print("Skip copyWhile callbacks as file is not ASCII");
            fromPath.copy(toPath);
            break;
    }
    print("  Done.");
}

exports.copyTreeWhile = function(source, target, callbacks, path) {
    var sourcePath = ((path)?source.join(path):source);
    var targetPath = ((path)?target.join(path):target);
    if(!sourcePath.exists()) {
        return;
    }
    if (sourcePath.isDirectory()) {
        targetPath.mkdirs();
        sourcePath.listPaths().forEach(function(entry) {
            exports.copyTreeWhile(source, target, callbacks, ((path)?path.join(entry.basename()):entry.basename()));
        });
    } else {
        exports.copyWhile(sourcePath, targetPath, callbacks);
    }
};

exports.runTemplate = function(callbacks, data, vars) {
    return new TEMPLATE.Template(data, {
        formatters: {
            "include": function(data) {
                callbacks.forEach(function(callback) {
                    
                    var args = UTIL.copy(callback[1]);
                    args.unshift(data);
                    args.unshift(callbacks);
                    data = callback[0].apply(null, args);
                });
                return data;
            }
        }
    }).render(vars);
}

exports.replaceVariables = function(callbacks, data, vars, token) {
    token = token || "%%";
    UTIL.keys(vars).forEach(function(name) {
        data = data.replace(new RegExp(token + exports.regExpEscape(name) + token, "g"), vars[name]);
    });
    var reg = new RegExp(token + "([^" + token.substr(0,1) + "]*)" + token, "g"),
        m;
    while((m = reg.exec(data)) != null) {
        if(m[1]!="proto") {
            STREAM.print("  " + token + "\0red(" + m[1] + "\0)" + token + "\0red( was not replaced!\0)");
        }
    }
    return data;
}

var escapeExpression = /[\[\]]/g;
var escapePatterns = {
    '[': '\\[',
    ']': '\\]'
};
exports.regExpEscape = function (value) {
    return value.replace(
        escapeExpression, 
        function (match) {
            if (escapePatterns[match])
                return escapePatterns[match];
            return match;
        }
    );
};
