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
  //TO DO Sanatize  data before trying to insert it

  //Create DAGR
  if(!req.body.dagrID) {
    var dagrName = req.body.dagrTitle || util.getName(mediaList[0]); 
    var catCol = req.body.dagrCategory ? ",CATEGORY" : "";
    var catVal = req.body.dagrCategory ? ",'" + req.body.dagrCategory + "'" : ""; 

    //INSERT INTO DAGR TABLE
    sqlQuery += "INTO DAGR (GUID, NAME, AUTHOR" + catCol + ") VALUES ('" + dagrID + "','" + dagrName + "','" + dagrAuthor + "'" +  catVal + ")\n";
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

      case 'dagr':
        promises.push(util.generateDagrSQL(media, dagrID).then(function(sql){
          console.log('query received');
          sqlQuery += sql;
        }));
        break;      
  	}
  });

  

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

            //If this is not a new dagr, update the timestamp
            if(req.body.dagrID) {
              var now = Math.floor(new Date().getTime()/1000);
              var timestamp = "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + now + ",'SECOND'))";
              var updateQuery = "UPDATE DAGR SET MODIFY_DATE = " + timestamp + "WHERE GUID = :guid";

              db.doExecute(connection, updateQuery, [dagrID]).then(function(result) {
                db.doCommit(connection).then(function(connection) {
                  res.send(dagrID);
                  db.doRelease(connection);
                });
              });
            } else {
                db.doCommit(connection).then(function(connection) {
                  res.send(dagrID);
                  db.doRelease(connection);
                });
            }
          });
        });  
    } else {
      res.send('Nothing to update');
      console.log("INFO: No new media references")
    }
  
  });
});


router.post('/add_parent', function(req, res, next) {
  var parentID = req.body.pID;
  var childID = req.body.cID;

  var sqlQuery = "INSERT INTO DAGR_PARENT (PARENT_GUID, CHILD_GUID) VALUES (:parent, :child)";
  console.log(parentID, childID);
  db.doConnect().then(function(connection){
    db.doExecute(connection, sqlQuery, [parentID, childID]).then(function(result) {
      db.doCommit(connection).then(function(connection) {
          res.send('Success');
          db.doRelease(connection);
      });
    });
  });  
});

router.post('/add_keyword', function(req, res, next) {
  var GUID = req.body.id;
  var keyword = req.body.keyword;

  var sqlQuery = "INSERT INTO DAGR_KEYWORD (DAGR_GUID, KEYWORD) VALUES (:guid, :keyword)";
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