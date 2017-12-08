var express = require('express');
var router = express.Router();
var db   = require('../db');
var util = require('../util');
var $q = require('q');

/* Root GET handler */
router.get('/', function(req, res, next) {
  db.doConnect().then(function(connection){
    var resp = {};
    var promises = [];    
    var term = req.query.q || '';
    var queryTerm = '%' + term.toLowerCase() + '%' ;
    var queryParams = { 'q':queryTerm,'author':req.query.user };
    var dagrQuery = util.generateDagrSearchSQL(req.query);
    var mediaQuery = util.generateMediaSearchSQL(req.query);

    console.log('QUERY: ', mediaQuery);
    console.log('PARAMS: ', queryParams);
    promises.push(db.doExecute(connection, dagrQuery, queryParams).then(function(dagrs) {
      // console.log('QUERY RESULTS: ', dagrs.rows);
      return dagrs.rows;
    }).catch(function(err){
      console.log('QUERY ERROR: ', err);
    }));

    promises.push(db.doExecute(connection, mediaQuery, queryParams).then(function(results) {
      return results.rows;
    }).catch(function(err){
      console.log('QUERY ERROR: ', err);
    }));

    //After both media and dagr queries are done, start keyword queries
    $q.all(promises).then(function(results){
      var kPromises = [];

      var dkQuery =  "SELECT keyword\n"  + 
      "FROM DAGR_KEYWORD\n"  + 
      "WHERE DAGR_GUID = :guid";

      var mkQuery =  "SELECT keyword\n"  + 
      "FROM MEDIA_KEYWORD\n"  + 
      "WHERE MEDIA_GUID = :guid";
     
      resp.dagrs = results[0];
      resp.media = results[1];


      //Get the keywords for each dagr
       resp.dagrs.forEach(function(dagr){
        kPromises.push(db.doExecute(connection, dkQuery, [dagr.GUID]).then(function(r) {
          dagr.KEYWORDS = r.rows.map(r => r.KEYWORD);
        }));
      });

      //Get the keywords for each media
      resp.media.forEach(function(media){
        kPromises.push(db.doExecute(connection, mkQuery, [media.GUID]).then(function(r) {
          media.KEYWORDS = r.rows.map(r => r.KEYWORD);
        }));
      });

      $q.all(kPromises).then(function(){
        db.doRelease(connection);
        res.send(resp);
      }).catch(function(){
        res.send(err);
      });

    }).catch(function(err){
      db.doRelease(connection);
      console.log('QUERY ERROR: ', err);
      res.send('QUERY ERROR:' + err);
    });

  }).catch(function(err){
    res.send(err);
  });
});

router.get('/reach', function(req, res, next) {
  db.doConnect().then(function(connection){
    var resp = {};
    var promises = [];
    var up = parseInt(req.query.up) || 1;
    var down = parseInt(req.query.down) || 1; 

    promises.push(util.getRelatives(true, connection, down, [[{id:req.query.id}]]).then(function(desc){
      return desc;
    }));

    promises.push(util.getRelatives(false, connection, up, [[{id:req.query.id}]]).then(function(ances){
      return ances;
    }));

    //After both parents and children queries are done, return
    $q.all(promises).then(function(results){
      res.send({'children': results[0], 'parents': results[1]});
      db.doRelease(connection);
    }).catch(function(err){
      db.doRelease(connection);
      console.log('QUERY ERROR: ', err);
      res.send('QUERY ERROR:' + err);
    });

  }).catch(function(err){
    res.send(err);
  });
});

router.get('/all_dagrs', function(req, res, next) {
  db.doConnect().then(function(connection){
    var resp = [];
    var dagrQuery = "WITH files\n" +
                  "AS (SELECT DAGR_GUID, COUNT(MEDIA_GUID) AS MEDIA\n" +
                  "FROM DAGR_MEDIA\n" +
                  "GROUP BY DAGR_GUID),\n" +
                  "children\n" +
                  "AS (SELECT PARENT_GUID, COUNT(CHILD_GUID) AS CHILDREN\n" +
                  "FROM DAGR_PARENT\n" +
                  "GROUP BY PARENT_GUID),\n" +
                  "parents\n" +
                  "AS (SELECT CHILD_GUID, COUNT(PARENT_GUID) AS PARENTS\n" +
                  "FROM DAGR_PARENT\n" +
                  "GROUP BY CHILD_GUID)\n" +
                  "SELECT d.guid, d.name, d.category, COALESCE(f.media, 0) AS files, COALESCE(p.parents, 0) AS parents, COALESCE(c.children, 0) AS children, d.create_date\n" +
                  "FROM dagr d\n" +
                  "LEFT JOIN files f\n" +
                  "ON d.GUID=f.DAGR_GUID\n" +
                  "LEFT JOIN parents p\n" +
                  "ON d.GUID=p.CHILD_GUID\n" +
                  "LEFT JOIN children c\n" +
                  "ON d.GUID=c.PARENT_GUID\n" +
                  "WHERE d.author = :author";

    // console.log("QUERY: ", dagrQuery);
    db.doExecute(connection, dagrQuery, [req.query.user]).then(function(dagrs) {
      var promises = [];
      var keywordQuery =  "SELECT keyword\n"  + 
            "FROM DAGR_KEYWORD\n"  + 
            "WHERE DAGR_GUID = :guid";

      //Get the keywords for each dagr
      dagrs.rows.forEach(function(dagr){
        promises.push(db.doExecute(connection, keywordQuery, [dagr.GUID]).then(function(r) {
          dagr.KEYWORDS = r.rows.map(r => r.KEYWORD);
        }));
      });

      $q.all(promises).then(function(){
        db.doRelease(connection);
        res.send(dagrs.rows);
      });
    });
  });
});

router.get('/get_dagr', function(req, res, next) {
  db.doConnect().then(function(connection){
    var queries = [];
    var dagr = {};
    var guid = req.query.id;

    var dagrQuery = "SELECT *\n" +
                    "FROM DAGR\n" +
                    "WHERE GUID = :guid";

    var parentsQuery =  "SELECT d.name, dp.PARENT_GUID AS GUID\n"  + 
                        "FROM DAGR d, DAGR_PARENT dp\n"  + 
                        "WHERE d.GUID = dp.PARENT_GUID\n"  + 
                        "AND dp.CHILD_GUID = :guid";

    var childrenQuery =  "SELECT d.name, dp.CHILD_GUID AS GUID\n"  + 
                         "FROM DAGR d, DAGR_PARENT dp\n"  + 
                         "WHERE d.GUID = dp.CHILD_GUID\n"  + 
                         "AND dp.PARENT_GUID = :guid";

    var keywordQuery =  "SELECT keyword\n"  + 
                        "FROM DAGR_KEYWORD\n"  + 
                        "WHERE DAGR_GUID = :guid";

    var mediaQuery =  "SELECT m.guid, m.name, m.type, m.uri, m.author, m.insert_date, dm.reference_date, fm.\"SIZE\", fm.create_date, fm.modify_date, lm.description\n"  + 
                      "FROM MEDIA m\n"  + 
                      "JOIN DAGR_MEDIA dm\n"  + 
                      "ON m.GUID = dm.MEDIA_GUID\n"  + 
                      "LEFT JOIN FILE_METADATA fm\n"  + 
                      "ON m.GUID = fm.MEDIA_GUID\n"  + 
                      "LEFT JOIN LINK_METADATA lm\n"  + 
                      "ON m.GUID = lm.MEDIA_GUID\n"  + 
                      "WHERE dm.DAGR_GUID = :guid";

    console.log("QUERY: ", dagrQuery);
    queries.push(db.doExecute(connection, dagrQuery, [guid]).then(function(result) {
      //TO DO handle empty result
      dagr.info = result.rows[0];
    }));

    console.log("QUERY: ", parentsQuery);
    queries.push(db.doExecute(connection, parentsQuery, [guid]).then(function(result) {
      dagr.parents = result.rows;
    }));

    console.log("QUERY: ", childrenQuery);
    queries.push(db.doExecute(connection, childrenQuery, [guid]).then(function(result) {
      dagr.children = result.rows;
    }));

    console.log("QUERY: ", keywordQuery);
    queries.push(db.doExecute(connection, keywordQuery, [guid]).then(function(result) {
      dagr.keywords = result.rows;
    }));

    console.log("QUERY: ", mediaQuery);
    queries.push(db.doExecute(connection, mediaQuery, [guid]).then(function(result) {
      dagr.media = result.rows;

      var promises = [];
      var keywordQuery =  "SELECT keyword\n"  + 
            "FROM MEDIA_KEYWORD\n"  + 
            "WHERE MEDIA_GUID = :guid";

      //Get the keywords for each media
      dagr.media.forEach(function(media){
        promises.push(db.doExecute(connection, keywordQuery, [media.GUID]).then(function(r) {
          media.KEYWORDS = r.rows.map(r => r.KEYWORD);
        }));
      });

      return $q.all(promises);
    }));

    $q.all(queries).then(function(){
      db.doRelease(connection);
      res.send(dagr);
    });
  });

});

router.get('/all_media', function(req, res, next) {
  db.doConnect().then(function(connection){
    var mediaQuery =    "   WITH mediaByAuthor  "  + 
                       "   AS (SELECT m.GUID  "  + 
                       "   FROM MEDIA m  "  + 
                       "   LEFT JOIN DAGR_MEDIA dm  "  + 
                       "   ON m.GUID = dm.MEDIA_GUID  "  + 
                       "   LEFT JOIN DAGR d  "  + 
                       "   ON dm.DAGR_GUID = d.GUID  "  + 
                       "   WHERE d.author = :author  "  + 
                       "   GROUP BY m.GUID)  "  + 
                       "   SELECT m.guid, m.name, m.type, m.uri, m.author, m.insert_date, fm.\"SIZE\", fm.create_date, lm.description  "  + 
                       "   FROM MEDIA m  "  + 
                       "   JOIN mediaByAuthor mba  "  + 
                       "   ON m.GUID = mba.GUID  "  + 
                       "   LEFT JOIN FILE_METADATA fm  "  + 
                       "   ON m.GUID = fm.MEDIA_GUID  "  + 
                       "   LEFT JOIN LINK_METADATA lm  "  + 
                       "  ON m.GUID = lm.MEDIA_GUID  " ; 

    // console.log("QUERY: ", mediaQuery);
    db.doExecute(connection, mediaQuery, [req.query.user]).then(function(results) {
      var promises = [];
      var keywordQuery =  "SELECT keyword\n"  + 
            "FROM MEDIA_KEYWORD\n"  + 
            "WHERE MEDIA_GUID = :guid";

      //Get the keywords for each media
      results.rows.forEach(function(media){
        promises.push(db.doExecute(connection, keywordQuery, [media.GUID]).then(function(r) {
          media.KEYWORDS = r.rows.map(r => r.KEYWORD);
        }));
      });

      $q.all(promises).then(function(){
        db.doRelease(connection);
        res.send(results.rows);
      });
    });
  });
});

router.get('/get_categories', function(req, res, next) {
  db.doConnect().then(function(connection){
    var sqlQuery = "SELECT CATEGORY\n" +
                    "FROM DAGR\n" +
                    "WHERE AUTHOR = :author\n" +
                    "GROUP BY CATEGORY";

    // console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows.map(r => r.CATEGORY).filter(c => c !== null));
    });
  });
});

router.get('/get_possible_dagrs', function(req, res, next) {
  db.doConnect().then(function(connection){
    var term = req.query.term || '';
    var params = [('%' + term.toLowerCase() + '%'), req.query.user];
    var sqlQuery =  "WITH FILES\n"  + 
                   "AS (SELECT DAGR_GUID, COUNT(MEDIA_GUID) AS MEDIA\n"  + 
                   "FROM DAGR_MEDIA\n"  + 
                   "GROUP BY DAGR_GUID)\n"  + 
                   "SELECT d.GUID, d.NAME, COALESCE(f.MEDIA, 0) AS FILES\n"  + 
                   "FROM DAGR d\n"  + 
                   "LEFT JOIN FILES f\n"  + 
                   "ON d.GUID = f.DAGR_GUID\n"  + 
                   "WHERE LOWER(d.NAME) LIKE :term\n"  + 
                   "AND d.AUTHOR = :author\n"; 

    if(req.query.id) {
      sqlQuery += "AND d.GUID != :id\n";
      params.push(req.query.id);
    }

    // console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, params).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

router.get('/get_possible_parents', function(req, res, next) {
  db.doConnect().then(function(connection){
    var term = req.query.term || '';
    var sqlQuery = "WITH MEDIA_COUNT\n"  + 
                   "AS (SELECT DAGR_GUID, COUNT(MEDIA_GUID) AS MEDIA\n"  + 
                   "FROM DAGR_MEDIA\n"  + 
                   "GROUP BY DAGR_GUID)\n"  + 
                   "SELECT d.GUID, d.NAME, COALESCE(mc.MEDIA, 0) AS MEDIA\n"  + 
                   "FROM DAGR d\n"  + 
                   "LEFT JOIN MEDIA_COUNT mc\n"  + 
                   "ON d.GUID = mc.DAGR_GUID\n"  + 
                   "LEFT JOIN DAGR_PARENT dp\n"  + 
                   "ON d.GUID = dp.PARENT_GUID\n"  + 
                   "WHERE dp.CHILD_GUID IS NULL\n"  + 
                   "AND LOWER(d.NAME) LIKE :term\n" +
                   "AND d.GUID != :guid\n"  + 
                   "AND d.author = :author" ;

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [('%' + term.toLowerCase() + '%'), req.query.id, req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

router.get('/get_possible_children', function(req, res, next) {
  db.doConnect().then(function(connection){
    var term = req.query.term || '';
    var sqlQuery = "WITH MEDIA_COUNT\n"  + 
                   "AS (SELECT DAGR_GUID, COUNT(MEDIA_GUID) AS MEDIA\n"  + 
                   "FROM DAGR_MEDIA\n"  + 
                   "GROUP BY DAGR_GUID)\n"  + 
                   "SELECT d.GUID, d.NAME, COALESCE(mc.MEDIA, 0) AS MEDIA\n"  + 
                   "FROM DAGR d\n"  + 
                   "LEFT JOIN MEDIA_COUNT mc\n"  + 
                   "ON d.GUID = mc.DAGR_GUID\n"  + 
                   "LEFT JOIN DAGR_PARENT dp\n"  + 
                   "ON d.GUID = dp.CHILD_GUID\n"  + 
                   "WHERE dp.PARENT_GUID IS NULL\n"  + 
                   "AND LOWER(d.NAME) LIKE :term\n" +
                   "AND d.GUID != :guid\n"  + 
                   "AND d.author = :author" ;

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [('%' + term.toLowerCase() + '%'), req.query.id, req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

router.get('/get_possible_keywords', function(req, res, next) {
  db.doConnect().then(function(connection){
    var term = req.query.term || '';
    var sqlQuery = "WITH CURRENT_KEYWORDS\n"  + 
                    "AS (SELECT KEYWORD\n"  + 
                    "FROM DAGR_KEYWORD\n"  + 
                    "WHERE DAGR_GUID = :guid),\n"  + 
                    "WORD_COUNT\n"  + 
                    "AS (SELECT KEYWORD, COUNT(DAGR_GUID) AS DAGRS FROM DAGR_KEYWORD GROUP BY KEYWORD )\n"  + 
                    "SELECT dk.KEYWORD, wc.DAGRS\n"  + 
                    "FROM DAGR_KEYWORD dk\n"  + 
                    "LEFT JOIN DAGR d\n"  + 
                    "ON dk.DAGR_GUID = d.GUID\n"  + 
                    "LEFT JOIN CURRENT_KEYWORDS ck \n"  + 
                    "ON dk.KEYWORD = ck.KEYWORD\n"  + 
                    "LEFT JOIN WORD_COUNT wc\n"  + 
                    "ON dk.KEYWORD = wc.KEYWORD\n"  + 
                    "WHERE LOWER(dk.KEYWORD) LIKE :term\n"  + 
                    "AND ck.keyword IS NULL\n"  + 
                    "AND d.AUTHOR = :author\n"  + 
                    "GROUP BY dk.KEYWORD, wc.DAGRS" ; 

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [req.query.id, ('%' + term.toLowerCase() + '%'), req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

module.exports = router;