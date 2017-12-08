angular.module("mmda")

.directive('iframeOnload', [function(){
return {
    scope: {
        callBack: '&iframeOnload'
    },
    link: function(scope, element, attrs){
        element.on('load', function(){
            return scope.callBack();
        })
    }
}}])



.directive('ngTree', function(){
return {
	restrict:'E',
	template: '<div class="tree-wrapper"><div id="parent-tree" class="dagr-tree"></div><div id="child-tree" class="dagr-tree"></div></div>',
	controller: 'treeCtrl',
    scope: {
        dagr: '=dagr',
        up: '=up',
        down: '=down',
    }
}});;