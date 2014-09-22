define(
[
	'happy/app/BaseApp',

	'happy/utils/ajax',
	'happy/utils/browser',
	'happy/utils/dom',

	'happy/_libs/mout/array/forEach',

	'CombinationSelector',
	'RatingSelector',
	'CommentSelector',
	'EndScreen'
],
function (
	BaseApp,

	ajax,
	browser,
	dom,

	forEach,

	CombinationSelector,
	RatingSelector,
	CommentSelector,
	EndScreen
){
	var App = function(){
		var 
		self = this,
		user,
		flavors,
		combinationSelector,
		ratingSelector,
		endScreen,
		commentSelector,
		host = "http://mixology.eu01.aws.af.cm/";

		var setup = function(){	
			self.setFPS(0);

			var titleNode = document.createElement('h1');
			titleNode.innerHTML = "Mytilus Edulis";
			self.container.appendChild(titleNode);

			loadFlavorsData();

			window.addEventListener("load", hideAddressBar );
			window.addEventListener("orientationchange", hideAddressBar );
			hideAddressBar();
		}

		var loadFlavorsData = function(){
			ajax({
				url: host + 'api/flavors' + '?'+ (new Date()).getTime(),
				method: 'GET',
				onSuccess: function(request){
					onFlavorsDataAcquired(request.responseText);
				},
				onError: function(){
					console.log('Error getting flavors from server.')
					setTimeout(loadFlavorsData, 2000);
				}
			});
		}

		var onFlavorsDataAcquired = function(data){
			flavors = JSON.parse(data);
			init();
		}
		
		var init = function(){
			combinationSelector = new CombinationSelector(flavors);
			combinationSelector.groupChangedSignal.add(onFlavorGroupChanged);
			self.container.appendChild(combinationSelector.node);

			ratingSelector = new RatingSelector();
			self.container.appendChild(ratingSelector.node);

			commentSelector = new CommentSelector();
			self.container.appendChild(commentSelector.node);
			commentSelector.sendSignal.add(onSend);

			endScreen = new EndScreen(self.container);

		}

		var onFlavorGroupChanged = function (combinationSelector) {
			combinationSelector.reset();
			ratingSelector.reset();
			commentSelector.reset();
		}

		var onSend = function (commentSelector) {
			if(combinationSelector.selected.length < 3){
				alert("You haven't to selected the ingredients.");
			}
			else if(!ratingSelector.value){
				alert("Please rate your combination.");
			}
			else if(!commentSelector.value){
				alert("Please write your opinion.");
			}
			else onComplete();
		}

		var onComplete = function() {
			combinationSelector.reset();
			ratingSelector.reset();
			commentSelector.reset();
			hideAddressBar();
			endScreen.go(ratingSelector.value);
		}

		var hideAddressBar = function (){
			if(document.height <= window.outerHeight + 10) {
				setTimeout( function(){ window.scrollTo(0, 1); }, 50 );
			}
			else {
				setTimeout( function(){ window.scrollTo(0, 1); }, 0 );
			}
		}

		self.setup = setup;
	}
	App.prototype = new BaseApp();
	return App;
});