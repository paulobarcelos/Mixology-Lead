define(
[
	'happy/utils/dom',

	'happy/_libs/signals',

	'FlavorSelector'
],
function (
	dom,

	Signal,

	FlavorSelector
){
	var FlavorGroup = function(flavors){
		var 
		self = this,
		node,
		selected,
		flavorSelectors,
		ready,
		changedSignal,
		readySignal,
		unreadySignal;

		var init = function(){
			node = document.createElement('div');
			dom.addClass(node, 'group');

			flavorSelectors = [];
			var cluster;
			var count = -1;
			for (var i = 0; i < flavors.length; i++) {
				if(i%7 == 0){
					count++;
					cluster = document.createElement('div');
					dom.addClass(cluster, 'cluster');
					node.appendChild(cluster);
				}
				var flavorSelector = new FlavorSelector(flavors[i]);
				flavorSelector.selectedSignal.add(onFlavorSelected);
				flavorSelector.deselectedSignal.add(onFlavorDeselected);
				flavorSelectors.push(flavorSelector);
				if(count == 1 || count ==2){
					cluster.insertBefore(flavorSelector.node, cluster.firstChild);
				}
				else{
					cluster.appendChild(flavorSelector.node);
				}
				
			};

			ready = false;
			selected = [];
			changedSignal = new Signal();
			readySignal = new Signal();
			unreadySignal = new Signal();
		};

		var onFlavorSelected = function(flavorSelector){
			var alreadyIn = false;
			for (var i = selected.length - 1; i >= 0; i--) {
				if(flavorSelector.flavor._id == selected[i]._id){
					alreadyIn = true;
					break;
				}					
			}

			if(!alreadyIn) selected.push(flavorSelector.flavor);
			processChange();
		}
		var onFlavorDeselected = function(flavorSelector){
			for (var i = selected.length - 1; i >= 0; i--) {
				if(flavorSelector.flavor._id == selected[i]._id){
					selected.splice(i, 1);
					break;
				}
			};
			processChange();
		}
		var reset = function () {
			for (var i = flavorSelectors.length - 1; i >= 0; i--) {
				flavorSelectors[i].deselect();
			}
			selected = [];
			ready = false;
		}
		var processChange = function(){
			/*if(selected.length == 3){
				var extra = selected.shift();
				for (var i = flavorSelectors.length - 1; i >= 0; i--) {
					if(flavorSelectors[i].flavor._id ==  extra._id){
						flavorSelectors[i].deselect();
						break;
					}
				}
			}*/
			
			if(selected.length == 2){
				if(!ready){
					for (var i = flavorSelectors.length - 1; i >= 0; i--) {
						if(!flavorSelectors[i].selected)
							flavorSelectors[i].active = false
					};
					ready = true;
					readySignal.dispatch(self);
				}
			}
			else{
				if(ready){
					for (var i = flavorSelectors.length - 1; i >= 0; i--) {
						flavorSelectors[i].active = true
					};
					ready = false;
					unreadySignal.dispatch(self);
				}
			}
			changedSignal.dispatch(self);
		}
		var getNode = function(){
			return node;
		}
		var getSelected = function(){
			return selected;
		}
		var getChangedSignal = function(){
			return changedSignal;
		}
		var getReadySignal = function(){
			return readySignal;
		}
		var getUnreadySignal = function(){
			return unreadySignal;
		}

		Object.defineProperty(self, 'reset', {
			value: reset
		});
		Object.defineProperty(self, 'node', {
			get: getNode
		});
		Object.defineProperty(self, 'selected', {
			get: getSelected
		});
		Object.defineProperty(self, 'changedSignal', {
			get: getChangedSignal
		});
		Object.defineProperty(self, 'readySignal', {
			get: getReadySignal
		});
		Object.defineProperty(self, 'unreadySignal', {
			get: getUnreadySignal
		});

		init();
	}
	return FlavorGroup;
});