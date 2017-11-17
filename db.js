var oracledb = require("oracledb");

//TO DO DON'T COMMIT UNTIL YOU REMOVE USER CREDENTIALS INTO ENV FILE
oracledb.createPool({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTSTRING
      // Default values shown below
      // externalAuth: false, // whether connections should be established using External Authentication
      // poolMax: 4, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      // poolMin: 0, // start with no connections; let the pool shrink completely
      // poolIncrement: 1, // only grow the pool by one connection at a time
      // poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      // poolPingInterval: 60, // check aliveness of connection if in the pool for 60 seconds
      // queueRequests: true, // let Node.js queue new getConnection() requests if all pool connections are in use
      // queueTimeout: 60000, // terminate getConnection() calls in the queue longer than 60000 milliseconds
      // poolAlias: 'myalias' // could set an alias to allow access to the pool via a name
      // stmtCacheSize: 30 // number of statements that are cached in the statement cache of each connection
    }, function(err, pool) {

    if (err) {
      console.log("ERROR: ", new Date(), ": createPool() callback: " + err.message);
      return;
    }

    require('./db')(pool);

});


module.exports = function(pool) {

    //////////////////////
    // GET A CONNECTION //
    //////////////////////
    var doConnect = function(callback) {

      console.log("INFO: Module getConnection() called - attempting to retrieve a connection using the node-oracledb driver");

      pool.getConnection(function(err, connection) {

        // UNABLE TO GET CONNECTION - CALLBACK WITH ERROR
        if (err) { 
          console.log("ERROR: Cannot get a connection: ", err);
          return callback(err);
        }

        // If pool is defined - show connectionsOpen and connectionsInUse
        if (typeof pool !== "undefined") {
          console.log("INFO: Connections open: " + pool.connectionsOpen);
          console.log("INFO: Connections in use: " + pool.connectionsInUse);
        }

        // Else everything looks good
        // Obtain the Oracle Session ID, then return the connection
        doExecute(connection, "SELECT SYS_CONTEXT('userenv', 'sid') AS session_id FROM DUAL", {}, function(err, result) {

          // Something went wrong, releae the connection and return the error
          if (err) {
            console.log("ERROR: Unable to determine Oracle SESSION ID for this transaction: ", err);
            releaseConnection(connection);
            return callback(err);
          }

          // Log the connection ID (we do this to ensure the conncetions are being pooled correctly)
          console.log("INFO: Connection retrieved from the database, SESSION ID: ", result.rows[0]['SESSION_ID']);

          // Return the connection for use in model
          return callback(err, connection);

        });

      });

    }

    /////////////
    // EXECUTE //
    /////////////
    var doExecute = function(connection, sql, params, callback) {

      connection.execute(sql, params, { autoCommit: false, outFormat: oracledb.OBJECT, maxRows:1000 }, function(err, result) {

        // Something went wrong - handle the data and release the connection
        if (err) {
          console.log("ERROR: Unable to execute the SQL: ", err);
          //releaseConnection(connection);
          return callback(err);
        }

        console.log(callback);
        // Return the result to the request initiator
        // console.log("INFO: Result from Database: ", result)
        return callback(err, result);

      });

    }  

    ////////////
    // COMMIT //
    ////////////
    var doCommit = function(connection, callback) {
      connection.commit(function(err) {
        if (err) {
          console.log("ERROR: Unable to COMMIT transaction: ", err);
        }
        return callback(err, connection);
      });
    }

    //////////////
    // ROLLBACK //
    //////////////
    var doRollback = function(connection, callback) {
      connection.rollback(function(err) {
        if (err) {
          console.log("ERROR: Unable to ROLLBACK transaction: ", err);
        }
        return callback(err, connection);
      });
    }

    //////////////////////////
    // RELEASE A CONNECTION //
    //////////////////////////
    var doRelease = function(connection) {

      connection.release(function(err) {
        if (err) {
          console.log("ERROR: Unable to RELEASE the connection: ", err);
        }
        return;
      });

    }


    //////////////////////////////
    // EXPORT THE FUNCTIONALITY //
    //////////////////////////////
    module.exports.doConnect  = doConnect;
    module.exports.doExecute  = doExecute;
    module.exports.doCommit   = doCommit;
    module.exports.doRollback = doRollback;
    module.exports.doRelease  = doRelease;

};