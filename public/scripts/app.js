angular.module('mmda', ['ngMaterial'])

.constant('User', 'dummy')

.config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('brown')
    .backgroundPalette('brown')
    .accentPalette('deep-purple');
    
});