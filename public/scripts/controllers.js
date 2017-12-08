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

.controller("searchCtrl", function($scope, $rootScope, $mdDialog, $state, $stateParams) {
	$scope.$state = $state;
	$scope.data = {};
	$scope.minDate = localStorage.minDate ? new Date(parseInt(localStorage.minDate)) : new Date(parseInt(0));
	$scope.maxDate = localStorage.maxDate ? new Date(parseInt(localStorage.maxDate)) : new Date();
	$scope.minSize = localStorage.minSize ? parseInt(localStorage.minSize) : 0;
	$scope.maxSize = localStorage.maxSize ? parseInt(localStorage.maxSize) : 1000000000; //1 GB
	$scope.searchTypes = [
		{'label': 'Title', 'value':'title', 'checked':isDefault('title'), 'type':'all' },
		{'label': 'Tag', 'value':'keyword', 'checked':isDefault('keyword'), 'type':'all' },
		{'label': 'Create Date', 'value':'create_date', 'checked':isDefault('create_date'), 'type':'all' },
		{'label': 'Modify Date', 'value':'modify_date', 'checked':isDefault('modify_date'), 'type':'all' },

		{'label': 'Category', 'value':'category', 'checked':isDefault('category'), 'type':'dagr' },
		{'label': 'No Parents', 'value':'orphan', 'checked':isDefault('orphan'), 'type':'dagr' },
		{'label': 'No Children', 'value':'sterile', 'checked':isDefault('sterile'), 'type':'dagr' },

		{'label': 'Type', 'value':'type', 'checked':isDefault('type'), 'type':'media' },
		{'label': 'URI/Path', 'value':'uri', 'checked':isDefault('uri'), 'type':'media' },
		{'label': 'Description', 'value':'description', 'checked':isDefault('description'), 'type':'media' },
		{'label': 'Author', 'value':'author', 'checked':isDefault('author'), 'type':'media' },
		{'label': 'File Size', 'value':'file_size', 'checked':isDefault('file_size'), 'type':'media' },
		{'label': 'Reference Date', 'value':'reference_date', 'checked':isDefault('reference_date'), 'type':'media' },
		{'label': 'Insert Date', 'value':'insert_date', 'checked':isDefault('insert_date'), 'type':'media' },
	];

	function isDefault(filter){
		var defaultFilters = ['title', 'keyword', 'category', 'type', 'uri', 'description', 'author'];
		return defaultFilters.indexOf(filter) > -1;
	}

	$scope.isChecked = function(){
		console.log('go');
		for(var i=0; i<$scope.searchTypes.length; i++){
			if(isDefault($scope.searchTypes[i].value) && !$scope.searchTypes[i].checked) return false;
			if(!isDefault($scope.searchTypes[i].value) && $scope.searchTypes[i].checked) return false;
		}
		return true;
	};

	$scope.setDefault = function(isChecked){
		for(var i=0; i<$scope.searchTypes.length; i++){
			if(isChecked) {
				$scope.searchTypes[i].checked = isDefault($scope.searchTypes[i].value);			
			}
		}
	};

	$scope.search = function(){
		var params = {'q':$scope.data.query };
		if(!$scope.data.checkbox) {
			var filter = '';
			for(var i=0; i<$scope.searchTypes.length; i++){
				if($scope.searchTypes[i].checked) {
					filter += $scope.searchTypes[i].value + ',';

					switch($scope.searchTypes[i].value) {
						case 'create_date':
						case 'modify_date':
						case 'reference_date':
						case 'insert_date':
							params['minDate'] = $scope.minDate.getTime();
							params['maxDate'] = $scope.maxDate.getTime();
							break;

						case 'file_size':
							params['minSize'] = $scope.minSize;
							params['maxSize'] = $scope.maxSize;
					}
				}
			}

			if(filter.length) {
				params['filter'] = filter.substring(0, filter.length-1);
			}
		} else {
			params['filter'] = undefined;
			params['minDate'] = undefined;
			params['maxDate'] = undefined;							
			params['minSize'] = undefined;
			params['maxSize'] = undefined;
		}
		$state.go('search', params);
	};

	$scope.clearSearch = function(){
		$scope.data.query = '';
		$scope.search();
	};

	$scope.showSettings = function() {
		var settings = {
			'minDate': $scope.minDate,
			'maxDate': $scope.maxDate,
			'minSize': $scope.minSize,
			'maxSize': $scope.maxSize
		};

	    $mdDialog.show({
	    	locals: { Settings: settings },
	      	controller: 'filterSettingsCtrl',
	      	templateUrl: 'templates/filter-settings-dialog.html',
	      	clickOutsideToClose:true
	    }).then(function(newSettings){
	    	if(newSettings) {
	    		localStorage.minDate = newSettings.minDate.getTime();
	    		localStorage.maxDate = newSettings.maxDate.getTime();
	    		localStorage.minSize = newSettings.minSize;
	    		localStorage.maxSize - newSettings.maxSize;
	    		$scope.minDate = newSettings.minDate;
				$scope.maxDate = newSettings.maxDate;
				$scope.minSize = newSettings.minSize;
				$scope.maxSize = newSettings.maxSize;
				if($stateParams.filter) $scope.search();
	    	}
	    });
	};

	$rootScope.$on('$stateChangeSuccess', function () {
		//Set the search params based on the url

		if($stateParams.q) $scope.data.query = $stateParams.q;	
		if($stateParams.minDate) $scope.minDate = new Date(parseInt($stateParams.minDate));
		if($stateParams.maxDate) $scope.maxDate = new Date(parseInt($stateParams.maxDate));
		if($stateParams.minSize) $scope.minSize = parseInt($stateParams.minSize);
		if($stateParams.maxSize) $scope.maxSize = parseInt($stateParams.maxSize);
		if($stateParams.filter) {
			var filters = $stateParams.filter.split(",");
			angular.forEach($scope.searchTypes, function(type){
				type.checked = filters.indexOf(type.value) > -1;
			});
		}
		angular.element(document.getElementById('search-bar')).focus();
	});

	$scope.$on("$mdMenuClose", $scope.search);
})

.controller("resultsCtrl", function($rootScope, $scope, $window, $state, $stateParams, $mdDialog, Create, Search, Delete, Proxy, loader){
	$scope.$state = $state;
	$scope.proxy = Proxy;
	$scope.loader = loader;
	$scope.getParents = Search.getPossibleParents;
	$scope.getChildren = Search.getPossibleChildren;
	$scope.getKeywords = Search.getPossibleKeywords;
	$scope.showHierarchy = false;
	

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
		angular.element(document).find("md-grid-tile").removeClass('animate');
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

	function renderResults(results){
		renderDagrs(results.dagrs);
		renderMedia(results.media);
	}


	//When a new URL is loaded, get new data based on the URL
	$rootScope.$on('$stateChangeSuccess', function () {
		angular.element(document).find("md-grid-tile").removeClass('animate');
		angular.element(document).find("md-sidenav").removeClass('no-animate');
		$scope.state = $state.current.name;
		$scope.activeID = $stateParams.id;

		if($scope.state === 'dagr') {
			angular.element(document).find("md-sidenav").addClass('no-animate');
			//Load all DAGRS on sidenav
			Search.allDagrs().then(renderDagrs);
			//Load single DAGR on content div
			Search.getDagr($stateParams.id).then(renderDagr);
		} else if ($scope.state === 'search') {
			
			Search.all($stateParams).then(renderResults);
		} else {
			//Load all DAGRS on sidenav
			Search.allDagrs().then(renderDagrs);
			//Load all Media on content div
			Search.allMedia().then(renderMedia);
		} 
	});

	$scope.showIframes = function(){
		return false;
	}

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

	$scope.toggleHierarchy = function(){
		$rootScope.$broadcast('$stateChangeSuccess');
		$scope.showHierarchy = !$scope.showHierarchy;
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
		$mdDialog.hide();
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
		      	console.log('done');
		      	Create.addMedia($scope.media, dagrInfo).then(closePopup);
		      }).catch(function(){
		      	console.log('error');
		      	Create.addMedia($scope.media, dagrInfo).then(closePopup);
		      });
		    });
		} else {
			Create.addMedia($scope.media, dagrInfo).then(closePopup);
		}
	}

	function sanitizePath(path) {
		path = path.replace(/^https:\/\/www\./g, "");
		path = path.replace(/^http:\/\/www\./g, "");
		path = path.replace(/^www\./g, "");
		return path;
	}

	function addMetadata(media) {
		media.uri = sanitizePath(media.uri);
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
		if($scope.newCategory !== currentDagr.CATEGORY) params.category = $scope.categoryInput;
		Update.dagrInfo(params).then(function(){
			$mdDialog.hide();
			$rootScope.$broadcast('$stateChangeSuccess');
		});
	};
})

.controller("treeCtrl", function($rootScope, $scope, $stateParams, $timeout, Search){
	var parentTreeChart, childTreeChart;

	function adjustTree(el){
		var tree = document.querySelector(el.CONFIG.container);
		var treeWidth = document.querySelector('.tree-wrapper').offsetWidth;
		var rootNode = document.querySelector(el.CONFIG.container + ' .node:last-child');
		var nodeCenter = parseInt(rootNode.style.left) + (rootNode.offsetWidth/2);
		var treeOffset = treeWidth/2 - nodeCenter;
		tree.style.left = treeOffset + "px";
	}

	function redrawTree(){
		Search.getReach(2, 2,  $stateParams.id).then(function(nodes){
			var parentTree = {
			    chart: {
			        container: "#parent-tree",
			        drawLineThrough:true,
			        // hideRootNode:true,
			        connectors: {
			        	type:'step'
			        },
			        rootOrientation:"SOUTH"
			    },
			    
			    nodeStructure: nodes.parents
			};

			var childTree = {
			    chart: {
			        container: "#child-tree",
			        drawLineThrough:true,
			        connectors: {
			        	type:'step'
			        },
			        rootOrientation:"NORTH"
			    },
			    
			    nodeStructure: nodes.children
			};

			$timeout(function(){
				if(parentTreeChart) parentTreeChart.destroy();
				parentTree.nodeStructure.text = {name:$scope.dagr.NAME, title:$scope.dagr.CATEGORY};
				console.log(parentTree.nodeStructure);
				parentTreeChart = new Treant(parentTree, adjustTree);

				if(childTreeChart) childTreeChart.destroy();
				childTree.nodeStructure.text = {name:$scope.dagr.NAME, title:$scope.dagr.CATEGORY};
				console.log(childTree.nodeStructure);
				childTreeChart = new Treant(childTree, adjustTree);
			});
		});	
	}

	//Call it for the first time
	redrawTree();

	$rootScope.$on('$stateChangeSuccess', redrawTree);
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

.controller("filterSettingsCtrl", function($scope, $mdDialog, Settings){
	$scope.close = $mdDialog.hide;
	$scope.settings = Settings;
	$scope.invalidInfo = function(){
		var invalid = false;
		invalid = invalid || !$scope.settings.minDate || typeof $scope.settings.minDate.getMonth !== 'function';
		invalid = invalid || !$scope.settings.maxDate || typeof $scope.settings.maxDate.getMonth !== 'function';
		invalid = invalid || isNaN($scope.settings.minSize);
		invalid = invalid || isNaN($scope.settings.maxSize);

		return invalid;
	};

	$scope.defaultSettings = function(){
		$scope.settings.minDate = new Date(parseInt(0));
		$scope.settings.maxDate = new Date();
		$scope.settings.minSize = 0;
		$scope.settings.maxSize = 1000000000; //1 GB
	};
})

.controller("mediaDetailsCtrl", function($rootScope, $scope, $stateParams, $mdDialog, Delete, Media){
	$scope.media = Media;
	$scope.showFrame = false;
	$scope.cancel = $mdDialog.hide;
	$scope.activeID = $stateParams.id;

	$scope.showFrameNow = function(){
		console.log('test test test');
	};

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

