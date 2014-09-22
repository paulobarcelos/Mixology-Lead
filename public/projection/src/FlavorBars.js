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
	var FlavorBars = function(container){
		var 
		self = this,
		
		stopSignal,
		node,
		nodeTransformer,

		barsNode,
		
		flavorsById,
		flavorsData,
		maxCombinationsPerFlavor,
		combinations,

		animationShowTimer,
		animationHideTimer,
		animationTimer,

		size,

		isActive;


		var init = function(){
			isActive = false;
			
			node = document.createElement('div');
			dom.addClass(node, 'flavor-bars');
			nodeTransformer = new Transformer(node);
			nodeTransformer.origin(0,0);
			nodeTransformer.rotate(0,0,1, -90);


			barsNode = document.createElement('div');
			dom.addClass(barsNode, 'bars');
			node.appendChild(barsNode);

			stopSignal = new Signal();

		}

		var update = function(dt){
			if(!isActive) return;
		}
		var start = function(){
			console.log('Flavor Bars start')
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
			dom.empty(barsNode);
		}

		var animate = function(){
			dom.empty(barsNode)

			flavorsData.forEach(function(data){
				var itemNode = document.createElement('div');
				dom.addClass(itemNode, 'item');

				var barNode = document.createElement('span');
				barNode.style.backgroundColor = data.flavor.color;
				barNode.style.width = (data.count / maxCombinationsPerFlavor) * 100 + '%';
				dom.addClass(barNode, 'bar');
				itemNode.appendChild(barNode);

				var nameNode = document.createElement('span');
				dom.addClass(nameNode, 'name');
				nameNode.innerHTML = data.flavor.name;
				itemNode.appendChild(nameNode);

				barsNode.appendChild(itemNode);
			});



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
			combinations = value.slice(0); //clone
			
			var count = {};
			combinations.forEach(function(combination){
				combination.flavorIds.forEach(function(id){
					if(typeof count[id] === 'undefined') count[id] = 0;
					count[id]++;
				});
			});

			flavorsData = [];
			for(id in count){
				var data = {
					flavorId: id,
					flavor: flavorsById[id],
					count: count[id]
				}
				flavorsData.push(data);
				
			}
			flavorsData.sort(sortByCount);
			flavorsData.shift(); //remove blue mussels
			total = 0;
			maxCombinationsPerFlavor = 0;
			flavorsData.forEach(function(data){
				maxCombinationsPerFlavor = Math.max(maxCombinationsPerFlavor, data.count);
			})

		}
		var setFlavorsById = function (value){
			flavorsById = value;
		}
		var setSize = function (value){
			size = value;

			var scale = size.x/2700;

			nodeTransformer.translate(size.x/2 - dom.size(barsNode).y * scale / 2, size.y - 500 * scale, 1);
			nodeTransformer.scale(scale, scale, scale);	

			barsNode.style.width = size.y / scale - 620 + 'px';
		}
		var getStopSignal = function(){
			return stopSignal;
		}

		var sortByCount = function(a, b){
			return b.count - a.count;
		}


		Object.defineProperty(self, 'update', {
			value: update
		});
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
	return FlavorBars;
});