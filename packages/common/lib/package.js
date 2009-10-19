
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var STRUCT = require("struct");
var MD5 = require("md5");
var PACKAGE = require("narwhal/tusk/package");


exports.Package = function (packagePath) {

    // PRIVATE

    var Package;
    
    if(packagePath instanceof PACKAGE.Package) {
        Package = packagePath;
        packagePath = Package.getPath();
    } else {
        Package = PACKAGE.Package(packagePath);
    }
    
    var appInfo;
    
    // PUBLIC
    
    Package.setAppInfo = function(info) {
        appInfo = info;
        return Package;
    }
    
    Package.getAppInfo = function() {
        return appInfo;
    }
    
    /**
     * Used to prefix CSS and XUL/HTML ID's
     */
    Package.getReferenceId = function() {
        return STRUCT.bin2hex(MD5.hash(appInfo.InternalName + ":" + Package.getId()));
    }
    
    Package.getTemplateVariables = function() {
        var name =  Package.getName();
        var id = Package.getReferenceId();
        var vars = {
            "PP": "NRID_" + id + "_",
            "Package.Name": name,
            "Package.ReferenceId": id,

            "Package.OverlayBaseURL": "chrome://" + appInfo.InternalName + "-overlay/content/" + id + "/",
            "Package.ModulesBaseURL": "resource://" + appInfo.InternalName + "-modules/" + id + "/",
            "Package.LocaleBaseURL": "chrome://" + appInfo.InternalName + "/locale/" + id + "/",

            "Package.ContentBaseURL": "narwhalrunner://" + appInfo.InternalName + "/" + name + "/content/",

            "Program.NarwhalURL": "chrome://" + appInfo.InternalName + "-overlay/content/" + appInfo["CommonPackage.ReferenceId"] + "/narwhal.js",
            "Program.NarwhalizeURL": "chrome://" + appInfo.InternalName + "-overlay/content/" + appInfo["CommonPackage.ReferenceId"] + "/narwhalize.js",
            "Program.PackagesBaseURL": "resource://" + appInfo.InternalName + "-packages/",
            "Program.AppModuleURL": "resource://" + appInfo.InternalName + "-modules/" + appInfo["CommonPackage.ReferenceId"] + "/app.jsm"
        };

        vars["Package.RegisterBindingMacro"] = 
            "(function() {" +
            "    var narwhal = {};" +
            "    Components.utils.import('" + vars["Program.AppModuleURL"] + "', narwhal);" +
            "    return function(object, name) {" +
            "        return narwhal.require('app', '" + module["package"] + "').getApp().registerBinding('" + Package.getId() + "', object, name);" +
            "    };" +
            "}())";
        
        vars["Package.RegisterContainerMacro"] = 
            "(function() {" +
            "    var narwhal = {};" +
            "    Components.utils.import('" + vars["Program.AppModuleURL"] + "', narwhal);" +
            "    return function(object, module, name) {" +
            "        return narwhal.require('app', '" + module["package"] + "').getApp().registerContainer('" + Package.getId() + "', object, module, name);" +
            "    };" +
            "}())";
        
        UTIL.every(appInfo, function(item) {
            vars["Program." + item[0]] = item[1];
        });
        return vars;
    }

    Package.replaceTemplateVariables = function(template) {
        var vars = Package.getTemplateVariables();
        UTIL.every(vars, function(item) {
            template = template.replace(new RegExp("%%" + item[0] + "%%", "g"), item[1]);
            template = template.replace(new RegExp("__" + item[0] + "__", "g"), item[1]);
        });
        return template;      
    }

    Package.getChromeOverlayPath = function() {
        return Package.getPath().join("chrome", "overlay");
    }

    Package.getChromeContentPath = function() {
        return Package.getPath().join("chrome", "content");
    }

    Package.getChromeLocalePath = function() {
        return Package.getPath().join("chrome", "locale");
    }

    Package.getPreferencesPath = function() {
        return Package.getPath().join("defaults", "preferences");
    }

    Package.getModulesPath = function() {
        return Package.getPath().join("modules");
    }

    Package.getComponentsPath = function() {
        return Package.getPath().join("components");
    }
    
    Package.getChromeManifestPath = function() {
        return Package.getPath().join("chrome.manifest.tpl.txt");
    }
    
    Package.getInstallRdfPath = function() {
        return Package.getPath().join("install.rdf.tpl.xml");
    }
    
    Package.getLocales = function() {
        var localePath = Package.getChromeLocalePath();
        if(!localePath.exists()) {
            return false;
        }
        var locales = [];
        localePath.listPaths().forEach(function(dir) {
            locales.push([dir.basename().valueOf(), dir.valueOf()]);
        });
        return locales;
    }
    
    return Package;
    
    
    // PRIVATE
    
}

