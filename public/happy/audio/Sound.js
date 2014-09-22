define(
[
	'happy/audio/Node',
	'happy/utils/console',
	'../_libs/signals'
],
function
(
	Node,
	console,
	Signal
){
	"use strict";
	var Sound = function(audioContext){
		var
		self = this,
		rootNode,
		source,
		scheduledPlayTime,
		scheduledStopTime,
		played = new Signal(),
		stopped = new Signal();


		var play = function(when){
			scheduledPlayTime = when || audioContext.currentTime;
			source.noteOn(scheduledPlayTime);
			played.dispatch(scheduledPlayTime);
		}
		var stop = function(when){
			scheduledStopTime = when || audioContext.currentTime;;
			source.noteOff(scheduledStopTime);
			stopped.dispatch(scheduledStopTime);			
		}
		var refreshSource = function() {
			// Store current outputs
			var outputs = [];
			if(rootNode){
				outputs = rootNode.outputs;
				rootNode.disconnectAll();
			}
			// Regenerate the source and create a fresh
			// rootNode from that source
			source = self.createSource();
			rootNode = new Node(source);
			
			// If there were any previous outputs, connect to them
			for (var i = 0; i < outputs.length; i++) {
				var output = outputs[i];
				rootNode.connect(output.node, output.outputIndex, output.inputIndex);
			}
		}
		var getSource = function(){
			return source;
		}
		var setSource = function(value){
			source = value;
		}
		var getRoot = function() {
			return rootNode;
		}
		var setRoot = function(value) {
			rootNode = value;
		}
		var getTerminals = function() {
			var terminalNodes = [];
			var startOutputs = [rootNode];
			transverseTerminalNodes(startOutputs, function(node) {
				terminalNodes.push(node);
			});
			return terminalNodes;
		}
		var getScheduledPlayTime = function() {
			return scheduledPlayTime;
		}
		var getScheduledStopTime = function() {
			return scheduledStopTime;
		}
		var getPlayedSignal = function() {
			return played;
		}
		var getStoppedSignal = function() {
			return stopped;
		}
		var transverseTerminalNodes = function(array, callback) {
			for (var i = 0; i < array.length; i++) {
				var outputs = array[i].outputs;
				if(!outputs.length){
					callback.apply(self, [array[i]]);
				}			
				else{
					transverseTerminalNodes(outputs, callback);
				}
					
			}
		}
		var defaultCreateSource = function () {
			console.log('createSource Function not implemented, source will be set to null.');
		}

		Object.defineProperty(self, 'play', {
			value: play
		});
		Object.defineProperty(self, 'stop', {
			value: stop
		});
		Object.defineProperty(self, 'refreshSource', {
			value: refreshSource
		});
		Object.defineProperty(self, 'defaultCreateSource', {
			value: defaultCreateSource
		});
		Object.defineProperty(self, 'source', {
			get: getSource,
			set: setSource
		});
		Object.defineProperty(self, 'root', {
			get: getRoot,
			set: setRoot
		});
		Object.defineProperty(self, 'terminals', {
			get: getTerminals,
		});
		Object.defineProperty(self, 'scheduledPlayTime', {
			get: getScheduledPlayTime,
		});
		Object.defineProperty(self, 'scheduledStopTime', {
			get: getScheduledStopTime,
		});
		// expose signals
		Object.defineProperty(self, 'played', {
			get: getPlayedSignal,
		});
		Object.defineProperty(self, 'stopped', {
			get: getStoppedSignal,
		});
	}
	return Sound;
});