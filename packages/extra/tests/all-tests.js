
exports.testJsonStore = require("./json-store");

if (require.main == module) {
    require("os").exit(require("test").run(exports));
}