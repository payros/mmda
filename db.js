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


//TO DO Catch all the errors outside of the success functions

module.exports = function(pool) {

    //////////////////////
    // GET A CONNECTION //
    //////////////////////
    var doConnect = function() {

      console.log("INFO: Module getConnection() called - attempting to retrieve a connection using the node-oracledb driver");

      return pool.getConnection().then(function(connection) {

        // UNABLE TO GET CONNECTION - CALLBACK WITH ERROR
        // if (err) { 
        //   console.log("ERROR: Cannot get a connection: ", err);
        //   return callback(err);
        // }

        // If pool is defined - show connectionsOpen and connectionsInUse
        if (typeof pool !== "undefined") {
          console.log("INFO: Connections open: " + pool.connectionsOpen);
          console.log("INFO: Connections in use: " + pool.connectionsInUse);
        }

        // Else everything looks good
        // Obtain the Oracle Session ID, then return the connection
        return doExecute(connection, "SELECT SYS_CONTEXT('userenv', 'sid') AS session_id FROM DUAL", {}).then(function(result) {

          // Log the connection ID (we do this to ensure the conncetions are being pooled correctly)
          console.log("INFO: Connection retrieved from the database, SESSION ID: ", result.rows[0]['SESSION_ID']);

          // Return the connection for use in model
          return connection;
        }).catch(function(err){
          // Something went wrong, releae the connection and return the error
          console.log("ERROR: Unable to determine Oracle SESSION ID for this transaction: ", err);
          releaseConnection(connection);
          return err;
        });

      });

    };

    /////////////
    // EXECUTE //
    /////////////
    var doExecute = function(connection, sql, params) {

      return connection.execute(sql, params, { autoCommit: false, outFormat: oracledb.OBJECT, maxRows:1000 }).then(function(result) {

        // Something went wrong - handle the data and release the connection
        // if (err) {
        //   console.log("ERROR: Unable to execute the SQL: ", err);
        //   //releaseConnection(connection);
        //   return callback(err);
        // }

        // Return the result to the request initiator
        // console.log("INFO: Result from Database: ", result)
        return result;

      });

    };  

    ////////////
    // COMMIT //
    ////////////
    var doCommit = function(connection) {
      return connection.commit().then(function() {
        // if (err) {
        //   console.log("ERROR: Unable to COMMIT transaction: ", err);
        // }
        return connection;
      });
    }

    //////////////
    // ROLLBACK //
    //////////////
    var doRollback = function(connection) {
      return connection.rollback().then(function() {
        // if (err) {
        //   console.log("ERROR: Unable to ROLLBACK transaction: ", err);
        // }
        return connection;
      });
    }

    //////////////////////////
    // RELEASE A CONNECTION //
    //////////////////////////
    var doRelease = function(connection) {
      return connection.release();
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