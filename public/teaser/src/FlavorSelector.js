define(
[
	'happy/utils/dom',

	'happy/_libs/signals',
],
function (
	dom,

	Signal
){
	var FlavorSelector = function(flavor){
		var 
		self = this,
		node,
		active,
		selected,
		selectedSignal,
		deselectedSignal;

		var init = function(){
			active = true;
			selected = false;
			deselectedSignal = new Signal();
			selectedSignal = new Signal();

			node = document.createElement('div');
			dom.addClass(node, 'flavor');
			node.style.backgroundColor = flavor.color;
			var isTouch = 'ontouchstart' in document.documentElement;
			node.addEventListener((isTouch) ? 'touchstart':'click', onClick);
		}

		var select = function(silent){
			if(!active) return;
			if(selected) return;
			selected = true;
			if(!silent) selectedSignal.dispatch(self);
			dom.addClass(node, 'selected');
		}
		var deselect = function(silent){
			if(!active) return;
			if(!selected) return;
			selected = false;
			if(!silent) deselectedSignal.dispatch(self);
			dom.removeClass(node, 'selected');
		}
		var getIsActive = function(){
			return active;
		}
		var setIsActive = function(value){
			active = value;
		}
		var getFlavor = function(){
			return flavor;
		}
		var getNode = function(){
			return node;
		}		
		var getIsSelected = function(){
			return selected;
		}
		var getSelectedSignal = function(){
			return selectedSignal;
		}
		var getDeselectedSignal = function(){
			return deselectedSignal;
		}
		var onClick = function(){
			document.activeElement.blur();
			if(!active) return;
			if(selected) deselect();
			else select();
		}


		Object.defineProperty(self, 'select', {
			value: select
		});
		Object.defineProperty(self, 'deselect', {
			value: deselect
		});
		Object.defineProperty(self, 'active', {
			set: setIsActive,
			get: getIsActive
		});
		Object.defineProperty(self, 'flavor', {
			get: getFlavor
		});
		Object.defineProperty(self, 'node', {
			get: getNode
		});
		Object.defineProperty(self, 'selected', {
			get: getIsSelected
		});
		Object.defineProperty(self, 'selectedSignal', {
			get: getSelectedSignal
		});
		Object.defineProperty(self, 'deselectedSignal', {
			get: getDeselectedSignal
		});

		init();
	}
	return FlavorSelector;
});