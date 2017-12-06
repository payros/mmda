angular.module('mmda')

.config(function($stateProvider, $urlRouterProvider, $locationProvider) {

   // use the HTML5 History API
   //$locationProvider.html5Mode(true);


  $stateProvider


  .state('home', {
    url: '/'
  })

  .state('dagr', {
    url: '/dagr/:id'
  })

    .state('search', {
    url: '/search?q&filter&minDate&maxDate&minSize&maxSize'
  })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/');

});