define(
[
	'happy/utils/dom',

	'happy/_libs/mout/array/forEach',
],
function (
	dom,

	forEach
){
	var EndScreen = function(container){
		var 
		self = this,
		node,
		container

		var init = function(){
			node = document.createElement('div');
			dom.addClass(node, 'end-screen');
		}
		var go = function (rating) {

			var messages = [];
			messages[0] = ":)";
			messages[1] = ":s";
			messages[2] = ":\\";
			messages[3] = ":I";
			messages[4] = ": >";
			messages[5] = ";D";

			rating = rating || 0;
			rating = (rating > messages.length - 1 ) ? 0 : rating;

			node.innerHTML = messages[rating];
			container.appendChild(node);
			setTimeout(function() {container.removeChild(node);}, 2000);	
		}

		Object.defineProperty(self, 'go', {
			value: go
		});
		init();
	}
	return EndScreen;
});