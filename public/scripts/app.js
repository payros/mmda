angular.module('mmda', ['ngSanitize','ngMaterial', 'ui.router', 'ngFilesizeFilter'])

.constant('Proxy', 'https://unlimited-cors.herokuapp.com/')

.config(function($mdThemingProvider, $sceDelegateProvider, $httpProvider, $locationProvider) {
  // $locationProvider.html5Mode(true);

  $mdThemingProvider.theme('default')
    .primaryPalette('brown')
    .backgroundPalette('brown')
    .accentPalette('blue')
    .warnPalette('red');
    
  // $httpProvider.interceptors.push(function() {
  //   return {
  //    'request': function(config) {
  //       config.headers['X-Requested-With'] = "XMLHttpRequest";
  //       return config;
  //     }
  //   };
  // });

  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

  $sceDelegateProvider.resourceUrlWhitelist(["**"]);
});