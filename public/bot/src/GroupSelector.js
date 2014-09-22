define(
[
	'happy/utils/dom',

	'happy/_libs/signals',
],
function (
	dom,

	Signal
){
	var GroupSelector = function(groupId){
		var 
		self = this,
		node,
		selected,
		selectedSignal,
		deselectedSignal;

		var init = function(){
			selected = false;
			deselectedSignal = new Signal();
			selectedSignal = new Signal();

			node = document.createElement('div');
			dom.addClass(node, 'tab');
			var isTouch = 'ontouchstart' in document.documentElement;
			node.addEventListener((isTouch) ? 'touchstart':'click', onClick);		
		}

		var select = function(silent){
			if(selected) return;
			selected = true;
			if(!silent) selectedSignal.dispatch(self);
			dom.addClass(node, 'selected');
		}
		var deselect = function(silent){
			if(!selected) return;
			selected = false;
			if(!silent) deselectedSignal.dispatch(self);
			dom.removeClass(node, 'selected');
		}
		var getId = function(){
			return groupId;
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
			select();
		}


		Object.defineProperty(self, 'select', {
			value: select
		});
		Object.defineProperty(self, 'deselect', {
			value: deselect
		});
		Object.defineProperty(self, 'id', {
			get: getId
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
	return GroupSelector;
});