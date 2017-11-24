angular.module('mmda', ['ngMaterial', 'ui.router'])

.constant('User', 'dummy')

.constant('Categories', {
  'link':'link',
  'image':'photo',
  'audio':'music_note',
  'pdf':'picture_as_pdf',
  'text':'library_books',
  'video':'theaters',
  'other':'insert_drive_file'
})

.config(function($mdThemingProvider, $sceDelegateProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('brown')
    .backgroundPalette('brown')
    .accentPalette('blue');
    
    $sceDelegateProvider.resourceUrlWhitelist(["**"]);
});