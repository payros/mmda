angular.module('mmda')

/////// SERVICES ///////
.service ('User', function(){
  var user = localStorage.user || '';

  var getUser = function(){
    return user;
  };

  var setUser = function(newUser){
    user = newUser;
  };

  return {
    getUser:getUser,
    setUser:setUser
  }
})

.service('Create', function($http, User) {

  var addMedia = function(media, dagrID){
    var params = {'user':User.getUser(), 'media':media};
    if(dagrID) params['dagrID'] = dagrID;

    return $http.post('/create/add_media', params ).then(function(response){
      return response.data;
    });
  };

  return {
    addMedia: addMedia
  };
})

.service('Search', function($http, User) {

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

  return {
    allDagrs: allDagrs,
    getDagr: getDagr,
    allMedia: allMedia,
    getCategories:getCategories
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
});