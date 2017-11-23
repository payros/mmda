angular.module("mmda")

.controller("mainCtrl", function() {})

.controller("headerCtrl", function($scope, $mdDialog) {
	  $scope.newDagr = function(ev) {
	    $mdDialog.show({
	      controller: 'newDagrCtrl',
	      templateUrl: 'templates/new-dagr-dialog.html',
	      clickOutsideToClose:true
	    });
	  };
})

.controller("searchCtrl", function($scope) {
	$scope.clearSearch = function(){
		$scope.searchInput = '';
	};
})

.controller("dagrCtrl", function($scope) {
	$scope.dagrs = [
		{'guid':123, 'title':'Rome', 'files':10, 'parents':5, 'children':10, 'created':'10-05-2017', 'category':'travel'},
		{'guid':124, 'title':'Japan', 'files':2, 'parents':0, 'children':0, 'created':'11-05-2017', 'category':'travel'},
		{'guid':125, 'title':'Rio de Janeiro', 'files':98, 'parents':6, 'children':5, 'created':'13-05-2017', 'category':'travel'},
		{'guid':126, 'title':'Australia', 'files':1, 'parents':0, 'children':12, 'created':'06-02-2017', 'category':'travel'},
		{'guid':127, 'title':'Olympics', 'files':103, 'parents':0, 'children':12, 'created':'10-04-2017', 'category':'sports'},
		{'guid':128, 'title':'NFL', 'files':13, 'parents':0, 'children':0, 'created':'09-05-2017', 'category':'sports'},
		{'guid':129, 'title':'World Cup', 'files':45, 'parents':0, 'children':6, 'created':'05-05-2014', 'category':'sports'},
		{'guid':130, 'title':'My music', 'files':103, 'parents':0, 'children':12, 'created':'10-04-2017', 'category':'music'},
		{'guid':131, 'title':'Other files', 'files':13, 'parents':0, 'children':0, 'created':'09-05-2017'},
		{'guid':132, 'title':'School work', 'files':45, 'parents':0, 'children':6, 'created':'05-05-2014'}
	];
	$scope.categories = [];
	angular.forEach($scope.dagrs, function(dagr){
		if(dagr.category && $scope.categories.indexOf(dagr.category) === -1)  $scope.categories.push(dagr.category);
	});
	$scope.categories.push('!');
})

.controller("mediaCtrl", function($scope, Categories) {
	$scope.catIcons = Categories;
	$scope.media = [
		{'guid':456, 'name':'The_Matrix', 'type':'video', 'uri':'/user/movies/The_Matrix.avi', 'author':'User1', 'created':'10-05-2017', 'size':'1.2 GB'},
		{'guid':457, 'name':'Inception', 'type':'video', 'uri':'/user/movies/Inception.mp4', 'author':'User1', 'created':'10-06-2017', 'size':'800 MB'},
		{'guid':458, 'name':'SQL_A', 'type':'text', 'uri':'/user/homework/SQL_A.sql', 'author':'User1', 'created':'09-05-2017', 'size':'30 KB'},
		{'guid':459, 'name':'ABC.com', 'type':'link', 'uri':'http://abc.com', 'inserted':'10-05-2017', 'description':'Watch the ABC Shows online at abc.com. Get exclusive videos and free episodes.'},
		{'guid':460, 'name':'617A1781', 'type':'image', 'uri':'/Users/user1/Downloads/617A1781.jpg', 'author':'User1', 'created':'10-05-2017', 'size':'3.4 MB'},
		{'guid':460, 'name':'something.pdf', 'type':'pdf', 'uri':'/user/Documents/something.pdf', 'author':'User1', 'created':'10-05-2017', 'size':'3.4 MB'},
		{'guid':461, 'name':'something.pptx', 'type':'other', 'uri':'/user/Documents/something.pptx', 'author':'User1', 'created':'10-05-2017', 'size':'23 MB'}
	];
	$scope.types = [];
	angular.forEach($scope.media, function(media){
		if($scope.types.indexOf(media.type) === -1)  $scope.types.push(media.type);
	});
})

.controller("newDagrCtrl", function($scope, $http, $q, $mdDialog, Create) {
	var proxy = "https://cors-anywhere.herokuapp.com/";
	$scope.media = [{"type":"link"}];
	$scope.links = [];
	$scope.placeholders = {
		'link':'example.com',
		'file':'/path/to/file.eg',
		'folder':'/path/to/folder',
		'dagr':'DAGR title'
	};

	function addMetadata(media) {

		return $http.get(proxy + 'http://' + media.uri).then(function(resp){

			//If the page was loaded successfully, get the metadata
			if(resp.status == 200) {
				var pageContent = document.createElement('div');
				pageContent.innerHTML = resp.data;

				var page = angular.element(pageContent);
				var pageLinks = page.find('a');
				var pageMetas = page.find('meta');

				media.title = page.find('title').text();
				media.hash = SparkMD5.hash(media.title);

				//Loop through meta tags
				for(var i=0; i<pageMetas.length; i++) {
					var meta = pageMetas.eq(i)[0];

					switch(meta.name) {
						case 'description':
							media.description = meta.content;
							break;

						case 'keywords':
							media.keywords = meta.content.split(",").map(str => str.trim());
							break;

						case 'author':
							media.author = meta.content;
							break;
					}
				}

				//Loop through links tags
				for(var i=0; i<pageLinks.length; i++) {
					var link = pageLinks.eq(i).attr('href');
					if(link && link.match(/^http[s]*:\/\//g) && $scope.links.indexOf(link) == -1) {
						$scope.links.push(link);
					}
				}
			}

			return media;
		});
	}

	function addPath(media) {
	}

	$scope.cancel = $mdDialog.hide;

	$scope.create = function(){
		var promises = [];
		$scope.links = [];

		//Pull metadata for all links
		angular.forEach($scope.media, function(media, i){
			if(media.type === 'link') {
				promises.push(addMetadata(media).then(function(newMedia){
					$scope.media[i] = newMedia;
				}));
			}
		});

		$q.all(promises).then(function(){
			//TO DO Prompt the user to add all extra links to the DAGR
			console.log($scope.links);

			Create.addMedia($scope.media);
			console.log($scope.media);
			
		});
	};



    
});