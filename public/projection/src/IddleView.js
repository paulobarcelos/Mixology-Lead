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
	var IddleView = function(container){
		var 
		self = this,
		node,
		imageNode,
		size,
		timer,

		stopSignal;


		var init = function(){
			node = document.createElement('div');
			dom.addClass(node, 'iddle-view');
			
			stopSignal = new Signal();
			
		}

		var getNode = function (){
			return node;
		}


		var setSize = function (value){
			size = value;
	
		}
		var getSize = function (){
			return size;
		}

		var isAnimating;
		var start = function(duration){
			console.log('Iddle view start')
				
			isAnimating = true;
			clearTimeout(timer);
			timer = setTimeout(endAnimation, duration*1000);

			container.appendChild(node);			
		}
		var exit = function(callback){
			clearTimeout(timer);
			if(callback) stopSignal.addOnce(callback);
			endAnimation();
		}
		var endAnimation = function(){
			console.log('Iddle viewendAnimation')
			isAnimating = false;
			
			if(node.parentNode) node.parentNode.removeChild(node);

			stopSignal.dispatch(self)
		}

		var getStopSignal = function(){
			return stopSignal;
		}

		var getIsAnimating = function(){
			return isAnimating;
		}


		Object.defineProperty(self, 'start', {
			value: start
		});
		Object.defineProperty(self, 'exit', {
			value: exit
		});
		Object.defineProperty(self, 'node', {
			get: getNode
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
	return IddleView;
});