define(
[
	'happy/app/BaseApp',

	'happy/utils/ajax',

	'CombinationPublisher'
],
function (
	BaseApp,

	ajax,

	CombinationPublisher
){
	var App = function(){
		var 
		self = this,
		user,
		flavors,
		flavorsIds,
		combinationPublisher,
		host = "http://mixology.eu01.aws.af.cm/";
		//host = "http://127.0.0.1:8000/";

		var setup = function(){	
			self.setFPS(0);


			var dropcache = (window.location.search.indexOf('dropcache')!=-1);
			if(dropcache){
				localStorage.removeItem('user'); 
				localStorage.removeItem('flavors'); 
			}

			var userData = localStorage.getItem('user'); 
			if(userData) onUserDataAcquired(userData);
			else loadUserData();

			var flavorsData = localStorage.getItem('flavors'); 
			if(flavorsData) onFlavorsDataAcquired(flavorsData);
			else loadFlavorsData();

		}

		var loadUserData = function(){
			var data = {
				browser: 'BOT'
			}			

			$.ajax({
				url: host + 'api/users',
				type: "POST",
				dataType: 'json',
				contentType: 'application/json',
				async: true,
				data: JSON.stringify(data),
				success: function(reponse){
					onUserDataAcquired(JSON.stringify(reponse));
				},
				error: function(){
					console.log('Error getting user from server.')
					setTimeout(loadUserData, 2000);
				}
			})
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

		var onUserDataAcquired = function(data){
			localStorage.setItem('user', data); 
			user = JSON.parse(data);
			if(flavors) init();
		}
		var onFlavorsDataAcquired = function(data){
			localStorage.setItem('flavors', data); 
			flavors = JSON.parse(data);
			flavorsIds = [];
			flavors.forEach(function(flavor){
				flavorsIds.push(flavor._id);
			})
			
			if(user) init();
		}
		
		var init = function(){

			combinationPublisher = new CombinationPublisher(host);
			combinationPublisher.start();

			addRandom();
		}

		var addRandom = function () {
			var ratings = [1,2,3,4,5];
			var comments = ["Bot - Meeeeeh!","Bot - oooaaahhhhh!", "Bot - bruuummm...", "Bot - psiiiiissh", "Bot - Blaaaaam", "Bot - mmmmmmmmmm", "Bot - huh?"];
			var data = {
				flavorIds: [flavorsIds[0], flavorsIds[Math.floor(Math.random() * (flavorsIds.length-1) + 1)], flavorsIds[Math.floor(Math.random() * (flavorsIds.length-1) + 1)]],
				userId: user._id,
				rating: ratings[Math.floor(Math.random() * ratings.length)],
				comment: comments[Math.floor(Math.random() * comments.length)]
			}
			combinationPublisher.add(data);
			setTimeout( addRandom, 5000 );
		}


		self.setup = setup;
	}
	App.prototype = new BaseApp();
	return App;
});