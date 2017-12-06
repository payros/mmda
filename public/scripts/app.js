angular.module('mmda', ['ngSanitize', 'ngAnimate', 'ngMaterial', 'ui.router', 'ngFilesizeFilter'])

.constant('Proxy', 'https://unlimited-cors.herokuapp.com/')

//Global angular variables
.value('loader', {
    loading: 0,
    error: false,
    errorMsg: "An Error Occurred"
})

.config(function($mdThemingProvider, $sceDelegateProvider, $httpProvider, $locationProvider) {
  // $locationProvider.html5Mode(true);

  $mdThemingProvider.theme('default')
    .primaryPalette('brown')
    .backgroundPalette('brown')
    .accentPalette('blue')
    .warnPalette('red');
    
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  $httpProvider.interceptors.push(function ($q, loader) {
      return {
          'request': function (request) {
              loader.loading++;
              return request;
          },
          'response': function (response) {
              loader.loading--;
              return response;
          },
          'responseError': function (errorResponse) {
              loader.loading--;
              loader.error = true;
              return $q.reject(errorResponse);
          }

      };
  });

  $sceDelegateProvider.resourceUrlWhitelist(["**"]);
});


// HELPER FUNCTIONS

function getByValue(arr, prop, value) {
  for (var i=0; i<arr.length; i++) {
    if (arr[i][prop] == value) return arr[i];
  }
}