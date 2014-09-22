define(
[
	'happy/utils/dom',

	'happy/_libs/mout/array/forEach',
	'happy/_libs/mout/array/unique',
	'happy/_libs/signals',

	'GroupSelector',
	'FlavorGroup'
],
function (
	dom,

	forEach,
	unique,
	Signal,

	GroupSelector,
	FlavorGroup

){
	var CombinationSelector = function(flavors){
		var 
		self = this,
		node,
		groupSelectorsNode,
		flavorsNode,

		namesNode,
		simpleFlavorsNamesNode,
		mainFlavorNameNode,

		mainFlavor,
		groups,
		groupsIds,
		groupSelectors,
		flavorGroups,

		selected,
		ready,
		readySignal,
		unreadySignal,
		groupChangedSignal,
		changedSignal;

		var init = function(){
			node = document.createElement('div');
			dom.addClass(node, 'combination-selector');

			mainFlavor = flavors.shift();
			parseFlavors(flavors);

			groupSelectorsNode = document.createElement('div');
			dom.addClass(groupSelectorsNode, 'tabs');
			node.appendChild(groupSelectorsNode);

			flavorsNode = document.createElement('div');
			dom.addClass(flavorsNode, 'group-container');
			node.appendChild(flavorsNode);

			namesNode = document.createElement('div');
			dom.addClass(namesNode, 'names');

			simpleFlavorsNamesNode = document.createElement('div');
			dom.addClass(simpleFlavorsNamesNode, 'simple');
			namesNode.appendChild(simpleFlavorsNamesNode);
			
			mainFlavorNameNode = document.createElement('div');
			dom.addClass(mainFlavorNameNode, 'main');
			mainFlavorNameNode.innerHTML = mainFlavor.name;
			namesNode.appendChild(mainFlavorNameNode);

			ready = false;
			selected = [];
			readySignal = new Signal();
			unreadySignal = new Signal();
			groupChangedSignal = new Signal();
			changedSignal = new Signal();

			groupSelectors = {};
			flavorGroups = {};
			groupsIds.forEach( function (id){
				flavorGroups[id] = new FlavorGroup(groups[id]);
				flavorGroups[id].changedSignal.add(onFlavorGroupChanged);
				

				groupSelectors[id] = new GroupSelector(id);
				groupSelectors[id].selectedSignal.add(onGroupSelected);

				groupSelectorsNode.appendChild(groupSelectors[id].node);

			});

			reset();

			groupSelectors[groupsIds[0]].select();
		
		}
		var onGroupSelected = function(group){
			for(id in groups){
				if(id != group.id) groupSelectors[id].deselect();
			}
			dom.empty(flavorsNode);
			flavorsNode.appendChild(flavorGroups[group.id].node);
			flavorsNode.appendChild(namesNode);

			selected = flavorGroups[group.id].selected;

			groupChangedSignal.dispatch(self);
			processChange();
		}
		var onFlavorGroupChanged = function (flavorGroup) {
			selected = flavorGroup.selected;
			processChange();
		}
		var processChange = function(){
			dom.empty(simpleFlavorsNamesNode);
			forEach(selected, function(flavor){
				var nameNode = document.createElement('div');
				nameNode.innerHTML = flavor.name;
				simpleFlavorsNamesNode.appendChild(nameNode);
			});

			if(selected.length == 2){
				if(!ready){
					ready = true;
					readySignal.dispatch(self);
				}
			}
			else{
				if(ready){
					ready = false;
					unreadySignal.dispatch(self);
				}
			}

			changedSignal.dispatch(self);
		}
		var parseFlavors = function(flavors){
			groups = {};
			groupsIds = []

			for (var i = 0; i < flavors.length; i++) {
				var flavor = flavors[i];
				for (var j = 0; j < flavor.groups.length; j++) {
					var group = flavor.groups[j];
					if(!groups[group]) groups[group] = [];
					groups[group].push(flavor);
					groupsIds.push(group);
				}
			};
			groupsIds = unique(groupsIds);
			groupsIds.reverse();
			return groups;
		}
		var reset = function () {
			for(id in groups){
				flavorGroups[id].reset();
			}
			/*for(id in groups){
				groupSelectors[id].select();
				break;
			}*/
		}
		var getNode = function(){
			return node;
		}
		var getReady = function(){
			return ready;
		}
		var getGroupChangedSignal = function(){
			return groupChangedSignal;
		}
		var getReadySignal = function(){
			return readySignal;
		}
		var getUnreadySignal = function(){
			return unreadySignal;
		}
		var getSelected = function(){
			var ids = [];
			ids.push(mainFlavor._id);
			for (var i = 0; i < selected.length; i++) {
				ids.push(selected[i]._id);
			};
			return ids;
		}

		Object.defineProperty(self, 'reset', {
			value: reset
		});
		Object.defineProperty(self, 'node', {
			get: getNode
		});
		Object.defineProperty(self, 'ready', {
			get: getReady
		});
		Object.defineProperty(self, 'readySignal', {
			get: getReadySignal
		});
		Object.defineProperty(self, 'unreadySignal', {
			get: getUnreadySignal
		});
		Object.defineProperty(self, 'groupChangedSignal', {
			get: getGroupChangedSignal
		});
		Object.defineProperty(self, 'selected', {
			get: getSelected
		});

		init();
	}
	return CombinationSelector;
});