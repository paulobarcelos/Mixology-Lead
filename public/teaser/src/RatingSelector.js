define(
[
	'happy/utils/dom',

	'happy/_libs/mout/array/forEach',
],
function (
	dom,

	forEach
){
	var RatingSelector = function(){
		var 
		self = this,
		node,
		keyNode,
		valueNode,
		items,
		selectedItem;

		var init = function(){
			node = document.createElement('div');
			dom.addClass(node, 'rating');

			keyNode = document.createElement('div');
			dom.addClass(keyNode, 'key');
			keyNode.innerHTML = 'Rate';
			node.appendChild(keyNode);

			valueNode = document.createElement('div');
			dom.addClass(valueNode, 'value');
			node.appendChild(valueNode);

			items = [];
			forEach([1,2,3,4,5], function (amount) {
				var item = {
					value: amount,
					node: document.createElement('div')
				}
				var isTouch = 'ontouchstart' in document.documentElement;
				item.node.addEventListener((isTouch) ? 'touchstart':'click', function(){
					onClick(item)
				});
				valueNode.appendChild(item.node);
				items.push(item);
			});

			reset();
		}
		var onClick = function (_selectedItem) {
			document.activeElement.blur();
			selectedItem = _selectedItem;
			forEach(items, function (item) {
				if(item.value <= selectedItem.value){
					dom.addClass(item.node, 'selected')
				}
				else{
					dom.removeClass(item.node, 'selected')
				}
			})
		}
		var reset = function () {
			onClick({value:0});
		}
		var getNode = function(){
			return node;
		}
		var getValue = function(){
			return selectedItem.value;
		}

		Object.defineProperty(self, 'reset', {
			value: reset
		});

		Object.defineProperty(self, 'node', {
			get: getNode
		});

		Object.defineProperty(self, 'value', {
			get: getValue
		});

		init();
	}
	return RatingSelector;
});