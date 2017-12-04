angular.module("mmda")

.controller("mainCtrl", function() {})

.controller("headerCtrl", function($state, $scope, $mdDialog, User) {
	$scope.user = User;

	$scope.newUser = function(ev) {
	    var confirm = $mdDialog.prompt({onComplete: function() {
                        angular.element(document.querySelector("button[ng-click='dialog.hide()']")).addClass('md-raised md-accent');
                        angular.element(document.querySelector("button[ng-click='dialog.abort()']")).addClass('md-raised');
                    }})
	      .title('New Username')
	      .textContent('Please enter a username for the account')
	      .placeholder('Username')
	      .ariaLabel('Username')
	      .initialValue(User.getUser())
	      .required(true)
	      .ok('OK')
	      .cancel('Cancel');

	    $mdDialog.show(confirm).then(function(result) {
	      if(result === ''){
	      	$scope.newUser();
	      } else {
	      	User.setUser(result);
	      	$state.go('home', {}, {reload: true});
	      } 
	      
	    }, function() {
	      if(User.getUser() === '') $scope.newUser();
	    });
	};

	if(User.getUser() === '') $scope.newUser();
})

.controller("searchCtrl", function($scope) {
	$scope.clearSearch = function(){
		$scope.searchInput = '';
	};
})

.controller("resultsCtrl", function($rootScope, $scope, $state, $stateParams, $mdDialog, Create, Search, Delete, Proxy){
	$scope.$state = $state;
	$scope.proxy = Proxy;
	$scope.getParents = Search.getPossibleParents;
	$scope.getChildren = Search.getPossibleChildren;
	$scope.getKeywords = Search.getPossibleKeywords;

	function renderDagrs(dagrs){
		$scope.dagrs = dagrs;
		$scope.categories = [];
		angular.forEach(dagrs, function(dagr){
			if(dagr.CATEGORY && $scope.categories.indexOf(dagr.CATEGORY) === -1)  $scope.categories.push(dagr.CATEGORY);
		});
		//'!' stands for uncategorized DAGRS
		$scope.categories.push('!');
	}

	function renderDagr(dagr){
		$scope.dagr = dagr.info;
		$scope.parents = dagr.parents;
		$scope.children = dagr.children;
		$scope.keywords = dagr.keywords;
		renderMedia(dagr.media);
	}

	function renderMedia(media){
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
	}




	//When a new URL is loaded, get new data based on the URL
	$rootScope.$on('$stateChangeSuccess', function () {
		$scope.state = $state.current.name;
		$scope.activeID = $stateParams.id;

		if($scope.state === 'dagr') {
			//Load all DAGRS on sidenav
			Search.allDagrs().then(renderDagrs);
			//Load single DAGR on content div
			Search.getDagr($stateParams.id).then(renderDagr);
		} else if ($scope.state === 'search') {
			//Load DAGR search results on sidenav
			Search.getDagrs(params).then(renderDagrs);
			//Load Media search results on content div
			Search.media(params).then(renderMedia);
		} else {
			//Load all DAGRS on sidenav
			Search.allDagrs().then(renderDagrs);
			//Load all Media on content div
			Search.allMedia().then(renderMedia);
		} 
	});

	$scope.saveParent = function(dagr){
		//TO DO remove chip if transaction fails
		Create.addParent(dagr.GUID, $stateParams.id);
	};

	$scope.saveChild = function(dagr){
		//TO DO remove chip if transaction fails
		Create.addParent($stateParams.id, dagr.GUID);
	};

	$scope.removeParent = function(dagr){
		Delete.removeParent(dagr.GUID, $stateParams.id);
	};

	$scope.removeChild = function(dagr){
		Delete.removeParent($stateParams.id, dagr.GUID);
	};

	$scope.transformKeyword = function(chip){
		return typeof chip === "string" ?  {'KEYWORD':chip} : chip;
	}

	$scope.saveKeyword = function(chip){
		//TO DO remove chip if transaction fails
		Create.addKeyword(chip.KEYWORD, $stateParams.id);
	};

	$scope.removeKeyword = function(chip){
		Delete.removeKeyword(chip.KEYWORD, $stateParams.id);
	};

	$scope.deleteDagr = function(){
	    var confirm = $mdDialog.confirm({onComplete: function() {
                        angular.element(document.querySelector("button[ng-click='dialog.hide()']")).addClass('md-raised md-warn');
                        angular.element(document.querySelector("button[ng-click='dialog.abort()']")).addClass('md-raised');
                    }})
	      .title('Delete DAGR?')
	      .textContent('You will lose all media references. This action is irreversible')
	      .ariaLabel('Confirm DAGR Deletion')
	      .ok('Delete')
	      .cancel('Cancel');

		$mdDialog.show(confirm).then(function(){
			Delete.removeDagr($stateParams.id).then(function(){
				$state.go('home');
			});
		});
	};

	$scope.showMedia = function(ev, media) {
		$mdDialog.show({
		  locals:{Media:media},
		  controller: 'mediaDetailsCtrl',
		  templateUrl: 'templates/media-dialog.html',
		  openFrom:ev.currentTarget,
		  closeTo:ev.currentTarget,
		  clickOutsideToClose:true
		});
	};

	$scope.editDagr = function(formType) {
	    $mdDialog.show({
	    	locals: {currentDagr: $scope.dagr || null, formType:formType},
	      	controller: 'editDagrCtrl',
	      	templateUrl: 'templates/edit-dagr-dialog.html',
	      	clickOutsideToClose:true
	    });
	};

	$scope.toggleVideo = function(ev, vidID){
		ev.stopPropagation();
		var video = document.getElementById(vidID);

		if(video.paused) {
			video.play();
		} else {
			video.pause();
		}

		return video.paused;	
	};
})

.controller("editDagrCtrl", function($rootScope, $scope, $state, $http, $q, $mdDialog, currentDagr, formType, Create, Search, Update, Proxy) {
	$scope.cancel = $mdDialog.hide;
	$scope.formType = formType;
	$scope.categories = Search.getCategories;
	$scope.getDagrs = Search.getPossibleDagrs;
	$scope.media = [{"type":"link"}];
	$scope.links = [];

	var isNew = formType === 'new';

	$scope.placeholders = {
		'link':'example.com',
		'file':'/path/to/file.eg',
		'folder':'/path/to/folder',
		'dagr':'DAGR title'
	};

	$scope.dialogTitle = {
		'new': 'New DAGR',
		'edit': 'Edit DAGR',
		'add': 'Add Media'
	};

	if(formType === 'edit' && currentDagr) {
		$scope.newTitle = currentDagr.NAME;
		$scope.newCategory = currentDagr.CATEGORY;
	}

	function closePopup(dagrID){
		if(isNew) {
			$state.go('dagr', {'id':dagrID});
		} else {
			$rootScope.$broadcast('$stateChangeSuccess');
		}
	}

	function saveMedia(){
		console.log($scope.links);
		var dagrInfo = {};
		if($scope.newTitle) dagrInfo.title = $scope.newTitle;
		if($scope.categoryInput) dagrInfo.category = $scope.categoryInput;
		if(!isNew) dagrInfo.id = currentDagr.GUID;

		if($scope.links.length) {
			$mdDialog.show({
			  locals: { Links : $scope.links },
		      controller: 'addLinksCtrl',
		      templateUrl: 'templates/add-links-dialog.html',
		      clickOutsideToClose:true,
		    })
		    .then(function(extraLinks) {
		      var p = [];

		      //If there are links to add, gather the metadata for those links and include
		      if(extraLinks) {
		      	var extraLinks = extraLinks.map(function(l){return { 'type':'link', 'uri': l.replace(/^http[s]*:\/\//g, "") };});
		      	console.log(extraLinks);
				//Pull metadata for all links
				angular.forEach(extraLinks, function(media, i){
					p.push(addMetadata(media).then(function(newMedia){
						$scope.media.push(newMedia);
					}));
				});
		      }

		      //All metadata has been gathered
		      $q.all(p).then(function(){
		      	Create.addMedia($scope.media, dagrInfo).then(closePopup);
		      });
		    });
		} else {
			Create.addMedia($scope.media, dagrInfo).then(closePopup);
		}
	}

	function addMetadata(media) {

		return $http.get(Proxy + 'http://' + media.uri).then(function(resp){

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

	$scope.add = function(){
		var promises = [];
		$scope.links = [];

		//Pull metadata for all links
		angular.forEach($scope.media, function(media, i){
			if(media.type === 'link') {
				promises.push(addMetadata(media).then(function(newMedia){
					$scope.media[i] = newMedia;
				}));
			}

			if(media.type === 'dagr') {
				media.id = media.selectedDagr.GUID;
			}
		});

		$q.all(promises).then(saveMedia).catch(saveMedia);
	};

	$scope.invalidMedia = function(){
		return $scope.media.reduce((invalid, m) => invalid || ( m.type === 'dagr' && !m.selectedDagr ) || (m.type !== 'dagr' && !m.uri), false );		
	};

	$scope.save = function(){
		var params = {'id':currentDagr.GUID};
		if($scope.newTitle && $scope.newTitle !== currentDagr.NAME) params.name = $scope.newTitle;
		if($scope.categoryInput && $scope.categoryInput !== currentDagr.CATEGORY) params.category = $scope.categoryInput;
		Update.dagrInfo(params).then(function(){
			$mdDialog.hide();
			$rootScope.$broadcast('$stateChangeSuccess');
		});
	};
})

.controller("addLinksCtrl", function($scope, $mdDialog, Links){
	$scope.close = $mdDialog.hide;
	$scope.links = Links;
	$scope.selected = [];

	  $scope.toggle = function (item, list) {
	    var idx = list.indexOf(item);
	    if (idx > -1) {
	      list.splice(idx, 1);
	    }
	    else {
	      list.push(item);
	    }
	  };

	  $scope.exists = function (item, list) {
	    return list.indexOf(item) > -1;
	  };

	  $scope.isIndeterminate = function() {
	    return ($scope.selected.length !== 0 &&
	        $scope.selected.length !== $scope.links.length);
	  };

	  $scope.isChecked = function() {
	    return $scope.selected.length === $scope.links.length;
	  };

	  $scope.toggleAll = function() {
	    if ($scope.selected.length === $scope.links.length) {
	      $scope.selected = [];
	    } else if ($scope.selected.length === 0 || $scope.selected.length > 0) {
	      $scope.selected = $scope.links.slice(0);
	    }
	  };
})


.controller("mediaDetailsCtrl", function($rootScope, $scope, $stateParams, $mdDialog, Delete, Media){
	$scope.media = Media;
	$scope.cancel = $mdDialog.hide;
	$scope.activeID = $stateParams.id;

	$scope.removeMedia = function(){
	    var confirm = $mdDialog.confirm({onComplete: function() {
                        angular.element(document.querySelector("button[ng-click='dialog.hide()']")).addClass('md-raised md-warn');
                        angular.element(document.querySelector("button[ng-click='dialog.abort()']")).addClass('md-raised');
                    }})
	      .title('Remove Media?')
	      .htmlContent('<strong>' + Media.NAME + '</strong><br> will be unlinked from the current DAGR')
	      .ariaLabel('Confirm Media Removal')
	      .ok('Remove')
	      .cancel('Cancel');

		$mdDialog.show(confirm).then(function(){
			Delete.removeMedia($scope.media.GUID, $stateParams.id).then(function(){
				$rootScope.$broadcast('$stateChangeSuccess');
			});
		});
	};
});