var express = require('express');
var router = express.Router();
var db   = require('../db');
var $q = require('q');

/* Root GET handler */
router.get('/', function(req, res, next) {
  res.send('nothing to see here. Move along...');
});

router.post('/dagr', function(req, res, next) {
  db.doConnect().then(function(connection){
    var now = Math.floor(new Date().getTime()/1000);
    var timestamp = "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + now + ",'SECOND'))";
    var sqlQuery = "UPDATE DAGR\n" +
                   "SET MODIFY_DATE = " + timestamp;

    var params = [];

    if(req.body.name) {
      firstSet = true;
      sqlQuery += ",NAME = :name "
      params.push(req.body.name);
    }

    if(req.body.category) {
      sqlQuery += ",CATEGORY = :category "
      params.push(req.body.category);
    }

    sqlQuery += "\nWHERE GUID = :guid";
    params.push(req.body.id);

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, params).then(function(result) {
      db.doCommit(connection).then(function(connection) {
          res.send('Success');
          db.doRelease(connection);
      });
    });
  });

});

module.exports = router;