angular.module('mmda')

/////// SERVICES ///////
.service('Create', function($http, User) {

  var addMedia = function(media, dagrID){
    var params = {'user':User, 'media':media};
    if(dagrID) params['dagrID'] = dagrID;

    return $http.post('/create/add_media', params ).then(function(response){
      console.log(response.data);
      return response.data;
    });
  };

  return {
    addMedia: addMedia
  };
});