define(
[
	'happy/utils/dom',
	'happy/utils/vendorPrefix'
],
function (
	dom,
	vendorPrefix
){
	var Transformer = function(node){
		var 
		self = this,
		transformation;

		var init = function(){
			transformation = {
				scaleX: 1,
				scaleY: 1,
				scaleZ: 1,

				translationX: '0px',
				translationY: '0px',
				translationZ: '0px',

				rotationX: '0',
				rotationY: '0',
				rotationZ: '0',
				rotationAngle: '0deg',

				originX: '50%',
				originY: '50%',
				originZ: '50%'
			}
			applyTransformation();
		}

		var translate = function(x, y, z, sufix){
			if(typeof sufix === 'undefined') sufix = 'px';
			transformation.translationX = x + sufix;
			transformation.translationY = y + sufix;
			transformation.translationZ = z + sufix;
			applyTransformation();
		}
		var scale = function(x, y, z){
			transformation.scaleX = x;
			transformation.scaleY = y;
			transformation.scaleZ = z;
			applyTransformation();
		}
		var rotate = function(x, y, z, angle, sufix){
			if(typeof sufix === 'undefined') sufix = 'deg';
			transformation.rotationX = x;
			transformation.rotationY = y;
			transformation.rotationZ = z;
			transformation.rotationAngle = angle + sufix;
			applyTransformation();
		}
		var origin = function(x, y, z, sufix){
			if(typeof sufix === 'undefined') sufix = '%';
			transformation.originX = x + sufix;
			transformation.originY = y + sufix;
			transformation.originZ = z + sufix;
			applyTransformation();
		}
		var opacity = function(alpha){
			node.style.opacity = alpha;
		}
		var applyTransformation = function(){
			node.style.WebkitTransform  = ''
				+ 'translate3d(' + transformation.translationX + ',' + transformation.translationY + ',' + transformation.translationZ + ') '
				+ 'rotate3d(' + transformation.rotationX + ',' + transformation.rotationY + ',' + transformation.rotationZ + ',' + transformation.rotationAngle + ')' 
				+ 'scale3d(' + transformation.scaleX + ',' + transformation.scaleY + ',' + transformation.scaleZ + ') ';
				
			node.style.WebkitTransformOriginX =  transformation.originX;
			node.style.WebkitTransformOriginY =  transformation.originY;
			node.style.WebkitTransformOriginZ =  transformation.originZ;
		}

		var getTransformation = function(){
			return transformation;
		}

		Object.defineProperty(self, 'translate', {
			value: translate
		});
		Object.defineProperty(self, 'scale', {
			value: scale
		});
		Object.defineProperty(self, 'rotate', {
			value: rotate
		});
		Object.defineProperty(self, 'origin', {
			value: origin
		});
		Object.defineProperty(self, 'opacity', {
			value: opacity
		});
		Object.defineProperty(self, 'transformation', {
			get: getTransformation
		});
		
		init();
	}
	return Transformer;
});