define(
[
	'happy/utils/dom',
	'happy/utils/vendorPrefix',

	'happy/_libs/dat.gui',
	'happy/_libs/mout/math/clamp',
	'happy/_libs/mout/math/map',
	'happy/_libs/signals',

	'Transformer'
],
function (
	dom,
	vendorPrefix,

	Gui,
	clamp,
	map,
	Signal,

	Transformer
){
	var FeaturedCombinations = function(container){
		var 
		self = this,
		
		stopSignal,
		node,
		nodeTransformer,
		
		commentNode,
		commentTransformer,

		imagesNode,
		imagesTransformer,


		namesNode,
		flavorsById,
		combinations,

		animationShowTimer,
		animationHideTimer,
		animationTimer,

		usedIds,
		size,

		isActive,
		maxCount,
		count;


		var init = function(){
			isActive = false;
			node = document.createElement('div');
			dom.addClass(node, 'featured-flavors');
			nodeTransformer = new Transformer(node);
			nodeTransformer.origin(0,0);

			commentNode = document.createElement('div');
			dom.addClass(commentNode, 'comment');
			node.appendChild(commentNode);
			commentTransformer = new Transformer(commentNode);

			imagesNode = document.createElement('div');
			dom.addClass(imagesNode, 'images');
			node.appendChild(imagesNode);
			

			namesNode = document.createElement('div');
			dom.addClass(namesNode, 'names');
			node.appendChild(namesNode);

			usedIds = {};

			stopSignal = new Signal();

		}

		var update = function(dt){
			if(!isActive) return;

		}
		var start = function(){
			console.log('Featured Flavors start')
			clean();
			count = 0;
			maxCount = 20;
			isActive = true;

			container.appendChild(node);
			animate();
		}
		var stop = function(){
			console.log('Featured Flavors stop')
			isActive = false;
			clean();
			stopSignal.dispatch(self);
		}
		var clean = function(){
			if(node.parentNode) node.parentNode.removeChild(node);
			dom.empty(commentNode)
			dom.empty(imagesNode)
			dom.empty(namesNode)
		}

		var animate = function(){
			if(count >= maxCount) return stop();
			count++;
			var combination = getNextCombination();
			if(!combination) return stop();

			dom.empty(imagesNode)
			dom.empty(namesNode)

			commentNode.innerHTML = combination.comment;
			var fontSize = 10;
			if(combination.comment.length>15){
				fontSize = 10 - combination.comment.length / 8;
			}
			commentNode.style.fontSize = fontSize + 'em';

			var flavorData = [];
			var loadedCount = 0;
			combination.flavors.forEach(function(flavor){
				var data = {
					image: new Image(),
					imageCropped: new Image(),
					flavor:flavor
				}
				flavorData.push(data);
				var onLoad = function(){
					loadedCount ++;
					if(loadedCount == combination.flavors.length*2){
						onFlavorsLoaded(flavorData);
					}
				}
				data.image.onload = onLoad;
				data.imageCropped.onload = onLoad;

				data.image.src = '/projection/data/flavors/'+flavor.index+'.png';
				data.imageCropped.src = '/projection/data/flavors_cropped/'+flavor.index+'.png';
			});
		}

		var onFlavorsLoaded = function(flavorData){
			flavorData.sort(sortByImageArea);

			flavorData.forEach(function(data, index){
				data.image.style.zIndex = index;
				data.image.style.left = -data.image.width/2 + 'px';
				var y = 0;
				if(index>0) {
					y = flavorData[index-1].offsetBottom + flavorData[index-1].image.height * 0.7;
				}
				data.offsetBottom = y;
				data.image.style.bottom = data.offsetBottom + 'px';
				imagesNode.appendChild(data.image);
			});

			flavorData.reverse();
			flavorData.forEach(function(data, index){
				var nameNode = document.createElement('div');
				nameNode.innerHTML = data.flavor.name;
				namesNode.appendChild(nameNode);
			});

			dom.addClass(node, 'show');
			animationShowTimer = setTimeout(onAnimationShowEnd, 700);
		}


		var onAnimationShowEnd = function(){
			animationTimer = setTimeout(onAnimationEnd, 5000);
			dom.addClass(node, 'during');
			dom.removeClass(node, 'show');
		}
		var onAnimationEnd = function(){
			animationHideTimer = setTimeout(onAnimationHideEnd, 670);
			dom.addClass(node, 'hide');
			dom.removeClass(node, 'during');
		}
		var onAnimationHideEnd = function(){
			dom.removeClass(node, 'hide');
			animate();
		}

		var setCombinations = function (value){
			combinations = value.slice(0); //clone
			combinations.sort(sortByRating);
		}

		var setFlavorsById = function (value){
			flavorsById = value;
		}

		var setSize = function (value){
			size = value;

			var scale = size.y/1080 * 0.8;

			nodeTransformer.translate(size.x/2, size.y/2, 1);
			nodeTransformer.scale(scale, scale, scale);	
		}

		var setMaxCount = function(value){
			maxCount = value;
		}

		var getStopSignal = function(){
			return stopSignal;
		}

		var getNextCombination = function(){
			for(var i = 0; i < combinations.length; i++){
				if(!usedIds[combinations[i]._id]){
					usedIds[combinations[i]._id] = true;
					return combinations[i];
				}
					
			}
		}
		var resetUsedIds = function(){
			usedIds = {};
		}

		var sortByRating = function(a, b){
			return b.rating - a.rating;
		}
		var sortByImageArea = function(a, b){
			return  (b.imageCropped.height * b.imageCropped.width) - (a.imageCropped.height * a.imageCropped.width);
		}

		Object.defineProperty(self, 'resetUsedIds', {
			value: resetUsedIds
		});
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'start', {
			value: start	
		});
		Object.defineProperty(self, 'stop', {
			value: stop
		});
		Object.defineProperty(self, 'maxCount', {
			set: setMaxCount
		});
		Object.defineProperty(self, 'combinations', {
			set: setCombinations
		});
		Object.defineProperty(self, 'flavorsById', {
			set: setFlavorsById
		});
		Object.defineProperty(self, 'size', {
			set: setSize
		});
		Object.defineProperty(self, 'stopSignal', {
			get: getStopSignal
		});

		
		init();
	}
	return FeaturedCombinations;
});