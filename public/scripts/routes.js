angular.module('mmda')

.config(function($stateProvider, $urlRouterProvider, $locationProvider) {

   // use the HTML5 History API
   //$locationProvider.html5Mode(true);


  $stateProvider


  .state('home', {
    url: '/'
    // views: {
    //   'sidenav': {
    //     templateUrl: 'templates/dagrs.html',
    //     controller: 'dagrCtrl'
    //   },
    //   'content': {
    //     templateUrl: 'templates/media.html',
    //     controller: 'mediaCtrl'      
    //   }
    // }
  })

  .state('dagr', {
    url: '/dagr/:id'
  });

  // if none of the above states are matched, use this as the fallback
  // $urlRouterProvider.otherwise('/');

});