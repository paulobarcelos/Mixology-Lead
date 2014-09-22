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
	var CombinationRanking = function(container, title, isPositive){
		var 
		self = this,
		title = title || 'Awesome',
		isPositive = (typeof isPositive !== 'undefined') ? isPositive : true,
		
		stopSignal,
		node,
		nodeTransformer,

		headingNode,
		combinationsNode,
		
		flavorsById,
		flavorsDataById,
		maxCombinationsPerFlavor,
		combinations,
		uids,
		combinationsByUid,
		averageRatingByUid,

		animationShowTimer,
		animationHideTimer,
		animationTimer,

		size,

		isActive;


		var init = function(){
			isActive = false;
			
			node = document.createElement('div');
			dom.addClass(node, 'combination-ranking');
			dom.addClass(node, (isPositive) ? 'positive' : 'negative');
			nodeTransformer = new Transformer(node);
			nodeTransformer.origin(0,0);
			//nodeTransformer.rotate(0,0,1, -90);

			headingNode = document.createElement('h1');
			headingNode.innerHTML = title;
			dom.addClass(headingNode, 'heading');
			node.appendChild(headingNode);

			combinationsNode = document.createElement('div');
			dom.addClass(combinationsNode, 'combinations');
			node.appendChild(combinationsNode);

			stopSignal = new Signal();

		}

		var start = function(){
			console.log('Ranking start')
			clean();
			isActive = true;

			container.appendChild(node);
			animate();
			setSize(size);
		}
		var stop = function(){
			isActive = false;
			clean();
			stopSignal.dispatch(self);
		}
		var clean = function(){
			if(node.parentNode) node.parentNode.removeChild(node);
			dom.empty(combinationsNode);
		}

		var animate = function(){
			dom.empty(combinationsNode)

			if(isPositive){
				uids.sort(sortPositive);
			}
			else uids.sort(sortNegative);

			for(var i = 0; i <  4;  i++){
				var uid = uids[i];

				var combinationNode = document.createElement('div');
				dom.addClass(combinationNode, 'item');
				
				combinationsByUid[uid][0].flavors.sort(sortByIndex);
				combinationsByUid[uid][0].flavors.reverse();

				combinationsByUid[uid][0].flavors.forEach(function(flavor){
					var wrapperNode = document.createElement('div');
					dom.addClass(wrapperNode, 'wrapper');

					var imageNode = document.createElement('div');
					dom.addClass(imageNode, 'image');
					imageNode.style.backgroundImage = 'url(/projection/data/flavors_cropped/'+flavor.index+'.png)';
					wrapperNode.appendChild(imageNode);

					var nameNode = document.createElement('span');
					dom.addClass(nameNode, 'name');
					nameNode.innerHTML = flavor.name;
					wrapperNode.appendChild(nameNode);

					combinationNode.appendChild(wrapperNode);
				});

				combinationsNode.appendChild(combinationNode);
			}

			dom.addClass(node, 'show');
			animationShowTimer = setTimeout(onAnimationShowEnd, 1500);
		}


		var onAnimationShowEnd = function(){
			dom.addClass(node, 'during');
			dom.removeClass(node, 'show');
		}
		var exitAnimation = function(){
			animationHideTimer = setTimeout(onAnimationHideEnd, 1500);
			dom.addClass(node, 'hide');
			dom.removeClass(node, 'during');
		}
		var onAnimationHideEnd = function(){
			dom.removeClass(node, 'hide');
			stop();
		}

		var exit = function(callback){
			if(callback) stopSignal.addOnce(callback);
			if(isActive) exitAnimation();
			else stop();
		}

		var setCombinations = function (value){
			combinations = value;
			
		}
		var setCombinationsByUid = function (value){
			combinationsByUid = value;

			averageRatingByUid = {};
			uids = [];
			for(uid in combinationsByUid){
				uids.push(uid);
				var average = 0;
				combinationsByUid[uid].forEach(function(combination){
					average += combination.rating / combinationsByUid[uid].length;
				})
				averageRatingByUid[uid] = average;
			}
		}
		var setFlavorsById = function (value){
			flavorsById = value;
		}
		var setSize = function (value){
			size = value;

			var scale = size.y/2000;

			nodeTransformer.translate(size.x/2 - 1000 * scale , 165, 1);
			nodeTransformer.scale(scale, scale, scale);	

		}
		var getStopSignal = function(){
			return stopSignal;
		}

		var sortPositive = function(a, b){
			var aCount = 0;
			combinationsByUid[a].forEach(function(combination){
				if(combination.rating == 5) aCount++;
			})
			var bCount = 0;
			combinationsByUid[b].forEach(function(combination){
				if(combination.rating == 5) bCount++;
			})
			return bCount - aCount;
		}

		var sortNegative = function(a, b){
			var aCount = 0;
			combinationsByUid[a].forEach(function(combination){
				if(combination.rating == 1) aCount++;
			})
			var bCount = 0;
			combinationsByUid[b].forEach(function(combination){
				if(combination.rating == 1) bCount++;
			})
			return bCount - aCount;
		}

		var sortByIndex = function(a,b){
			return b.index - a.index;
		}

		Object.defineProperty(self, 'start', {
			value: start	
		});
		Object.defineProperty(self, 'stop', {
			value: stop
		});
		Object.defineProperty(self, 'exit', {
			value: exit
		});
		Object.defineProperty(self, 'combinations', {
			set: setCombinations
		});
		Object.defineProperty(self, 'combinationsByUid', {
			set: setCombinationsByUid
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
	return CombinationRanking;
});