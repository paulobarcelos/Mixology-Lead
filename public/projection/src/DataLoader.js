define(
[
	'happy/utils/ajax',

	'happy/_libs/mout/array/forEach',
	'happy/_libs/mout/object/mixIn',
	'happy/_libs/signals'
],
function (
	ajax,

	forEach,
	mixIn,

	Signal
){
	var DataLoader = function(options){
		var 
		self = this,
		defaults = {
			api : 'http://mixology.org/api/',
			flavors : 'flavors',
			combinations : 'combinations'
		},
		settings,
		flavors,
		combinations,
		latestCombinations,
		flavorsLoadedSignal,
		combinationsUpdatedSignal;

		var init = function(){
			settings = mixIn({}, defaults, options);
			flavors = [];
			combinations = [];;
			flavorsLoadedSignal = new Signal();
			combinationsUpdatedSignal = new Signal();
		}

		var load = function(){

			var flavorsData = localStorage.getItem('flavors'); 
			if(flavorsData) onFlavorsDataAcquired.apply(self, [flavorsData]);
			else loadFlavorsData();
		}
		var loadFlavorsData = function(){
			ajax({
				url: settings.api + settings.flavors + '?'+ (new Date()).getTime(),
				method: 'GET',
				onSuccess: function(request){
					onFlavorsDataAcquired(request.responseText);
				},
				onError: function(){
					console.log('Error getting flavors from server.')
					setTimeout(loadFlavorsData, 5000);
				}
			});
		}
		var onFlavorsDataAcquired = function(data){
			localStorage.setItem('flavors', data); 
			flavors = JSON.parse(data);
			flavorsLoadedSignal.dispatch(self);
			fetchCombinations();
		}
		var fetchCombinations = function(){
			var query = {
				cacheBuster: (new Date()).getTime()
			}

			if(combinations.length){
				query.search = {
					created: {
						$gt: combinations[combinations.length-1].created
					}
				}
			}
			query.sort = { created: 1};
			var queryString = '?';
			for(key in query){
				queryString +=  key + '=' + encodeURIComponent(JSON.stringify(query[key])) + '&';
			}

			ajax({
				url: settings.api + settings.combinations + queryString,
				method: 'GET',
				onSuccess: function(request){
					parseCombinations(request.responseText);
					setTimeout(fetchCombinations, 10000);
					
				},
				onError: function(){
					console.log('Error getting combinations from server.');
					setTimeout(fetchCombinations, 10000);
					
				}
			});
		}
		var parseCombinations = function(json){
			var newCombinations = JSON.parse(json);
			if(!newCombinations.length) return

			latestCombinations = newCombinations;
			combinations = combinations.concat(latestCombinations)

			combinationsUpdatedSignal.dispatch(self);
		}

		var getFlavors = function(){
			return flavors;
		}
		var getCombinations = function(){
			return combinations.slice(0);
		}
		var getLatestCombinations = function(){
			return latestCombinations;
		}
		var getFlavorsLoadedSignal = function(){
			return flavorsLoadedSignal;
		}
		var getCombinationsUpdatedSignal = function(){
			return combinationsUpdatedSignal;
		}

		Object.defineProperty(self, 'init', {
			value: init
		});
		Object.defineProperty(self, 'load', {
			value: load
		});
		Object.defineProperty(self, 'flavors', {
			get: getFlavors
		});
		Object.defineProperty(self, 'combinations', {
			get: getCombinations
		});
		Object.defineProperty(self, 'latestCombinations', {
			get: getLatestCombinations
		});
		Object.defineProperty(self, 'flavorsLoadedSignal', {
			get: getFlavorsLoadedSignal
		});
		Object.defineProperty(self, 'combinationsUpdatedSignal', {
			get: getCombinationsUpdatedSignal
		});

		init();
	}
	return DataLoader;
});