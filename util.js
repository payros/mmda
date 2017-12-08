var amd = require('audio-metadata');
var fs = require('fs');
var fsm = require('fs-meta');
var hashFiles = require('hash-files');
var os = require('os');
var Guid = require('guid');
var db   = require('./db');
var $q = require('q');
var util = {};

var HASHES = [];
var LINKS = [];

//TO DO file hashing is yielding a different hash for identical files in different directories. Figure out why...
function isDuplicate(val, dagrID) {	
    return db.doConnect().then(function(connection){
    	var isLink = val.indexOf('.') > -1;

    	if(isLink) {
    		var sqlQuery = "SELECT guid FROM media WHERE uri = :val";
    		val = 'http://' + val;
    	} else {
    		var sqlQuery = "SELECT media_guid FROM file_metadata WHERE hash = :val";
    	}

        return db.doExecute(connection, sqlQuery, [val]).then(function(result) {
        	//It's a duplicate. Check if this DAGR already references the original
        	if(result.rows.length) {
        		var originalMediaGUID = result.rows[0][isLink ? 'GUID' : 'MEDIA_GUID'];
	    		var sqlQuery = "SELECT DAGR_GUID FROM DAGR_MEDIA WHERE MEDIA_GUID = :media AND DAGR_GUID = :dagr";

		        return db.doExecute(connection, sqlQuery, [originalMediaGUID, dagrID]).then(function(r) {
		        	db.doRelease(connection);
		        	return r.rows.length ? 'exists' : originalMediaGUID;
		        });	

        	//It's not a duplicate. Return an empty string
        	} else {
        		db.doRelease(connection);
        		return '';
        	}
        });
    });
}

function getByValue(arr, prop, value) {
  for (var i=0; i<arr.length; i++) {
    if (arr[i][prop] == value) return arr[i];
  }
  return false;
}

function arrayToObject(arr){
	// console.log(arr);
	var finalNode;

	arr.forEach(function(level, i){
		level.forEach(function(node, j){
			if(node.parent) {
				var parent = getByValue(arr[i+1], 'id', node.parent);
				if(parent) {
					delete node.parent;
					if (parent.hasOwnProperty('children')) {
						parent.children.push(node);
					} else {
						parent.children = [node];
					}
				}
			} else {
				finalNode = node;
			}
		});
	});
	return finalNode;
};

function metaToSQL(meta, dagrID) {
	//Check for duplicates
	return isDuplicate(meta.hash, dagrID).then(function(duplicate) {
		var SQL = "";	

		//If it's a new file
		if(duplicate === '') {
			mSecs = Math.floor(new Date(meta.mtime).getTime()/1000);
			mTimestamp = "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + mSecs + ",'SECOND'))";
			bSecs = Math.floor(new Date(meta.birthtime).getTime()/1000);
			birthTimestamp = "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + bSecs + ",'SECOND'))";

			//INSERT INTO MEDIA TABLE
			var columns = "GUID,TYPE,URI,NAME";
			var values = "'" + meta.guid + "','" + util.getType(meta.extension) + "','" + meta.path + "','" + meta.basename + "'";

			//TO DO Defaults to the current logged in user, but ideally it should use meta.uid
			//TO DO write function get author that will look for author based on file type
			// console.log(meta);
			var metaAuthor = util.getMetaAuthor(meta);
			if (metaAuthor) {
				columns += ",AUTHOR";
				values += ",'" + metaAuthor + "'";
			} else if(meta.uid) {
				columns += ",AUTHOR";
				values += ",'" + os.userInfo().username + "'";
			}
			console.log(metaAuthor);

			SQL += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n";
			console.log(SQL);
			//INSERT INTO FILE_METADATA TABLE
			SQL += "INTO FILE_METADATA (MEDIA_GUID,HASH,\"SIZE\",CREATE_DATE,MODIFY_DATE) VALUES ('" + meta.guid + "','" + meta.hash + "'," + meta.size + "," + birthTimestamp  + "," + mTimestamp + ")\n"

			//INSERT INTO DAGR_MEDIA TABLE
			SQL += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + meta.guid + "')\n"	;
		} else if (duplicate === 'exists') {
			console.log("INFO: " + meta.path + " already referenced in this DAGR. Duplicates are not allowed");
		} else {
			//TO DO, check if the the media is already referencing this dagrID so we don't insert it twice (which violates the PK for the table)

			//INSERT INTO DAGR_MEDIA TABLE
			SQL += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + duplicate + "')\n"
		}

		return SQL;			
	});
}

function toTimestamp(dateString) {
	secs = Math.floor(new Date(parseInt(dateString)).getTime()/1000);
	return "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + secs + ",'SECOND'))";
}

//TO DO call this once instead of opening a new connection to the DB each time we check for a duplicate
util.syncRecords = function() {
    return db.doConnect().then(function(connection){
        return db.doExecute(connection, "SELECT media_guid,hash FROM file_metadata", {}).then(function(result) {
        	HASHES = result.rows;
        	db.doRelease(connection);
        });
    });

    return db.doConnect().then(function(connection){
        return db.doExecute(connection, "SELECT guid,uri FROM media WHERE type = 'link'", {}).then(function(result) {
        	LINKS = result.rows;
        	db.doRelease(connection);
        });
    });
};

util.sanitize = function(input) {
	var escaped = input.replace(/'/g, "''");
	var shortened = escaped.length > 999 ? escaped.substring(0,999) : escaped; 
	return shortened;
}

util.getName = function(media) {
	switch(media.type) {
		case 'link':
			return media.title || media.uri;

		case 'file':
			return media.uri.match(/([^\\\/]+)\..*$/)[1];

		case 'folder':
			return media.uri.match(/([^\\\/]+)$/)[1];

		case 'dagr':
			//TO DO append an index after the string based on the number of similar titles
			return 'DAGR Collection';
	
	}
};

util.getType = function(extension) {
	//TO DO Add types as we figure out how to handle them differently on the UI
	switch(extension) {
		case 'jpg':
		case 'jpeg':
		case 'png':
		case 'gif':
			return 'image';

		case 'mp4':
			return 'video';

		case 'wav':
		case 'mp3':
			return 'audio';

		case 'html':
			return 'html';

		case 'pdf':
			return 'pdf';

		case 'txt':
		case 'doc':
			return 'text';

		case 'css':
		case 'java':
		case 'js':
		case 'json':
		case 'm':
		case 'py':
		case 'sql':
		case 'xml':
		case 'xsd':
		case 'xsl':
			return 'code';

		default:
			return 'other';
	}
}

util.getMetaAuthor = function(media) {
	//Returning false for now so we can keep working on this
	return false;
	switch(media.extension) {
		case 'mp3':
		case 'wav':
			//This functuin is hanging with some of my files. We need to figure out how to catch it or time it out.
			return amd.id3v2(fs.readFileSync(media.path)).artist;
			break;

		default:
			return false;
	}
}

util.generateLinkSQL = function(media, dagrID){
	
	//Check for duplicates
	return isDuplicate(media.uri, dagrID).then(function(duplicate) {
		var query = "";

		if(duplicate === '') {
			media.guid = Guid.raw();

			//INSERT INTO MEDIA TABLE
			var columns = "GUID,TYPE,URI,NAME";
			if(media.title) {
				media.title = util.sanitize(media.title);
			}
			var values = "'" + media.guid + "','" + media.type + "','http://" + media.uri + "','" + (media.title || media.uri) + "'";

			if(media.author) {
				media.author = util.sanitize(media.author);
				columns += ",AUTHOR";
				values += ",'" + media.author + "'";
			}

			query += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n"

			//INSERT INTO LINK_METADATA TABLE
			if(media.description) {
				media.description = util.sanitize(media.description);

				query += "INTO LINK_METADATA (MEDIA_GUID,DESCRIPTION) VALUES ('" + media.guid + "','" + media.description + "')\n"			
			}
			
			//INSERT INTO MEDIA_KEYWORDS TABLE
			if(media.keywords) {
				//Sanitize keywords by removing empty strings and duplicates
				var uniqueKeywords = media.keywords.filter(function(item, pos) {
					    return item !== '' && media.keywords.indexOf(item) == pos;
				});
				
				for(var i=0; i<uniqueKeywords.length; i++) {
					uniqueKeywords[i] = util.sanitize(uniqueKeywords[i]);
					query += "INTO MEDIA_KEYWORD (MEDIA_GUID,KEYWORD) VALUES ('" + media.guid + "','" + uniqueKeywords[i] + "')\n"		
				}			
			}
			
			//INSERT INTO DAGR_MEDIA TABLE
			query += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + media.guid + "')\n"	

		} else if (duplicate === 'exists'){
			console.log("INFO: " + media.uri + " already referenced in this DAGR. Duplicates are not allowed");
		} else {
			query += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + duplicate + "')\n"
		}		

		return query;
	});
};

util.generateFileSQL = function(media, dagrID){
	// TO DO Handle exceptions (NO File found, permission errors, etc)
	return fsm.getMeta(media.uri).then(function (meta) {
		meta.guid = Guid.raw();
		meta.hash = hashFiles.sync({"algorithm":'md5', "files":media.uri});

		return metaToSQL(meta, dagrID).then(function(SQL){
			return SQL;
		});
	});
};

util.generateFolderSQL = function(media, dagrID){
	var query = "";
	var promises = [];

	// TO DO Handle exceptions (NO Folder found, permission errors, etc)

	return fsm.getMetaRecursive(media.uri).then(function (meta) {
		
		//Loop over all the files and directories
		for(var i=0; i<meta.files.length; i++) {
			var fm = meta.files[i];
			//Check if it's a file, not a directory and the file/directory is not hidden
			if(fm.isFile && !fm.path.match(/\/\./) && fm.basename.charAt(0) !== '.') {
				fm.guid = Guid.raw();
				//TO DO Make this async for performance. Right now it's sync for simplicity
				fm.hash = hashFiles.sync({"files":fm.path});

				//Check for Duplicates then add
				promises.push(metaToSQL(fm, dagrID).then(function(SQL){
		          query += SQL;
		        }));
			}
		}

  		//Wait until all files have been checked for duplicates and all queries generated, then return
  		return $q.all(promises).then(function(){
	    	return query;
		});
	});
};

util.generateDagrSQL = function(media, dagrID){
	return db.doConnect().then(function(connection){
		var sqlQuery = "SELECT MEDIA_GUID FROM DAGR_MEDIA WHERE DAGR_GUID = :guid";
	    return db.doExecute(connection, sqlQuery, [media.id]).then(function(result) {

	      db.doRelease(connection);
	      var resultQuery = "";

	      for (var i = 0; i < result.rows.length; i++) {
	      	resultQuery += "INTO DAGR_MEDIA (DAGR_GUID, MEDIA_GUID) VALUES ('" + dagrID + "','" + result.rows[i].MEDIA_GUID + "')\n"
	      }
	      
	      return resultQuery;
	    });
	});
};

util.generateDagrSearchSQL = function(params){
    var dagrQuery = "WITH files\n"  + 
                    "  AS (SELECT DAGR_GUID, COUNT(MEDIA_GUID) AS MEDIA\n"  + 
                    "  FROM DAGR_MEDIA\n"  + 
                    "  GROUP BY DAGR_GUID),\n"  + 
                    "children\n"  + 
                    "  AS (SELECT PARENT_GUID, COUNT(CHILD_GUID) AS CHILDREN\n"  + 
                    "  FROM DAGR_PARENT\n"  + 
                    "  GROUP BY PARENT_GUID),\n"  + 
                    "parents\n"  + 
                    "  AS (SELECT CHILD_GUID, COUNT(PARENT_GUID) AS PARENTS\n"  + 
                    "  FROM DAGR_PARENT\n"  + 
                    "  GROUP BY CHILD_GUID),\n"  + 
                    "keywords\n"  + 
                    "  AS (SELECT DAGR_GUID\n"  + 
                    "  FROM DAGR_KEYWORD\n"  + 
                    "  WHERE KEYWORD LIKE :q\n"  + 
                    "  GROUP BY DAGR_GUID)\n"  + 
                    "SELECT d.guid, d.name, d.category, COALESCE(f.media, 0) AS files, COALESCE(p.parents, 0) AS parents, COALESCE(c.children, 0) AS children, d.create_date\n"  + 
                    "FROM dagr d\n"  + 
                    "LEFT JOIN files f\n"  + 
                    "ON d.GUID=f.DAGR_GUID\n"  + 
                    "LEFT JOIN parents p\n"  + 
                    "ON d.GUID=p.CHILD_GUID\n"  + 
                    "LEFT JOIN children c\n"  + 
                    "ON d.GUID=c.PARENT_GUID\n"  + 
                    "LEFT JOIN keywords k\n"  + 
                    "ON d.GUID=k.DAGR_GUID\n"  + 
                    "WHERE d.author = :author\n";

	if(params.filter) {
		var filters = params.filter.split(',');
		var andFilters = "";
		var orFilters = "AND (d.GUID LIKE :q\n";


		for (var i = 0; i< filters.length; i++) {
			switch(filters[i]) {
				case 'title':
					orFilters += "OR LOWER(d.NAME) LIKE :q\n";
					break;

				case 'keyword':
					orFilters += "OR k.DAGR_GUID IS NOT NULL\n";
					break;

				case 'category':
					orFilters += "OR LOWER(d.CATEGORY) LIKE :q\n";
					break;

				case 'orphan':
					andFilters += "AND p.parents IS NULL \n";
					break;

				case 'sterile':
					andFilters += "AND c.children IS NULL \n";
					break;

				case 'create_date':
					if(params.minDate) andFilters += "AND d.create_date >= " + toTimestamp(params.minDate) + "\n";
					if(params.maxDate) andFilters += "AND d.create_date <= " + toTimestamp(params.maxDate) + "\n";
					break;

				case 'modify_date':
					if(params.minDate) andFilters += "AND d.modify_date >= " + toTimestamp(params.minDate) + "\n";
					if(params.maxDate) andFilters += "AND d.modify_date <= " + toTimestamp(params.maxDate) + "\n";
					break;
			}
		};

		orFilters = orFilters.substring(0, orFilters.length - 1) + ")\n";
		dagrQuery += andFilters + orFilters;

	} else {
	    dagrQuery += "AND (d.GUID LIKE :q\n"  + 
	                "OR LOWER(d.NAME) LIKE :q\n"  + 
	                "OR LOWER(d.CATEGORY) LIKE :q\n"  + 
	                "OR k.DAGR_GUID IS NOT NULL)";      	
	}

    return dagrQuery;
};

util.generateMediaSearchSQL = function(params){
    var withClause =   "WITH mediaByAuthor\n" + 
                       "  AS (SELECT m.GUID\n" + 
                       "  FROM MEDIA m\n" + 
                       "  LEFT JOIN DAGR_MEDIA dm\n" + 
                       "  ON m.GUID = dm.MEDIA_GUID\n" + 
                       "  LEFT JOIN DAGR d\n" + 
                       "  ON dm.DAGR_GUID = d.GUID\n" + 
                       "  WHERE d.author = :author\n" + 
                       "  GROUP BY m.GUID),\n" + 
                       "keywords\n" + 
                       "  AS (SELECT MEDIA_GUID\n" + 
                       "  FROM MEDIA_KEYWORD\n" + 
                       "  WHERE KEYWORD LIKE :q\n" + 
                       "  GROUP BY MEDIA_GUID)\n"; 

    var selectClause =  "SELECT m.guid, m.name, m.type, m.uri, m.author, m.insert_date, fm.\"SIZE\", fm.create_date, lm.description\n" + 
                        "FROM MEDIA m\n";

    var joinClause =   "JOIN mediaByAuthor mba\n" + 
                       "ON m.GUID = mba.GUID\n" + 
                       "LEFT JOIN FILE_METADATA fm\n" + 
                       "ON m.GUID = fm.MEDIA_GUID\n" + 
                       "LEFT JOIN LINK_METADATA lm\n" + 
                       "ON m.GUID = lm.MEDIA_GUID\n" + 
                       "LEFT JOIN KEYWORDS k\n" + 
                       "ON m.GUID = k.MEDIA_GUID\n";


    var whereClause = "WHERE (m.GUID LIKE :q\n";

	if(params.filter) {
		var filters = params.filter.split(',');
		var andFilters = "";
		var orFilters = "";


		for (var i = 0; i< filters.length; i++) {
			switch(filters[i]) {
				case 'title':
					orFilters += "OR LOWER(m.NAME) LIKE :q\n";
					break;

				case 'keyword':
					orFilters += "OR k.MEDIA_GUID IS NOT NULL\n";
					break;

				case 'uri':
					orFilters += "OR LOWER(m.URI) LIKE :q\n";
					break;

				case 'type':
					orFilters += "OR LOWER(m.TYPE) LIKE :q\n";
					break;

				case 'description':
					orFilters += "OR LOWER(lm.DESCRIPTION) LIKE :q\n"
					break;

				case 'author':
					orFilters += "OR LOWER(m.AUTHOR) LIKE :q\n";
					break;

				case 'create_date':
					if(params.minDate) andFilters += "AND fm.create_date >= " + toTimestamp(params.minDate) + "\n";
					if(params.maxDate) andFilters += "AND fm.create_date <= " + toTimestamp(params.maxDate) + "\n";
					break;

				case 'modify_date':
					if(params.minDate) andFilters += "AND fm.modify_date >= " + toTimestamp(params.minDate) + "\n";
					if(params.maxDate) andFilters += "AND fm.modify_date <= " + toTimestamp(params.maxDate) + "\n";
					break;

				case 'insert_date':
					if(params.minDate) andFilters += "AND m.insert_date >= " + toTimestamp(params.minDate) + "\n";
					if(params.maxDate) andFilters += "AND m.insert_date <= " + toTimestamp(params.maxDate) + "\n";
					break;

				case 'file_size':
					if(params.minSize) andFilters += "AND fm.\"SIZE\" >= " + parseInt(params.minSize) + "\n";
					if(params.maxSize) andFilters += "AND fm.\"SIZE\" <= " + parseInt(params.maxSize) + "\n";
					break;

				case 'reference_date':
					if(params.minDate || params.maxDate) {
						withClause += "references\n" + 
	                      "  AS (SELECT MEDIA_GUID\n" + 
	                      "  FROM DAGR_MEDIA\n";
						if(params.minDate) withClause += "WHERE m.reference_date >= " + toTimestamp(params.minDate) + "\n";
						if(params.maxDate) withClause += (params.minDate ? "AND" : "WHERE") + " m.reference_date <= " + toTimestamp(params.maxDate) + "\n";
				        withClause += "GROUP BY MEDIA_GUID)\n";
						joinClause += "LEFT JOIN REFERENCES r\n" + 
                       			      "ON r.MEDIA_GUID = m.GUID\n" 
				        andFilters += "OR r.MEDIA_GUID IS NOT NULL\n"; 						
					}
					break;
			}
		};

		orFilters = orFilters.substring(0, orFilters.length - 1) + ")\n";
		mediaQuery = withClause + selectClause + joinClause + whereClause + orFilters + andFilters;

	} else {
		mediaQuery = withClause + selectClause + joinClause + whereClause;
        mediaQuery += "OR LOWER(m.NAME) LIKE :q\n" + 
                       "OR LOWER(m.TYPE) LIKE :q\n" + 
                       "OR LOWER(m.URI) LIKE :q\n" + 
                       "OR LOWER(m.AUTHOR) LIKE :q\n" + 
                       "OR LOWER(m.NAME) LIKE :q\n" + 
                       'OR LOWER(lm.DESCRIPTION) LIKE :q\n' +
                       "OR k.MEDIA_GUID IS NOT NULL)";    	
	}

    return mediaQuery;
};

util.getRelatives = function(descendents, conn, level, desc){

	if(level === 0) return arrayToObject(desc.reverse());
	var queries = [];
	var curr = desc[desc.length-1];
	var ids = [].concat.apply([], desc).map(a => a.id);
	var query = "SELECT d.GUID, d.NAME, d.CATEGORY\n" +
				"FROM DAGR_PARENT dp\n" +
				"LEFT JOIN DAGR d\n" +
				"ON dp." + (descendents ? 'CHILD' : 'PARENT') + "_GUID = d.GUID\n" +
				"WHERE dp." + (descendents ? 'PARENT' : 'CHILD') + "_GUID = :id";

	var newChildren = [];
	//Loop over the most recent descendents
	curr.forEach(function(d){
		queries.push(db.doExecute(conn, query, [d.id]).then(function(result) {
			console.log(result);
			//Loop over the child of this descendent
			for(var j=0; j<result.rows.length; j++) {
				//Only add if there is no duplication
				if(ids.indexOf(result.rows[j].GUID) === -1) {
					newChildren.push({
						parent:d.id,
						id: result.rows[j].GUID,
						text: {
							name: result.rows[j].NAME,
							title: result.rows[j].CATEGORY,
						},
						link: {
							href:'#!/dagr/' + result.rows[j].GUID
						}
					});
				}
			}
        }));
	});

	return $q.all(queries).then(function(){
		if(newChildren.length) desc.push(newChildren);
		return util.getRelatives(descendents, conn, --level, desc);
	});
};

util.connectionError = function(err){
    console.log('CONNECTION ERROR: ', err);
};


module.exports = util;

