angular.module('mmda')

.filter('capitalize', function() {
  return function(input) {
    if (!input) return input;
    input = input.toLowerCase();
    return input.substring(0,1).toUpperCase()+input.substring(1);
  }
})

.filter('uppercase', function() {
  return function(input) {
    if (!input) return input;
    return input.toUpperCase();
  }
})

.filter('percent', function() {
  return function(input) {
  	var multiplier = 20;
      if(input === 0) return 0;
    var percent = (input*100)/(multiplier*4);
    return percent > 100 ? 100 : Math.round(percent);
  };
})

.filter('ordinal', function() {
  return function(input) {
      if(input === 0) return '0';
      if(input % 10 === 1) return input + 'st';
      if(input % 10 === 2) return input + 'nd';
      if(input % 10 === 3) return input + 'rd';
      return input + 'th';
  };
})

.filter('time', function() {
  return function(input) {
  	if(isNaN(input) || input  < 1) return '00:00';
  	var seconds = Math.round(input);
  	if(seconds === 0) return '00:00';
  	var minutes = Math.floor(seconds/60);
  	seconds = seconds%60;
  	return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
  };
})

.filter('normalizePath', function($sce, Proxy) {
  return function(input) {
    if (!input) return input;
    if(input.indexOf("http://") > -1) {
      var uri = input;
    } else {
      var uri =  '/local-files/' + input.replace(/^[A-Z]:\\/, "");
    }
    return $sce.trustAsResourceUrl(uri);
  }
})

.filter('catIcon', function(){
  return function(input) {
    switch(input) {
      case 'html':
        return 'web';
      case 'image':
        return 'photo';
      case 'audio':
        return 'music_note';
      case 'pdf':
        return 'picture_as_pdf';
      case 'text':
        return 'library_books';
      case 'video':
        return 'theaters';
      case 'other':
        return 'insert_drive_file';
      default:
        return input;
    }
  }
})

.filter('isIframe', function(){
  return function(input) {
  if (!input) return false;
    return input === 'link' || input === 'html' || input === 'pdf' || input === 'code' || input === 'text';
  }
})

.filter('frameWidth', function(){
  return function(input) {
    switch(input) {
      case 'pdf':
        return 'full-width';
      case 'text':
      case 'code':
        return 'half-width';
      default:
        return '';
    }
  }
});
