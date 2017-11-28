angular.module('mmda', ['ngMaterial', 'ui.router'])

.constant('User', 'dummy')

.constant('Proxy', 'https://unlimited-cors.herokuapp.com/')

.constant('Categories', {
  'link':'link',
  'image':'photo',
  'audio':'music_note',
  'pdf':'picture_as_pdf',
  'text':'library_books',
  'video':'theaters',
  'other':'insert_drive_file'
})

.config(function($mdThemingProvider, $sceDelegateProvider, $httpProvider, $locationProvider) {
  // $locationProvider.html5Mode(true);

  $mdThemingProvider.theme('default')
    .primaryPalette('brown')
    .backgroundPalette('brown')
    .accentPalette('blue');
    
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