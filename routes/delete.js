var express = require('express');
var router = express.Router();
var db   = require('../db');

/* Root GET handler */
router.get('/', function(req, res, next) {
  res.send('nothing to see here. Move along...');
});

router.post('/remove_parent', function(req, res, next) {
  var parentID = req.body.pID;
  var childID = req.body.cID;

  var sqlQuery = "DELETE FROM DAGR_PARENT\n"
               + "WHERE PARENT_GUID = :parent\n"
               + "AND CHILD_GUID = :child";

  db.doConnect().then(function(connection){
    db.doExecute(connection, sqlQuery, [parentID, childID]).then(function(result) {
      db.doCommit(connection).then(function(connection) {
          res.send('Success');
          db.doRelease(connection);
      });
    });
  });  

});

router.post('/remove_keyword', function(req, res, next) {
  var keyword = req.body.keyword;
  var GUID = req.body.id;

  var sqlQuery = "DELETE FROM DAGR_KEYWORD\n"
               + "WHERE DAGR_GUID = :guid\n"
               + "AND KEYWORD = :keyword";

  db.doConnect().then(function(connection){
    db.doExecute(connection, sqlQuery, [GUID, keyword]).then(function(result) {
      db.doCommit(connection).then(function(connection) {
          res.send('Success');
          db.doRelease(connection);
      });
    });
  });  

});

module.exports = router;