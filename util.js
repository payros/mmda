var fs = require('fs');
var fsm = require('fs-meta');
var hashFiles = require('hash-files');
var userid = require('userid');
var Guid = require('guid');
var util = {};

util.isDuplicate = function(hash) {
	//TO DO check hash against the db
	return false;
};

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
	switch(extension) {
		default:
			return 'other';
	}
}

util.generateLinkSQL = function(media, dagrID){
	var query = "";
	media.guid = Guid.raw();

	//TO DO Check for duplicate URI

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

	return query;	
};

util.generateFileSQL = function(media, dagrID){
	var query = "";

	// TO DO Handle exceptions (NO File found, permission errors, etc)

	return fsm.getMeta(media.uri).then(function (meta) {
		media.guid = Guid.raw();
		media.hash = hashFiles.sync({"files":'/path/to/my/file'});
		console.log(media.hash);
		mSecs = Math.floor(new Date(meta.mtime).getTime()/1000);
		mTimestamp = "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + mSecs + ",'SECOND'))";
		bSecs = Math.floor(new Date(meta.birthtime).getTime()/1000);
		birthTimestamp = "(timestamp'1970-01-01 00:00:00' + numtodsinterval(" + bSecs + ",'SECOND'))";

		//INSERT INTO MEDIA TABLE
		var columns = "GUID,TYPE,URI,NAME";
		var values = "'" + media.guid + "','" + util.getType(meta.extension) + "','" + meta.path + "','" + meta.basename + "'";

		//TO DO write function get author that will look for author based on file type
		if(meta.uid) {
			columns += ",AUTHOR";
			values += ",'" + userid.username(meta.uid) + "'";
		}

		query += "INTO MEDIA (" + columns + ") VALUES (" + values + ")\n"

		//INSERT INTO MEDIA TABLE
		var columns = "";
		var values = "'" + media.guid + "','" + util.getType(meta.extension) + "','" + meta.path + "','" + meta.basename + "'";

		//TO DO write function get author that will look for author based on file type
		if(meta.uid) {
			columns += ",AUTHOR";
			values += ",'" + userid.username(meta.uid) + "'";
		}

		//INSERT INTO FILE_METADATA TABLE
		query += "INTO FILE_METADATA (MEDIA_GUID,HASH,\"SIZE\",CREATE_DATE,MODIFY_DATE) VALUES ('" + media.guid + "','" + media.hash + "'," + meta.size + "," + birthTimestamp  + "," + mTimestamp + ")\n"

		//INSERT INTO DAGR_MEDIA TABLE
		query += "INTO DAGR_MEDIA (DAGR_GUID,MEDIA_GUID) VALUES ('" + dagrID + "','" + media.guid + "')\n"

	    return query;
	});
};



module.exports = util;




