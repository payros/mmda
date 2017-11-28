var fs = require('fs');
var fsm = require('fs-meta');
var hashFiles = require('hash-files');
var os = require('os');
var Guid = require('guid');
var db   = require('./db');
var $q = require('q');
var util = {};

//TO DO file hashing is yielding a different hash for identical files in different directories. Figure out why...
function isDuplicate(val) {	
    return db.doConnect().then(function(connection){
    	var isLink = val.indexOf('.') > -1;
		var sqlQuery = "SELECT guid FROM media WHERE " + (isLink ? 'uri' : 'hash') + " = :val";
		val = isLink ? 'http://' + val : val;

        return db.doExecute(connection, sqlQuery, [val]).then(function(result) {
          db.doRelease(connection);
          return result.rows.length ? result.rows[0]['GUID'] : '';
        });
    });
}

function metaToSQL(meta, dagrID) {
	//Check for duplicates
	return isDuplicate(meta.path).then(function(duplicate) {
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
				values += ",'" + os.username(meta.uid) + "'";
			}

			SQL += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n"

			//INSERT INTO FILE_METADATA TABLE
			SQL += "INTO FILE_METADATA (MEDIA_GUID,HASH,\"SIZE\",CREATE_DATE,MODIFY_DATE) VALUES ('" + meta.guid + "','" + meta.hash + "'," + meta.size + "," + birthTimestamp  + "," + mTimestamp + ")\n"

			//INSERT INTO DAGR_MEDIA TABLE
			SQL += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + meta.guid + "')\n"	
		} else {
			//TO DO, check if the the media is already referencing this dagrID so we don't insert it twice (which violates the PK for the table)

			//INSERT INTO DAGR_MEDIA TABLE
			SQL += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + meta.guid + "')\n"
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
	
	}
};

util.getType = function(extension) {
	//TO DO Add types as we figure out how to handle them differently on the UI
	switch(extension) {
		case 'jpg':
		case 'jpeg':
		case 'png':
			return 'image';
		default:
			return 'other';
	}
}

util.generateLinkSQL = function(media, dagrID){
	
	//Check for duplicates
	return isDuplicate(media.uri).then(function(duplicate) {
		var query = "";

		if(duplicate === '') {
			media.guid = Guid.raw();

			//INSERT INTO MEDIA TABLE
			var columns = "GUID,TYPE,URI,NAME";
			var values = "'" + media.guid + "','" + media.type + "','http://" + media.uri + "','" + (media.title || media.uri) + "'";

			if(media.author) {
				columns += ",AUTHOR";
				values += ",'" + media.author + "'";
			}

			query += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n"

			//INSERT INTO LINK_METADATA TABLE
			if(media.description) {
				query += "INTO LINK_METADATA (MEDIA_GUID,DESCRIPTION) VALUES ('" + media.guid + "','" + media.description + "')\n"			
			}

			//INSERT INTO MEDIA_KEYWORDS TABLE
			if(media.keywords) {
				for(var i=0; i<media.keywords.length; i++) {
					query += "INTO MEDIA_KEYWORD (MEDIA_GUID,KEYWORD) VALUES ('" + media.guid + "','" + media.keywords[i] + "')\n"		
				}			
			}
			
			//INSERT INTO DAGR_MEDIA TABLE
			query += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + media.guid + "')\n"		
		} else {
			console.log('INFO: ' + media.uri + ' already exists in the DB. Skipping.')
		}

		return query;			
		
	});
};

util.generateFileSQL = function(media, dagrID){
	// TO DO Handle exceptions (NO File found, permission errors, etc)
	return fsm.getMeta(media.uri).then(function (meta) {
		meta.guid = Guid.raw();
		meta.hash = hashFiles.sync({"files":media.uri});
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
				console.log(fm.path);
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


module.exports = util;




