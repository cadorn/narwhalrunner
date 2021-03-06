
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var UTIL = require("util");
var STRUCT = require("struct");
var MD5 = require("md5");
var PACKAGE = require("package", "pinf-common");


exports.Package = function (packagePath, locator) {

    // PRIVATE

    var Package;
    
    if(packagePath instanceof PACKAGE.Package) {
        Package = packagePath;
        packagePath = Package.getPath();
    } else {
        Package = PACKAGE.Package(packagePath, locator);
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
    // TODO: Move to super and rename to getIdHash() based on this.id only
    Package.getReferenceId = function() {
//        return STRUCT.bin2hex(MD5.hash(appInfo.InternalName + ":" + Package.getTopLevelId()));
        return STRUCT.bin2hex(MD5.hash(appInfo.InternalName + ":" + Package.getUid()));
    }
    Package.getPackagePrefix = function() {
        return "NRID_" + Package.getReferenceId() + "_";
    }
    
    Package.getAccessibleContentBaseUrl = function() {
        return "narwhalrunner-accessible://" + appInfo.InternalName + "/" + Package.getReferenceId() + "/content-accessible/"
    }
    Package.getContentBaseUrl = function() {
        return "narwhalrunner://" + appInfo.InternalName + "/" + Package.getReferenceId() + "/content/";
    }
    
    Package.getRoutedBaseUrl = function() {
        return "narwhalrunner://" + appInfo.InternalName + "/" + Package.getReferenceId() + "/";
    }

    Package.getTransportedProgramLoadUrl = function() {
        return "narwhalrunner://" + appInfo.InternalName + "/" + appInfo["CommonPackage.ReferenceId"] + "/transport-program/" + Package.getReferenceId() + "/";
    }

    Package.getPublicTransportedProgramLoadUrl = function() {
        return "narwhalrunner-accessible://" + appInfo.InternalName + "/" + appInfo["CommonPackage.ReferenceId"] + "/transport-program/" + Package.getReferenceId() + "/";
    }
    
    Package.getPublicChromeProgramBaseUrl = function() {
        return "narwhalrunner-accessible://" + appInfo.InternalName + "/" + appInfo["CommonPackage.ReferenceId"] + "/chrome-program/" + Package.getReferenceId() + "/";
    }

    Package.getSkinBaseUrl = function() {
        return "chrome://" + appInfo.InternalName + "/skin/" + Package.getReferenceId() + "/";
    }

    Package.getTemplateVariables = function(commonPackage) {
        var name =  Package.getName();
        var id = Package.getReferenceId();
        var vars = {
            "PP": Package.getPackagePrefix(),
            "Package.Name": name,
            "Package.ReferenceId": id,

            "Package.OverlayBaseURL": "chrome://" + appInfo.InternalName + "-overlay/content/" + id + "/",
            "Package.ChromeResourcesBaseURL": "resource://" + appInfo.InternalName + "-resources/" + id + "/",
            "Package.ModulesBaseURL": "resource://" + appInfo.InternalName + "-modules/" + id + "/",
            "Package.LocaleBaseURL": "chrome://" + appInfo.InternalName + "/locale/" + id + "/",
            "Package.SkinBaseURL": Package.getSkinBaseUrl(),

            "Package.ContentBaseURL": Package.getContentBaseUrl(),
            "Package.AccessibleContentBaseURL": Package.getAccessibleContentBaseUrl(),
            
            "Package.ResourcesBaseURL": "narwhalrunner://" + appInfo.InternalName + "/" + id + "/resources/",

            "Package.RoutedBaseURL": Package.getRoutedBaseUrl(),
            "Package.TransportedProgramLoadURL": Package.getTransportedProgramLoadUrl(),
            "Package.PublicTransportedProgramLoadURL": Package.getPublicTransportedProgramLoadUrl(),
            
            "Package.PublicChromeProgramBaseURL": Package.getPublicChromeProgramBaseUrl(),

            "Program.NarwhalURL": "chrome://" + appInfo.InternalName + "-overlay/content/" + appInfo["CommonPackage.ReferenceId"] + "/narwhal.js",
            "Program.NarwhalizeURL": "chrome://" + appInfo.InternalName + "-overlay/content/" + appInfo["CommonPackage.ReferenceId"] + "/narwhalize.js",
            "Program.PackagesBaseURL": "resource://" + appInfo.InternalName + "-packages/",
            "Program.AppModuleURL": "resource://" + appInfo.InternalName + "-modules/" + appInfo["CommonPackage.ReferenceId"] + "/app.jsm"
        };

        if(commonPackage) {
        vars["Package.RegisterBindingMacro"] = 
            "(function() {" +
            "    var sandbox = {};" +
            "    Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);" +
            "    var program = sandbox.get({'type': '" + appInfo["Type"]  + "', 'id': '" + appInfo["ID"]  + "'});" +
            "    return function(object, name, id) {" +
            "        return program.require('app', '" + commonPackage.getTopLevelId() + "').getChrome().registerBinding('" + Package.getTopLevelId() + "', object, name, id);" +
            "    };" +
            "}())";
        
        vars["Package.RegisterContainerMacro"] = 
            "(function() {" +
            "    var sandbox = {};" +
            "    Components.utils.import('resource://narwhal-xulrunner/sandbox.js', sandbox);" +
            "    var program = sandbox.get({'type': '" + appInfo["Type"]  + "', 'id': '" + appInfo["ID"]  + "'});" +
            "    return function(object, module, name) {" +
            "        return program.require('app', '" + commonPackage.getTopLevelId() + "').getChrome().registerContainer('" + Package.getTopLevelId() + "', object, module, name);" +
            "    };" +
            "}())";
        }
        
        UTIL.every(appInfo, function(item) {
            vars["Program." + item[0]] = item[1];
        });
        
        // Some defaults
        if(!UTIL.has(vars, "Program.SeaPath")) {
            vars["Program.SeaPath"] = "";
        }
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

    Package.getChromeSkinPath = function() {
        return Package.getPath().join("chrome", "skin");
    }

    Package.getPreferencesPath = function() {
        return Package.getPath().join("defaults", "preferences");
    }

    Package.getModulesPath = function() {
        return Package.getPath().join("modules");
    }

    Package.getChromeResourcesPath = function() {
        return Package.getPath().join("chrome", "resources");
    }

    Package.getComponentsPath = function() {
        return Package.getPath().join("components");
    }
    
    Package.getChromeManifestPath = function() {
        return Package.getPath().join("chrome.manifest.tpl.txt");
    }
    
    Package.getChromeJarredManifestPath = function() {
        var path = Package.getPath().join("chrome.jarred.manifest.tpl.txt");
        // fall back to flat chrome manifest file if we do not have a jarred one
        if(!path.exists()) return Package.getChromeManifestPath();
        return path;
    }
    
    Package.getInstallRdfPath = function() {
        return Package.getPath().join("install.rdf.tpl.xml");
    }

    Package.getApplicationIniPath = function() {
        return Package.getPath().join("application.ini.tpl.txt");
    }
    
    Package.getUpdateRdfPath = function() {
        return Package.getPath().join("update.rdf.tpl.xml");
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



exports.resolvePackageInfoVariables = function(packageDatum, pinfVars) {
    pinfVars = pinfVars || {};
    
    UTIL.every(packageDatum.pinf, function(item1) {
        if(item1[0]=="narwhalrunner") {
            UTIL.every(packageDatum.pinf[item1[0]], function(item2) {
                packageDatum.pinf[item1[0]][item2[0]] = pinfVars["PINF.narwhalrunner."+item2[0]] = replaceVariables(item2[1], pinfVars);
            });           
        } else {
            packageDatum.pinf[item1[0]] = pinfVars["PINF."+item1[0]] = replaceVariables(item1[1], pinfVars);
        }
    });
    UTIL.every(packageDatum.narwhalrunner, function(item1) {
        packageDatum.narwhalrunner[item1[0]] = replaceVariables(item1[1], pinfVars);
    });
}

function replaceVariables(data, vars) {
    UTIL.keys(vars).forEach(function(name) {
        data = data.replace(new RegExp("{" + name + "}", "g"), vars[name]);
    });
    return data;
}
