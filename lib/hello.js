
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };


var packages = require("packages");



exports.main = function(args) {
    
    print("HELLO!!!");
    
    
    require.loader.paths.forEach(function(path) {
       
print("  path: "+path);

    });

    Object.keys(packages.catalog).forEach(function (name) {
    
print("  package: "+name);
    
    });

}

if (module.id == require.main)
    exports.main(system.args);
