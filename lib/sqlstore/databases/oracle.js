var {ColumnType} = require("../types");
var {Types} = java.sql;
var BaseDialect = require("../basedialect").BaseDialect;

/**
 * Database Dialect for Oracle databases
 * @constructor
 * @returns
 */
var Dialect = function() {
    this.registerColumnType("integer", new ColumnType(Types.INTEGER, "number(10,0)"));
    this.registerColumnType("long", new ColumnType(Types.BIGINT, "number(19,0)"));
    this.registerColumnType("short", new ColumnType(Types.SMALLINT, "number(5,0)"));
    this.registerColumnType("float", new ColumnType(Types.FLOAT, "float"));
    this.registerColumnType("double", new ColumnType(Types.DOUBLE, "double precision"));
    this.registerColumnType("character", new ColumnType(Types.CHAR, "char(1 char)"));
    this.registerColumnType("string", new ColumnType(Types.VARCHAR, "varchar2", {
        "length": 4000
    }));
    this.registerColumnType("byte", new ColumnType(Types.TINYINT, "number(3,0)"));
    this.registerColumnType("boolean", new ColumnType(Types.BIT, "number(1,0)"));
    this.registerColumnType("date", new ColumnType(Types.DATE, "date"));
    this.registerColumnType("time", new ColumnType(Types.TIME, "date"));
    this.registerColumnType("timestamp", new ColumnType(Types.TIMESTAMP, "timestamp"));
    this.registerColumnType("binary", new ColumnType(Types.BINARY, "blob"));
    this.registerColumnType("text", new ColumnType(Types.LONGVARCHAR, "clob"));

    return this;
};
// extend BaseDialect
Dialect.prototype = new BaseDialect();
Dialect.prototype.constructor = Dialect;

/** @ignore */
Dialect.prototype.toString = function() {
    return "[Dialect Oracle]";
};

/**
 * Returns true
 * @returns True
 * @type Boolean
 */
Dialect.prototype.hasSequenceSupport = function() {
    return true;
};

/**
 * Returns the SQL statement for retrieving the next value of a sequence
 * @param {String} sequenceName The name of the sequence
 * @returns The SQL statement
 * @type String
 */
Dialect.prototype.getSqlNextSequenceValue = function(sequenceName) {
    return "SELECT " + this.quote(sequenceName) + ".NEXTVAL FROM DUAL";
};

/**
 * Extends the SQL statement passed as argument with a limit restriction
 * @param {Array} sqlBuf The SQL statement
 * @param {Limit} limit The limit
 */
Dialect.prototype.addSqlLimit = function(sqlBuf, limit) {
    sqlBuf.unshift("SELECT * FROM ( ");
    sqlBuf.push(") WHERE ROWNUM <= ", limit.toString());
};

/**
 * Extends the SQL statement passed as argument with an offset restriction
 * @param {Array} sqlBuf The SQL statement
 * @param {Number} offset The offset
 */
Dialect.prototype.addSqlOffset = function(sqlBuf, offset) {
    sqlBuf.unshift("SELECT * FROM (SELECT r.*, ROWNUM rnum FROM (");
    sqlBuf.push(") r ) where rnum > ", offset.toString());
};

/**
 * Extends the SQL statement passed as argument with a range restriction
 * @param {Array} sqlBuf The SQL statement
 * @param {Number} offset The offset
 * @param {Limit} limit The limit
 */
Dialect.prototype.addSqlRange = function(sqlBuf, offset, limit) {
    sqlBuf.unshift("SELECT * FROM (SELECT r.*, ROWNUM rnum FROM (");
    sqlBuf.push(") r WHERE ROWNUM <= ", (offset + limit).toString());
    sqlBuf.push(") WHERE rnum > ", offset.toString());
};

/**
 * Returns the default schema for the connection passed as argument
 * @param {java.sql.Connection} conn The connection to use
 * @returns The name of the default schema
 * @type String
 */
Dialect.prototype.getDefaultSchema = function(conn) {
    var metaData = conn.getMetaData();
    var userName = metaData.getUserName();
    var schemas = null;
    try {
        schemas = metaData.getSchemas(null, userName);
        if (schemas.next()) {
            return schemas.getString(1);
        }
    } finally {
        if (schemas != null) {
            schemas.close();
        }
    }
    return null;
};

/**
 * Returns the boolean value for the value passed as argument
 * @param {Object} value The value
 * @returns The boolean value
 * @type Boolean
 */
Dialect.prototype.getBooleanValue = function(value) {
    if (!!value === true) {
        return 1;
    };
    return 0;
};

module.exports = new Dialect();
