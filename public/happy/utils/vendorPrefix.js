define(
[
	'../utils/console',
	'../_libs/mout/array/forEach',
	'../_libs/mout/array/combine',
	'../_libs/mout/string/pascalCase'
],
function(
	console,
	forEach,
	combine,
	pascalCase
) {	
	var prefixes = [
		'WebKit',
		'Moz',
		'O',
		'Ms'
	];

	// cache prefix variations
	var
	classPrefixes = [],
	methodPrefixes = [];
	forEach(prefixes, function(prefix){
		classPrefixes.push(pascalCase(prefix));
		methodPrefixes.push(prefix.toLowerCase());
	});
	var allPrefixes = combine(classPrefixes, methodPrefixes);

	var getValid = function(standard, context) {
		if(!standard) return;
		var pascalStandard = pascalCase(standard);
		context = context || window;

		var valid = context[standard];
		if(typeof valid === "undefined"){
			for (var i = 0; i < allPrefixes.length; i++) {
				valid = context[allPrefixes[i] + pascalStandard];
				if(typeof valid !== "undefined") break;
			};
		}
		if(typeof valid === "undefined"){
			console.log(standard + ' is not implemented.');
		}
		
		return valid;
	}
		
	return {
		getValid: getValid
	}
});