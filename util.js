var fs = require('fs');
var fsm = require('fs-meta');
var hashFiles = require('hash-files');
var os = require('os');
var Guid = require('guid');
var db   = require('./db');
var $q = require('q');
var util = {};

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
			if(meta.uid) {
				columns += ",AUTHOR";
				values += ",'" + os.userInfo().username + "'";
			}

			SQL += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n"

			//INSERT INTO FILE_METADATA TABLE
			SQL += "INTO FILE_METADATA (MEDIA_GUID,HASH,\"SIZE\",CREATE_DATE,MODIFY_DATE) VALUES ('" + meta.guid + "','" + meta.hash + "'," + meta.size + "," + birthTimestamp  + "," + mTimestamp + ")\n"

			//INSERT INTO DAGR_MEDIA TABLE
			SQL += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + meta.guid + "')\n"	
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

util.generateLinkSQL = function(media, dagrID){
	
	//Check for duplicates
	return isDuplicate(media.uri, dagrID).then(function(duplicate) {
		var query = "";

		if(duplicate === '') {
			media.guid = Guid.raw();

			//INSERT INTO MEDIA TABLE
			var columns = "GUID,TYPE,URI,NAME";
			var values = "'" + media.guid + "','" + media.type + "','http://" + media.uri + "','" + (media.title || media.uri) + "'";

			if(media.author) {
				media.author = media.author.replace(/'/g, "''");
				columns += ",AUTHOR";
				values += ",'" + media.author + "'";
			}

			query += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n"

			//INSERT INTO LINK_METADATA TABLE
			if(media.description) {
				media.description = media.description.replace(/'/g, "''");

				query += "INTO LINK_METADATA (MEDIA_GUID,DESCRIPTION) VALUES ('" + media.guid + "','" + media.description + "')\n"			
			}

			//INSERT INTO MEDIA_KEYWORDS TABLE
			if(media.keywords) {

				var uniqueKeywords = media.keywords.filter(function(item, pos) {
					    return media.keywords.indexOf(item) == pos;
				});
				
				for(var i=0; i<uniqueKeywords.length; i++) {
					uniqueKeywords[i] = uniqueKeywords[i].replace(/'/g, "''");
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

util.connectionError = function(err){
    console.log('CONNECTION ERROR: ', err);
};


module.exports = util;




