angular.module('mmda')

/////// SERVICES ///////
.service ('User', function(){
  var getUser = function(){
    return localStorage.user || '';
  };

  var setUser = function(newUser){
    localStorage.user = newUser;
  };

  return {
    getUser:getUser,
    setUser:setUser
  }
})

.service('Create', function($http, User) {

  var addMedia = function(media, dagrInfo){
    var params = {'user':User.getUser(), 'media':media};
    if(dagrInfo.title) params['dagrTitle'] = dagrInfo.title;
    if(dagrInfo.category) params['dagrCategory'] = dagrInfo.category;
    if(dagrInfo.id) params['dagrID'] = dagrInfo.id;

    return $http.post('/create/add_media', params ).then(function(response){
      return response.data;
    });
  };

  var addParent = function(parentId, childId){
    return $http.post('/create/add_parent', {'pID': parentId, 'cID': childId}).then(function(response){
      return response.data;
    });
  };

  var addKeyword = function(keyword, id){
    return $http.post('/create/add_keyword', {'keyword': keyword, 'id': id}).then(function(response){
      return response.data;
    });
  };

  return {
    addMedia: addMedia,
    addParent: addParent,
    addKeyword: addKeyword
  };
})

.service('Search', function($http, User) {

  var all = function(params){
    params.user = User.getUser();
    return $http.get('/search', {'params':params} ).then(function(response){
      return response.data;
    });
  };

  var allDagrs = function(){
    return $http.get('/search/all_dagrs', {'params':{'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  var getDagr = function(id){
    return $http.get('/search/get_dagr', {'params':{'id':id}} ).then(function(response){
      return response.data;
    });
  };

  var allMedia = function(){
    return $http.get('/search/all_media', {'params':{'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  var getCategories = function(){
    return $http.get('/search/get_categories', {'params':{'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  var getPossibleDagrs = function(searchTerm){
    return $http.get('/search/get_possible_dagrs', {'params':{'term':searchTerm, 'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  var getPossibleParents = function(searchTerm, dagrID){
    return $http.get('/search/get_possible_parents', {'params':{'term':searchTerm,'id':dagrID, 'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  var getPossibleChildren = function(searchTerm, dagrID){
    return $http.get('/search/get_possible_children', {'params':{'term':searchTerm,'id':dagrID, 'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  var getPossibleKeywords = function(searchTerm, dagrID){
    return $http.get('/search/get_possible_keywords', {'params':{'term':searchTerm,'id':dagrID, 'user':User.getUser()}} ).then(function(response){
      return response.data;
    });
  };

  return {
    all:all,
    allDagrs: allDagrs,
    getDagr: getDagr,
    allMedia: allMedia,
    getCategories: getCategories,
    getPossibleParents: getPossibleParents,
    getPossibleChildren: getPossibleChildren,
    getPossibleKeywords: getPossibleKeywords,
    getPossibleDagrs: getPossibleDagrs
  };
})

.service('Update', function($http) {

  var dagrInfo = function(params){
    return $http.post('/update/dagr', params).then(function(response){
      return response.data;
    });
  };

  return {
    dagrInfo: dagrInfo
  };
})

.service('Delete', function($http) {

  var removeDagr = function(dagrId){
    return $http.post('/delete/remove_dagr', {'id': dagrId}).then(function(response){
      return response.data;
    });
  };

  var removeMedia = function(mediaId, dagrId){
    return $http.post('/delete/remove_media', {'mId':mediaId, 'dId': dagrId}).then(function(response){
      return response.data;
    });
  };

  var removeParent = function(parentId, childId){
    return $http.post('/delete/remove_parent', {'pID': parentId, 'cID': childId}).then(function(response){
      return response.data;
    });
  };

  var removeKeyword = function(keyword, dagrId){
    return $http.post('/delete/remove_keyword', {'keyword': keyword, 'id': dagrId}).then(function(response){
      return response.data;
    });
  };

  return {
    removeDagr: removeDagr,
    removeMedia: removeMedia,
    removeParent: removeParent,
    removeKeyword: removeKeyword
  };
});