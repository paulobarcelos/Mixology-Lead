define(
[
	'happy/utils/dom',
	'happy/utils/vendorPrefix',

	'happy/_libs/dat.gui',
	'happy/_libs/mout/math/clamp',
	'happy/_libs/mout/math/map',
	'happy/_libs/signals',

	'Transformer',
	'Database'
],
function (
	dom,
	vendorPrefix,

	Gui,
	clamp,
	map,
	Signal,

	Transformer,
	Database
){
	var TreeViewTimeline = function(container, dataLoader){
		var 
		self = this,
		flavorsById,
		data,
		node,
		rootHub,
		size,
		zoom,
		hubs,

		combinations,
		combinationsReference,
		totalCombinations,
		timeStep,
		progress,
		animationTimer,

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
			
			guiData = new GuiData();

			zoom = 1;

			progress = document.createElement('div');
			progress.style.position = 'fixed';
			progress.style.bottom = 0;
			progress.style.left = 0;
			progress.style.height = "15px";
			progress.style.backgroundColor = "#fff";
			isActive = false;

		}
		var setData = function(value){
			data = value;;
		}
		var render = function(){
			destroy();
			container.appendChild(node);
			var zeroHub = {
				linkNode: node
			}
			rootHub = createHub('NULL', data, zeroHub, 0);
			update();
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


			var x = size.x/2;
			var y = size.y/2 + guiData.offsetX;

			var alpha = 1;

			var angle = 0;

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

		var start = function(duration){
			console.log('Tree View Timeline start')
			combinationsReference = dataLoader.combinations;
			combinations = [];
			duration = duration || 120;
			duration *= 1000;
			timeStep = duration/combinationsReference.length;
			totalCombinations = combinationsReference.length;
			document.body.appendChild(progress);
			isActive = true;
			animationStep();
			
		}

		var exit = function(callback){
			if(callback) stopSignal.addOnce(callback);
			if(isActive) endAnimation();
			else stopSignal.dispatch(self);
		}

		var animationStep = function(){
			if(!combinationsReference.length) endAnimation();

			for(var i = 0; i < 4; i++){
				var combination = combinationsReference.shift();
				if(combination) combinations.push(combination);
			}
			
			
			var database = new Database();
			database.flavors = dataLoader.flavors;
			database.add(combinations);
			setData(database.tree);

			render();

			progress.style.width = ((combinations.length / totalCombinations) * size .y )+ 'px';

			animationTimer = setTimeout(animationStep, 20);
		}

		var endAnimation = function(){
			isAnimating = false;
			clearTimeout(animationTimer);
			if(progress && progress.parentNode)progress.parentNode.removeChild(progress);
			destroy();
			stopSignal.dispatch(self)
		}

		var getStopSignal = function(){
			return stopSignal;
		}

		var getIsAnimating = function(){
			return isAnimating;
		}


		Object.defineProperty(self, 'render', {
			value: render
		});
		Object.defineProperty(self, 'start', {
			value: start
		});
		Object.defineProperty(self, 'exit', {
			value: exit
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
	return TreeViewTimeline;
});