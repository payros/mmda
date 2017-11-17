var express = require('express');
var router = express.Router();
var Guid = require('guid');
var db   = require('../db');
var util = require('../util');

/* Root GET handler */
router.get('/', function(req, res, next) {
  res.send('nothing to see here. Move along...');
});

router.post('/add_media', function(req, res, next) {
  var dagrAuthor = req.body.user;
  var dagrID = req.body.dagrID || Guid.raw();
  var mediaList = req.body.media;
  var sqlQuery = "INSERT ALL\n";

  //Create DAGR
  if(!req.body.dagrID) {
    var dagrName = util.getName(mediaList[0]);

    //INSERT INTO DAGR TABLE
    sqlQuery += "INTO DAGR (GUID, NAME, AUTHOR) VALUES ('" + dagrID + "','" + dagrName + "','" + dagrAuthor + "')\n"; 
  }

  //Add Media
  mediaList.forEach(function(media, i){
  	switch(media.type) {
  		case 'link':
  			sqlQuery += util.generateLinkSQL(media, dagrID);
  			break;

  		case 'file':
  			sqlQuery += util.generateFileSQL(media, dagrID);
  			break;

  		case 'folder':
  			sqlQuery += util.generateFolderSQL(media, dagrID);
  			break;
  	}
  });

  //Finish the query with this - PL requires it
  sqlQuery += "SELECT * FROM dual"

  console.log("QUERY: ", sqlQuery);

  //Write to DB
  db.doConnect(function(err, connection){
    console.log("INFO: Database Connected");
    if (err) {
      res.send("ERROR: Unable to get a connection ");
    } else {
      db.doExecute(connection, sqlQuery, {}, function(err, result) {
          if (err) {
            res.send('Failed to Execute');
            db.doRelease(connection);
          } else {
            db.doCommit(connection, function(err, connection) {
                res.send(err ? 'Failed to Execute' : 'Success');
                db.doRelease(connection);
            });
          }
      });
    }
  });

});

module.exports = router;