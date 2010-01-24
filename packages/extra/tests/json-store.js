
function dump(obj) { print(require('test/jsdump').jsDump.parse(obj)) };

var ASSERT = require("assert");
var FILE = require("file");
var JSON = require("json");
var JSON_STORE = require("json-store");


exports.testSimpleLifecycle = function() {

    var file = FILE.Path(module.path).dirname().join(".tmp_json-store.json~");
    var store = new JSON_STORE.JsonStore(file);

    ASSERT.strictEqual(store.exists(), false);
    store.init();
    ASSERT.strictEqual(store.exists(), true);

    var data = {"key": "value"};
    store.set(data);
    ASSERT.deepEqual(JSON.decode(file.read()), data);
    ASSERT.deepEqual(store.get(), data);

    file.remove();
}

if (require.main == module.id)
    require("os").exit(require("test").run(exports));
