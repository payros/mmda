angular.module('mmda')

/////// SERVICES ///////
.service('Create', function($http, User) {

  var addMedia = function(media, dagrID){
    var params = {'user':User, 'media':media};
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
    return $http.get('/search/all_dagrs', {'params':{'user':User}} ).then(function(response){
      return response.data;
    });
  };

  var getDagr = function(id){
    return $http.get('/search/get_dagr', {'params':{'id':id}} ).then(function(response){
      return response.data;
    });
  };

  var allMedia = function(){
    return $http.get('/search/all_media', {'params':{'user':User}} ).then(function(response){
      return response.data;
    });
  };

  return {
    allDagrs: allDagrs,
    getDagr: getDagr,
    allMedia: allMedia
  };
});