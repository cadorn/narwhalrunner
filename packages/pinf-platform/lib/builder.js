

function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var LOCATOR = require("package/locator", "http://registry.pinf.org/cadorn.org/github/pinf/packages/common/");
var BUILDER = require("builder", "http://registry.pinf.org/cadorn.org/github/pinf/packages/common/");
var JSON = require("json");


var Builder = exports.Builder = function(pkg, options) {
    if (!(this instanceof exports.Builder))
        return new exports.Builder(pkg, options);
    this.construct(pkg, options);
}

Builder.prototype = BUILDER.Builder();



Builder.prototype.build = function(pkg, options) {

    var descriptor = this.pkg.getDescriptor(),
        locator = this.getLocatorForSpec(descriptor.spec.using.devtools),
        devtoolsPackage = this.getPackageForLocator(locator),
        sourceBasePath = devtoolsPackage.getPath(),
        sourcePath,
        targetBasePath = options.path,
        targetPath,
        basename;

    // TODO: Take OS into account when copying OS specific files
/*    
    targetPath = targetBasePath.join("bin");
    sourcePath = sourceBasePath.join("bin");
    [
        "nr"
    ].forEach(function(basename) {
        targetPath.join(basename).dirname().mkdirs();
        sourcePath.join(basename).symlink(targetPath.join(basename));
        targetPath.join(basename).chmod(0755);
    });
*/
}
