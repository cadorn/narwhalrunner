
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var STRUCT = require("struct");
var MD5 = require("md5");
var PACKAGE = require("narwhal/tusk/package");


exports.Package = function (packagePath) {

    // PRIVATE
    
    // PUBLIC

    var Package = PACKAGE.Package(packagePath);
    
    Package.getTemplateVariables = function(app) {
        var name =  Package.getName();
        return {
            "PackageName": name,
            "PackagePrefix": "NRID_" + STRUCT.bin2hex(MD5.hash(app.getInternalName() + ":" + name)) + "_",
            "PackageChromeURLPrefix": "narwhalrunner://" +
                app.manifest.narwhalrunner.InternalName + "/" + name + "/",
            "PackageNarwhalizeURL": "chrome://" + app.manifest.narwhalrunner.InternalName +
                "-narwhalrunner/content/common/narwhalize.js"
        }
    }

    Package.replaceTemplateVariables = function(app, template) {
        var vars = Package.getTemplateVariables(app);
        UTIL.every(vars, function(item) {
            template = template.replace(new RegExp("%%" + item[0] + "%%", "g"), item[1]);
        });
        return template;      
    }
    
    return Package;
    
    
    // PRIVATE
    
}

