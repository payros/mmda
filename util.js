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



module.exports = util;




