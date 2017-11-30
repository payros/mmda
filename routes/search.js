var express = require('express');
var router = express.Router();
var db   = require('../db');
var $q = require('q');

/* Root GET handler */
router.get('/', function(req, res, next) {
  res.send('nothing to see here. Move along...');
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

    var mediaQuery =  "SELECT m.guid, m.name, m.type, m.uri, m.author, m.insert_date, fm.\"SIZE\", fm.create_date, lm.description\n"  + 
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

      //Get the keywords for each dagr
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
    var sqlQuery =  "WITH FILES\n"  + 
                   "AS (SELECT DAGR_GUID, COUNT(MEDIA_GUID) AS MEDIA\n"  + 
                   "FROM DAGR_MEDIA\n"  + 
                   "GROUP BY DAGR_GUID)\n"  + 
                   "SELECT d.GUID, d.NAME, COALESCE(f.MEDIA, 0) AS FILES\n"  + 
                   "FROM DAGR d\n"  + 
                   "LEFT JOIN FILES f\n"  + 
                   "ON d.GUID = f.DAGR_GUID\n"  + 
                   "WHERE d.NAME LIKE :term\n"  + 
                   "AND d.AUTHOR = :author" ; 

    // console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [('%' + req.query.term + '%'), req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

router.get('/get_possible_parents', function(req, res, next) {
  db.doConnect().then(function(connection){
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
                   "AND d.NAME LIKE :term\n" +
                   "AND d.GUID != :guid\n"  + 
                   "AND d.author = :author" ;

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [('%' + req.query.term + '%'), req.query.id, req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});


router.get('/get_possible_children', function(req, res, next) {
  db.doConnect().then(function(connection){
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
                   "AND d.NAME LIKE :term\n" +
                   "AND d.GUID != :guid\n"  + 
                   "AND d.author = :author" ;

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [('%' + req.query.term + '%'), req.query.id, req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

router.get('/get_possible_keywords', function(req, res, next) {
  db.doConnect().then(function(connection){
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
                    "WHERE dk.KEYWORD LIKE :term\n"  + 
                    "AND ck.keyword IS NULL\n"  + 
                    "AND d.AUTHOR = :author\n"  + 
                    "GROUP BY dk.KEYWORD, wc.DAGRS" ; 

    console.log("QUERY: ", sqlQuery);
    db.doExecute(connection, sqlQuery, [req.query.id, ('%' + req.query.term + '%'), req.query.user]).then(function(result) {
      db.doRelease(connection);
      res.send(result.rows);
    });
  });
});

module.exports = router;