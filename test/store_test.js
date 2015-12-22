var runner = require("./runner");
var assert = require("assert");
var system = require("system");

var {Store, Cache} = require("../lib/main");
var Key = require("../lib/key");
var dbSchema = require("../lib/database/schema");
var utils = require("./utils");
var strings = require("ringo/utils/strings.js");

var store = null;
var Author = null;

const MAPPING_AUTHOR = {
    // "schema": "TEST",
    "table": "author",
    "id": {
        "column": "author_id",
        "sequence": "author_id"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "author_name"
        }
    }
};

exports.setUp = function() {
    store = new Store(Store.initConnectionPool(runner.getDbProps()));
    Author = store.defineEntity("Author", MAPPING_AUTHOR);
    store.syncTables();
    assert.isTrue(Author instanceof Function);
    // static constructor functions
    assert.strictEqual(typeof(Author.get), "function");
    assert.strictEqual(typeof(Author.all), "function");
    assert.strictEqual(Author, store.entityRegistry.getConstructor("Author"));
};

exports.tearDown = function() {
    utils.drop(store, Author);
    store.close();
};

exports.testKey = function() {
    var key = new Key("Author", 1);
    assert.strictEqual(key.type, "Author");
    assert.strictEqual(key.id, 1);
    // trying to overwrite id must throw an error
    assert.throws(function() {
        key.id = 2;
    });
};

exports.testCRUD = function() {
    // create
    var name = "John Doe";
    var author = new Author({
        "name": name,
        "state": "famous"
    });
    assert.isTrue(author._key instanceof Key);
    assert.strictEqual(author._key.type, "Author");
    assert.isNull(author._key.id);
    assert.isNull(author.id);
    author.save();
    assert.strictEqual(author._key.id, 1);
    assert.strictEqual(author.id, 1);

    // read
    author = Author.get(1);
    assert.isNotNull(author);
    assert.strictEqual(author.id, 1);
    assert.strictEqual(author.name, name);

    // update
    author.name = name = "Mr. Foo-Bar";
    author.save();
    assert.strictEqual(author._entity.author_name, name);
    assert.strictEqual(author._entity.author_id, author._key.id);

    // read again
    author = Author.get(1);
    assert.strictEqual(author.name, name);
    assert.strictEqual(author._entity.author_id, author._key.id);

    // remove
    author.remove();
    assert.strictEqual(Author.get(1), null);
    assert.strictEqual(Author.all().length, 0);
};

exports.testTypes = function() {
    var mapping = {
        "table": "typetest",
        "properties": {
            "typeInteger": {
                "type": "integer"
            },
            "typeLong": {
                "type": "long"
            },
            "typeShort": {
                "type": "short"
            },
            "typeFloat": {
                "type": "float"
            },
            "typeDouble": {
                "type": "double"
            },
            "typeCharacter": {
                "type": "character"
            },
            "typeString": {
                "type": "string"
            },
            "typeByte": {
                "type": "byte"
            },
            "typeBoolean": {
                "type": "boolean"
            },
            "typeDate": {
                "type": "date"
            },
            "typeTime": {
                "type": "time"
            },
            "typeTimestamp": {
                "type": "timestamp"
            },
            "typeBinary": {
                "type": "binary"
            },
            "typeText": {
                "type": "text"
            }
        }
    };
    var props = {
        "typeInteger": 12345678,
        "typeLong": 12345678910,
        "typeShort": 12345,
        "typeFloat": (new java.lang.Float(10.99)).floatValue(),
        "typeDouble": 2199.99,
        "typeCharacter": "T",
        "typeString": "Test",
        "typeByte": 5,
        "typeBoolean": true,
        "typeDate": new Date(2010, 7, 11),
        "typeTime": new Date(0, 0, 0, 17, 36, 04, 723),
        "typeTimestamp": new Date(2010, 7, 11, 36, 04, 723),
        "typeBinary": java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 100000),
        "typeText": strings.repeat("abcdefghij", 10000)
    };
    var Type = store.defineEntity("TypeTest", mapping);
    store.syncTables();
    var type = new Type(props);
    type.save();

    // read again
    type = Type.get(1);
    for each (let [key, expected] in Iterator(props)) {
        let value = type[key];
        switch (key) {
            case "typeDate":
                assert.strictEqual(value.getFullYear(), expected.getFullYear());
                assert.strictEqual(value.getMonth(), expected.getMonth());
                assert.strictEqual(value.getDate(), expected.getDate());
                break;
            case "typeTime":
                assert.strictEqual(value.getHours(), expected.getHours());
                assert.strictEqual(value.getMinutes(), expected.getMinutes());
                assert.strictEqual(value.getSeconds(), expected.getSeconds());
                break;
            case "typeTimestamp":
                assert.strictEqual(value.getFullYear(), expected.getFullYear());
                assert.strictEqual(value.getMonth(), expected.getMonth());
                assert.strictEqual(value.getDate(), expected.getDate());
                break;
            case "typeBinary":
                assert.isTrue(java.util.Arrays.equals(value, expected));
                break;
            default:
                assert.strictEqual(value, expected);
        }
    }

    utils.drop(store, Type);
};

exports.testNullProps = function() {
    var author = new Author();
    assert.isNull(author.name);
    author.save();
    author = Author.get(1);
    assert.isNull(author.name);
};

//start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(runner.run(exports, arguments));
}
