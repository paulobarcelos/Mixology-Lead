define(
[
	'../utils/dom',
	'../utils/vendorPrefix',
	'../_libs/mout/object/merge',
	'../_libs/stats'
], 
function (
	dom,
	vendorPrefix,
	merge,
	stats
){
	"use strict";
	var Runner = function(app){
		var 
		self = this,
		container = app.container,
		time,
		appStats,
		updateStats,
		drawStats,
		currentLoop,
		currentRequestUpdate,
		// cache vendor specific stuff
		cancelFullScreen = function(){
			vendorPrefix.getValid('cancelFullScreen', document).apply(document);
		},
		requestAnimationFrame = vendorPrefix.getValid('requestAnimationFrame'),
		MutationObserver = vendorPrefix.getValid('MutationObserver');

		// Set container
		container.tabIndex = '1';
	
		// add event listeners
		container.addEventListener('keyup', function(e){
			app.onKeyUp.apply(app,[e]);
		}, false);
		container.addEventListener('keydown', function(e){
			app.onKeyDown.apply(app,[e]);
		}, false);
		container.addEventListener('mouseover', function(e){
			app.onMouseOver.apply(app,[e]);
		}, false);
		container.addEventListener('mouseout', function(e){
			app.onMouseOut.apply(app,[e]);
		}, false);
		container.addEventListener('mousedown', function(e){
			app.onMouseDown.apply(app,[e]);
		}, false);
		container.addEventListener('mouseup', function(e){
			app.onMouseUp.apply(app,[e]);
		}, false);
		container.addEventListener('mousemove', function(e){
			app.onMouseMove.apply(app,[e]);
		}, false);
		container.addEventListener('click', function(e){
			app.onClick.apply(app,[e]);
		}, false);
		container.addEventListener('dblclick', function(e){
			app.onDoubleClick.apply(app,[e]);
		}, false);
		
		// Monitor the object resizing is a bit more complex
		var size = dom.size(container);
		var monitorResize = function(){
			var newSize = dom.size(container);
			if(newSize.x != size.y || newSize.x != size.y){
				app.onResize.apply(app,[newSize]);
			}
			size = newSize;			
		}
		window.addEventListener('resize', monitorResize, false);
		window.addEventListener('scroll', monitorResize, false);
		if(MutationObserver){
			var mutationObserver = new MutationObserver(monitorResize);
			mutationObserver.observe(
				document.body,
				{
					subtree: true,
					childList: true,
					characterData: true,
					attribute: true
				}
			);
		}		

		// Fullscreen controls
		var _isFullscreen = false;
		app.enterFullscreen = function(){
			_isFullscreen = true;
			var requestFullScreen = function(){
				vendorPrefix.getValid('requestFullScreen', container).apply(container, [Element.ALLOW_KEYBOARD_INPUT]);
			}
			requestFullScreen();
			container.style.position = "fixed";
			container.style.top = "0";
			container.style.left = "0";
			container.style.width = "100%";
			container.style.height = "100%";
			container.style.minWidth = "100%";
			container.style.minHeight = "100%";
			container.style.maxWidth = "100%";
			container.style.maxHeight = "100%";
		}
		app.exitFullscreen = function(){
			_isFullscreen = false;
			container.removeAttribute('style');
			cancelFullScreen();
		}
		app.toggleFullscreen = function(){
			if(!_isFullscreen) app.enterFullscreen();
			else app.exitFullscreen();
		}
		app.isFullscreen = function(){
			return _isFullscreen;
		}

		// Dev Mode
		appStats = new stats();
		appStats.setMode(0);
		appStats.domElement.style.position = 'absolute';
		appStats.domElement.style.left = '0px';
		appStats.domElement.style.top = '0px';
		
		updateStats = new stats();
		updateStats.setMode(1);
		updateStats.domElement.style.position = 'absolute';
		updateStats.domElement.style.left = '80px';
		updateStats.domElement.style.top = '0px';
		
		drawStats = new stats();
		drawStats.setMode(1);
		drawStats.domElement.style.position = 'absolute';
		drawStats.domElement.style.left = '160px';
		drawStats.domElement.style.top = '0px';	

		app.enableDevMode = function(){
			app.devMode = true;
			container.appendChild(appStats.domElement);
			container.appendChild(updateStats.domElement);
			container.appendChild(drawStats.domElement);
			currentLoop = devLoop;
		}
		app.disableDevMode = function(){
			app.devMode = false;
			if(appStats.domElement.parentNode)appStats.domElement.parentNode.removeChild(appStats.domElement);
			if(updateStats.domElement.parentNode)updateStats.domElement.parentNode.removeChild(updateStats.domElement);
			if(drawStats.domElement.parentNode)drawStats.domElement.parentNode.removeChild(drawStats.domElement);
			currentLoop = normalLoop;
		}

		// FPS control
		app.setFPS = function(value){
			if(value < 0) value = 0;
			switch(value){
				case 'auto':
					if(requestAnimationFrame){
						currentRequestUpdate = requestAnimationFrame;
					}
					else{
						currentRequestUpdate = function(request){
							setTimeout(request, 1000 / value);
						}
					}					
					break;
				case 0:
					currentRequestUpdate = function(request){}
					break;
				default:
					currentRequestUpdate = function(request){
						setTimeout(request, 1000 / value);
					}
					break;
			}
		}

		function loop(){
			currentRequestUpdate(loop);
			var newTime = (new Date()).getTime() * 0.001;;
			var dt = (newTime - time);
			time = newTime;
			currentLoop(dt, time);
		}
		function devLoop(dt, time){
			appStats.update();
			updateStats.begin();
			app.update.apply(app, [dt, time]);
			updateStats.end();
			drawStats.begin();
			app.draw.apply(app, [dt, time]);
			drawStats.end();
		}
		function normalLoop(dt, time){
			app.update.apply(app, [dt, time]);
			app.draw.apply(app, [dt, time]);
		}
		app.disableDevMode.apply(app);
		app.setFPS('auto');
		app.setup.apply(app);
		app.onResize.apply(app,[size]);
		time = (new Date()).getTime() * 0.001;;
		loop();
	}
	return Runner;
});