angular.module('mmda')

.filter('capitalize', function() {
  return function(input) {
    if (!input) return input;
    input = input.toLowerCase();
    return input.substring(0,1).toUpperCase()+input.substring(1);
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
});