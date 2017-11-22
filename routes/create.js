var express = require('express');
var router = express.Router();
var Guid = require('guid');
var db   = require('../db');
var util = require('../util');
var $q = require('q');

/* Root GET handler */
router.get('/', function(req, res, next) {
  res.send('nothing to see here. Move along...');
});

router.post('/add_media', function(req, res, next) {
  var dagrAuthor = req.body.user;
  var dagrID = req.body.dagrID || Guid.raw();
  var mediaList = req.body.media;
  var sqlQuery = "INSERT ALL\n";
  var promises = [];

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
        promises.push(util.generateLinkSQL(media, dagrID).then(function(sql){
          
          sqlQuery += sql;
        }));
  			break;

  		case 'file':
  			promises.push(util.generateFileSQL(media, dagrID).then(function(sql){
          console.log(sql);
          sqlQuery += sql;
        }));
  			break;

  		case 'folder':
        promises.push(util.generateFolderSQL(media, dagrID).then(function(sql){
          sqlQuery += sql;
        }));
  			break;
  	}
  });

  console.log('query received');

  //Wait until all files have been read to submit the query
  $q.all(promises).then(function(){

    //Make sure there is new media being referenced to be insterted on the query
    if(sqlQuery.indexOf('INTO DAGR_MEDIA') > -1) {
        //Finish the query with this - PL requires it
        sqlQuery += "SELECT * FROM dual"

        console.log("QUERY: ", sqlQuery);
        //Write to DB
        db.doConnect().then(function(connection){
          db.doExecute(connection, sqlQuery, {}).then(function(result) {
            db.doCommit(connection).then(function(connection) {
                res.send('Success');
                db.doRelease(connection);
            });
          });
        });  
    } else {
      res.send('Nothing to update');
      console.log("INFO: No new media references")
    }
  
  });


});

module.exports = router;