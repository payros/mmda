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

.controller("dagrCtrl", function($scope, Search) {
	Search.allDagrs().then(function(dagrs){
		$scope.dagrs = dagrs;
		$scope.categories = [];
		angular.forEach(dagrs, function(dagr){
			if(dagr.CATEGORY && $scope.categories.indexOf(dagr.CATEGORY) === -1)  $scope.categories.push(dagr.CATEGORY);
		});
		//'!' stands for uncategorized DAGRS
		$scope.categories.push('!');
	});
})

.controller("mediaCtrl", function($scope, Categories, Search) {
	$scope.catIcons = Categories;
	Search.allMedia().then(function(media){
		$scope.media = media;
		$scope.types = [];
		angular.forEach($scope.media, function(m){
			if($scope.types.indexOf(m.TYPE) === -1)  $scope.types.push(m.TYPE);
		});
		var otherIdx = $scope.types.indexOf('other');
		//Put the 'Other' type at the end
		if(otherIdx > -1) {
			$scope.types.splice(otherIdx, 1);
			$scope.types.push('other');
		}
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

			Create.addMedia($scope.media).then(function(){
				//TO DO show error or refresh page
				$mdDialog.hide();
			});
			console.log($scope.media);
			
		});
	};



    
});