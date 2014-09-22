define(
[
	'happy/utils/dom',

	'happy/_libs/mout/array/forEach',
	'happy/_libs/signals'
],
function (
	dom,

	forEach,
	Signal
){
	var CommentSelector = function(){
		var 
		self = this,
		node,
		keyNode,
		valueNode,
		sendNode,
		sendSignal;

		var init = function(){
			var isTouch = 'ontouchstart' in document.documentElement;

			node = document.createElement('form');
			node.action = "#";
			node.method = "GET";
			dom.addClass(node, 'comment');
			node.addEventListener('submit', sendRequested);

			valueNode = document.createElement('input');
			valueNode.type = 'text';
			valueNode.placeholder = 'This is...';
			valueNode.autocomplete = "off";
			valueNode.autocorrect = "off";
			valueNode.autocapitalize = "off";
			valueNode.spellcheck = "false";
			dom.addClass(valueNode, 'value');
			node.appendChild(valueNode);

			sendNode = document.createElement('div');
			sendNode.innerHTML = 'Send';
			dom.addClass(sendNode, 'send');
			node.appendChild(sendNode);
	

			sendNode.addEventListener((isTouch) ? 'touchstart':'click', sendRequested);

			sendSignal = new Signal();

			reset();
		}

		var sendRequested = function (e) {
			valueNode.blur();
			e.preventDefault();
			sendSignal.dispatch(self);
		}
		var reset = function () {
			valueNode.value = '';
		}
		var getNode = function(){
			return node;
		}
		var getValue = function(){
			return valueNode.value;
		}
		var getSendSignal = function(){
			return sendSignal;
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
		Object.defineProperty(self, 'sendSignal', {
			get: getSendSignal
		});

		init();
	}
	return CommentSelector;
});