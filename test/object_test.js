var runner = require("./runner");
var assert = require("assert");
var system = require("system");

var {Store} = require("../lib/sqlstore/store");
var {ConnectionPool} = require("../lib/sqlstore/connectionpool");
var {Cache} = require("../lib/sqlstore/cache");
var sqlUtils = require("../lib/sqlstore/util");
var store = null;
var Author = null;
var Book = null;
var Editor = null;

const MAPPING_AUTHOR = {
    "properties": {
        "name": "string",
        "latestBook": {
            "type": "object",
            "entity": "Book"
        },
        "books": {
            "type": "collection",
            "query": "from Book where Book.author = :id"
        }
    }
};

const MAPPING_BOOK = {
    "properties": {
        "title": "string",
        "author": {
            "type": "object",
            "entity": "Author"
        }
    }
};

const MAPPING_EDITOR = {
    "properties": {
        "name": "string"
    }
};

exports.setUp = function() {
    store = new Store(new ConnectionPool(runner.getDbProps()));
    store.setEntityCache(new Cache());
    Author = store.defineEntity("Author", MAPPING_AUTHOR);
    Book = store.defineEntity("Book", MAPPING_BOOK);
    Editor = store.defineEntity("Editor", MAPPING_EDITOR);
};

exports.tearDown = function() {
    var conn = store.getConnection();
    [Author, Book, Editor].forEach(function(ctor) {
        var schemaName = ctor.mapping.schemaName || store.dialect.getDefaultSchema(conn);
        if (sqlUtils.tableExists(conn, ctor.mapping.tableName, schemaName)) {
            sqlUtils.dropTable(conn, store.dialect, ctor.mapping.tableName, schemaName);
        }
    });
    store.close();
};

exports.testAssignObject = function() {
    var author = new Author({
        "name": "John Doe"
    });
    var book = new Book({
        "title": "Book 1",
        "author": author
    });
    book.save();
    // author is persisted together with book instance
    assert.strictEqual(author._id, 1);
    assert.strictEqual(book.author._id, author._id);
    // create different book author and assign it as the book's author
    var authorTwo = new Author({
        "name": "Mr. Foo-Bar"
    });
    book.author = authorTwo;
    book.save();
    // authorTwo is persisted when changes of book are
    assert.strictEqual(Author.all().length, 2);
    assert.strictEqual(book.author._id, authorTwo._id);
    assert.strictEqual(Book.get(book._id).author._id, authorTwo._id);
    // null out the book's author
    book.author = undefined;
    book.save();
    assert.strictEqual(Book.get(1).author, null);
    // authorTwo is still there
    assert.strictEqual(Author.all().length, 2);
    return;
};

exports.testAssignWrongObject = function() {
    // non-entity
    var book = new Book({
        "title": "Book 1",
        "author": {}
    });
    assert.throws(function() {
        book.save();
    });
    // different entity type
    var editor = new Editor({
        "name": "Jane Doe"
    });
    book.author = editor;
    assert.throws(function() {
        book.save();
    });
    return;
};

exports.testAssignLazyLoaded = function() {
    (new Author({
        "name": "John Doe"
    })).save();
    // re-get author from db, but don't access any properties of
    var author = Author.get(1);
    var book = new Book({
        "title": "foo",
        "author": author
    });
    book.save();
    // after persisting the book, the author's book collection
    // must be populated
    assert.strictEqual(author.books.length, 1);
    return;
};

exports.testSimpleCircularReference = function() {
    var author = new Author({
        "name": "John Doe"
    });
    var book = new Book({
        "title": "foo",
        "author": author
    });
    author.latestBook = book;
    author.save();
    assert.strictEqual(author._id, 1);
    assert.strictEqual(book._id, 1);
    assert.strictEqual(author.latestBook._id, book._id);
    assert.strictEqual(author.latestBook.author._id, author._id);
    assert.strictEqual(book.author._id, author._id);
    assert.strictEqual(author.books.length, 1);
    author = Author.get(1);
    assert.strictEqual(author._id, 1);
    assert.strictEqual(book._id, 1);
    assert.strictEqual(author.latestBook._id, book._id);
    assert.strictEqual(author.latestBook.author._id, author._id);
    assert.strictEqual(book.author._id, author._id);
};

//start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(runner.run(exports, arguments));
}
