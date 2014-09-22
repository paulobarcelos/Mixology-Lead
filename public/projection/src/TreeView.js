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
	var TreeView = function(container){
		var 
		self = this,
		flavorsById,
		data,
		node,
		rootHub,
		size,
		zoom,
		hubs,

		stopSignal;

		var 
		gui,
		guiData;


		var GuiData = function(){
			this.rootZeroScaleBalance = 2.1;
			this.rootBranchCountScalePower = 0.45;
			this.zoom = 1.0;
			
			this.offsetX = 0;
			this.primaryDistance = 463;
			this.primaryOpenAngle = 360;
			this.primaryStartAngle = 360;
			this.primaryRatingAveragePower = 3;
			
			this.secondaryDistance = 22;
			this.secondaryOpenAngle = 270;
			this.secondaryStartAngle = 135;
			this.secondaryRatingAveragePower = 3;


			this.render = function(){
				render();
			}
		}

		var init = function(){
			node = document.createElement('div');
			dom.addClass(node, 'tree');

			stopSignal = new Signal();
			
			destroy();

			////gui = new Gui();
			
			guiData = new GuiData();

			////var root = gui.addFolder('Root');

			////root.add(guiData, 'zoom', 0,10);
			////root.add(guiData, 'rootZeroScaleBalance', 0,3);
			//root.add(guiData, 'rootBranchCountScalePower', 0, 0.51);
			////root.add(guiData, 'offsetX', -300,300);
			
			////var primary = gui.addFolder('Primary');

			////primary.add(guiData, 'primaryDistance', 0,1000);
			//primary.add(guiData, 'primaryDistancePower', 0, 2.9999999);			
			//primary.add(guiData, 'primaryOpenAngle', 0,360);
			//primary.add(guiData, 'primaryStartAngle', 0,360);
			////primary.add(guiData, 'primaryRatingAveragePower', 0,3); 
			//primary.add(guiData, 'primaryCombinationCountWeightPower', 0,3.999999);

			
			////var secondary = gui.addFolder('Secondary');


			////secondary.add(guiData, 'secondaryDistance', 0,35);
			//secondary.add(guiData, 'secondaryDistanceAlternate', 0,35);
			//secondary.add(guiData, 'secondaryDistancePower', 0, 0.555);	
			//secondary.add(guiData, 'secondaryOpenAngle', 0,360);
			//secondary.add(guiData, 'secondaryStartAngle', 0,360);
			////secondary.add(guiData, 'secondaryRatingAveragePower', 0,1.5); 
			
			//secondary.add(guiData, 'secondaryCombinationCountWeightPower', 0,3.999999);

			////gui.add(guiData, 'render');

			//gui.remember(guiData);

			zoom = 1;

		}
		var setData = function(value){
			data = value;
			console.log(data)
			if(isAnimating) render();
		}
		var render = function(){
			destroy();
			container.appendChild(node);
			var zeroHub = {
				linkNode: node
			}
			rootHub = createHub('NULL', data, zeroHub, 0);
			
		}

		var createHub = function(flavorId, data, parent, index){
			var flavor;
			if(flavorsById[flavorId]){
				flavor = flavorsById[flavorId];
			}
			else {
				flavor = {
					_id: 'root',
					color: 'rgba(0,0,0,0)'
				}
			}
			
			var containerNode = document.createElement('div');
			containerNode.id = flavor._id;
			dom.addClass(containerNode, 'hub');
			parent.linkNode.appendChild(containerNode);

			var ballNode = document.createElement('div');
			ballNode.style.backgroundColor = flavor.color;
		//	ballNode.style.backgroundImage = 'url(/projection/data/flavors_cropped/'+flavor.index+'.png)';
			dom.addClass(ballNode, 'ball');
			containerNode.appendChild(ballNode);

			var connectorNode = document.createElement('div');
			dom.addClass(connectorNode, 'connector');
			containerNode.appendChild(connectorNode);


			var linkNode = document.createElement('div');
			dom.addClass(linkNode, 'link');
			containerNode.appendChild(linkNode);
			
			var hub = {
				flavor: flavor,
				containerNode: containerNode,
				containerTransformer: new Transformer(containerNode),
				ballNode: ballNode,				
				ballTransformer: new Transformer(ballNode),
				connectorNode: connectorNode,				
				connectorTransformer: new Transformer(connectorNode),
				linkNode: linkNode,				
				linkTransformer: new Transformer(linkNode),
				data: data,
				parent: parent,
				index: index
			}

			hub.containerTransformer.origin(0, 50);
			hub.connectorTransformer.origin(0, 50);

			applyTransformsSingle(hub);
			
			hubs.push(hub);

			data.flavorIdsSortedByCreationDate.forEach(function(flavorId, childIndex){
				createHub(flavorId, data.branchesByFlavorId[flavorId], hub, childIndex);
			});

			return hub;
		}

		var applyTransformsBulk = function(){
			hubs.forEach(applyTransformsSingle);
		}
		var applyTransformsSingle = function(hub){
			if(hub.parent && hub.parent.flavor && hub.parent.flavor._id == 'root'){
				hub.ballTransformer.scale(0.1,0.1,0.1);
			}
			if(hub.flavor._id != 'root' && hub.parent.flavor._id != 'root'){
				if(hub.parent.parent.flavor._id == 'root'){

					var ratingAverage = 0;
					hub.data.combinations.forEach(function(combination){
						ratingAverage += combination.rating; 
					});
					ratingAverage /= hub.data.combinations.length;
					//ratingAverage = Math.round(ratingAverage);
					ratingAverage /= 5;

					hub.data.ratingAverage = ratingAverage;
					
					var scale = Math.pow(ratingAverage, guiData.primaryRatingAveragePower);
					var scale = clamp(scale, 0.3, 1);

					var ballScale = scale * 0.1;
					hub.ballTransformer.scale(ballScale,ballScale,ballScale);
					
					//var branchCountWeight = hub.data.branchCount / hub.parent.data.branchesSortedByBranchCount[0].branchCount;
					//var branchCountMultiplier = hub.parent.data.branchCount /  Math.pow(hub.parent.data.branchCount , guiData.primaryDistancePower);
					var distance = guiData.primaryDistance;//Math.pow(guiData.primaryDistance, guiData.primaryDistancePower);
					var ratingAverageInverse = clamp(1-ratingAverage, 0.1, 1);
					distance *= ratingAverageInverse;

					hub.ballTransformer.translate(distance, 0, 0);
					hub.linkTransformer.translate(distance, 0, 0);				
					hub.connectorTransformer.scale(distance, 0.3, 1);

					var angleTotal = guiData.primaryOpenAngle;
					var angleUnit = guiData.primaryOpenAngle / (hub.parent.data.branchCount);	
					var angleIndex = angleUnit * (hub.index );		
					var angle = guiData.primaryStartAngle - angleTotal / 2 + angleIndex;
					hub.containerTransformer.rotate(0,0,1,angle);

					//var maxCombinationCount = 0;
					//hub.parent.data.branchesSortedByBranchCount.forEach(function(data){
					//	maxCombinationCount = Math.max(maxCombinationCount, data.combinations.length);
					//});

					
					//hub.ballTransformer.opacity(ratingAverage);
					//hub.connectorTransformer.opacity(ratingAverage);
					


					//var combinationCountWeight = clamp(hub.data.combinations.length / maxCombinationCount, 0, maxCombinationCount);
					//combinationCountWeight = Math.pow(combinationCountWeight, guiData.primaryCombinationCountWeightPower);
					//hub.containerTransformer.opacity(Math.pow(combinationCountWeight, guiData.secondaryCombinationCountWeightPower));
					//hub.ballTransformer.scale(combinationCountWeight * ratingAverage,combinationCountWeight * ratingAverage,combinationCountWeight * ratingAverage);
					//hub.linkTransformer.scale(combinationCountWeight,combinationCountWeight,combinationCountWeight);
					//console.log(combinationCountWeight)

				}
				else{

					var ratingAverage = 0;
					hub.data.combinations.forEach(function(combination){
						ratingAverage += combination.rating; 
					});
					ratingAverage /= hub.data.combinations.length;
					ratingAverage /= 5;
					var scale = Math.pow(ratingAverage, guiData.secondaryRatingAveragePower);
					var scale = clamp(scale, 0.3, 1);

					var ballScale = scale * 0.1;
					hub.ballTransformer.scale(ballScale,ballScale,ballScale);
					//var branchCountMultiplier = hub.parent.data.branchCount /  Math.pow(hub.parent.data.branchCount , guiData.secondaryDistancePower);
					//var distance = guiData.secondaryDistance * branchCountMultiplier;

					//distance /= (ratingAverage*2);

					var distance = guiData.secondaryDistance;//Math.pow(guiData.primaryDistance, guiData.primaryDistancePower);
					var ratingAverageInverse = clamp(1-ratingAverage, 0.3, 1);
					distance *= ratingAverageInverse;
					//distance = clamp(distance, 0.1, 1);
					distance *= 1 + hub.parent.data.ratingAverage;  

					hub.ballTransformer.translate(distance, 0, 0);
					hub.linkTransformer.translate(distance, 0, 0);				
					hub.connectorTransformer.scale(distance, 0.3, 1);

					var angleTotal = guiData.secondaryOpenAngle;
					var angleUnit = guiData.secondaryOpenAngle / (hub.parent.data.branchCount);	
					var angleIndex = angleUnit * (hub.index);		
					var angle = guiData.secondaryStartAngle - angleTotal / 2 + angleIndex;
					hub.containerTransformer.rotate(0,0,1,angle);

					
				//	hub.containerTransformer.opacity(ratingAverage);

					//hub.containerTransformer.opacity(ratingAverage);
					
					

					//var maxCombinationCount = 0;
					//hub.parent.data.branchesSortedByBranchCount.forEach(function(data){
				//		maxCombinationCount = Math.max(maxCombinationCount, data.combinations.length);
				//	});

					//var combinationCountWeight = clamp(hub.data.combinations.length / maxCombinationCount, 0, maxCombinationCount);
					//combinationCountWeight = Math.pow(combinationCountWeight, guiData.secondaryCombinationCountWeightPower);
					//hub.ballTransformer.scale(combinationCountWeight*ratingAverage,combinationCountWeight*ratingAverage,combinationCountWeight*ratingAverage);
					//hub.connectorTransformer.opacity(combinationCountWeight);
				}

				//var scale = (hub.data.combinations.length / hub.parent.data.combinations.length) * guiData.combinationCountScale;
				//scale = map(scale, 0, 1, 0, 0.8);
				hub.containerTransformer.scale(0.9,0.9,0.9);	
			}
		}
		var transnformRootHub = function(dt){
			
		}	
		var destroy = function(){
			if(node.parentNode) node.parentNode.removeChild(node);
			dom.empty(node);
			rootHub = null;
			hubs = [];
		}

		var update = function(dt){
			if(!rootHub) return;
			var scale = (size.y / 1500) * guiData.rootZeroScaleBalance;

			if(isAnimating){
				animationElapsed+= dt;
				var progress= animationElapsed / animationDuration;

				progress = Math.pow(progress, 1.5);
				if(progress >= 1) return endAnimation();
			}

			var x = size.x/2;
			var y = size.y/2 + guiData.offsetX;

			var alpha = 1;

			var angle = 0;

			if(isAnimating && animationElapsed >0){
				angle = progress * animationAngle;
				scale += progress*animationZoom;

				x += animationX * scale * progress;
				y += animationY * scale * progress;

				if(progress <= 0.03){
					alpha = progress/0.03;
				}
				else if(progress >= 0.97){
					alpha = (0.03-(progress-0.97))/0.03;
				}
			}


			rootHub.containerTransformer.scale(scale,scale,scale);
			rootHub.containerTransformer.translate(x, y, 0)
			rootHub.containerTransformer.rotate(0, 0, 1, angle);
			rootHub.containerTransformer.opacity(alpha);
		}

		var getNode = function (){
			return node;
		}

		var getFlavorsById = function (){
			return flavorsById;
		}

		var setFlavorsById = function (value){
			flavorsById = value;
		}

		var setSize = function (value){
			size = value;
	
		}
		var getSize = function (){
			return size;
		}

		var isAnimating, animationElapsed, animationDuration;
		var animationZoom, animationX, animationY, animationAngle;
		var start = function(delay, duration){
			console.log('Tree View start')
			render();
			isAnimating = true;
			animationElapsed = -delay;
			animationDuration = duration;
			
			if(data.combinations.length  < 20){
				animationX = 0;
				animationY = 0;
				animationZoom = 6;
				animationAngle = 20;
			}
			else if(data.combinations.length  < 50){
				animationX = Math.random() * size.y/4 - size.y/8;
				animationY = Math.random() * size.y/4 - size.y/8;
				animationZoom = 8;
				animationAngle = 50;
			}
			else{
				animationX = Math.random() * size.y/3 - size.y/6;
				animationY = Math.random() * size.y/3 - size.y/6;
				animationZoom = 11;
				animationAngle = 180;
			}
			
		}
		var endAnimation = function(){
			console.log('Tree View endAnimation')
			isAnimating = false;
			destroy();
			stopSignal.dispatch(self)
		}

		/*function logRating(value) {
		// position will be between 0 and 100
			var minp = 1;
			var maxp = 5;

		// The result should be between 100 an 10000000
			var minv = Math.log(10);
			var maxv = Math.log(10000000);

		// calculate adjustment factor
			var scale = (maxv-minv) / (maxp-minp);

			return Math.exp(minv + scale*(value-minp)) / 10000000 - 10;
		}*/

		var getStopSignal = function(){
			return stopSignal;
		}

		var getIsAnimating = function(){
			return isAnimating;
		}


		Object.defineProperty(self, 'render', {
			value: render
		});
		Object.defineProperty(self, 'update', {
			value: update
		});
		Object.defineProperty(self, 'start', {
			value: start
		});
		Object.defineProperty(self, 'destroy', {
			value: destroy
		});
		Object.defineProperty(self, 'node', {
			get: getNode
		});
		Object.defineProperty(self, 'data', {
			set: setData
		});
		Object.defineProperty(self, 'flavorsById', {
			set: setFlavorsById,
			get: getFlavorsById
		});
		Object.defineProperty(self, 'size', {
			set: setSize,
			get: getSize
		});

		Object.defineProperty(self, 'isAnimating', {
			set: getIsAnimating
		});

		Object.defineProperty(self, 'stopSignal', {
			get: getStopSignal
		});

		
		init();
	}
	return TreeView;
});