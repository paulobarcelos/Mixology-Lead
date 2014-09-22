define(
[
],
function (
){
	var Database = function(){
		var 
		self = this,
		
		flavors,
		flavorsById,

		combinations,
		combinationsByUid,
		combinationsByRating,
		tree;

		var init = function(){
			flavors = [];
			flavorsById = {}
			combinations = [];
			combinationsByUid = {};
			combinationsByRating = {};
			tree = {};
		}
		var add = function(data){
			combinations = combinations.concat(data)

			tree = {};
			combinationsByUid = {};
			combinationsByRating = {};
			flavors.forEach(function(flavor, index){
				flavorsById[flavor._id].combinations = [];
			});
			combinations.forEach(function (combination) {
				combination.flavors = [];			
			});

			combinations.forEach(function (combination) {
				combination.flavorIds.forEach(function (id){
					flavorsById[id].combinations.push(combination);
					if(!combination.flavors) combination.flavors = [];
					combination.flavors.push(flavorsById[id]);
				});
				
				var uid = generateCombinationUID(combination);
				combination.uid = uid
				if(!combinationsByUid[uid]) combinationsByUid[uid] = [];
				combinationsByUid[uid].push(combination);

				var rating = combination.rating;
				if(!combinationsByRating[rating]) combinationsByRating[rating] = [];
				combinationsByRating[rating].push(combination);				
			});

			combinations.forEach(function(combination){
				combination.flavors.sort(sortByCombinationCount);
				growBranch(tree, combination, combination.flavors.slice(0));
				//tree.flavorIdsByCreationDate.sort(sortByFlavorCreationDate);
			});
		}
		var growBranch = function(parent, combination, flavors){
			parent.branchesByFlavorId = parent.branchesByFlavorId || {};
			parent.branchesSortedByBranchCount = parent.branchesSortedByBranchCount || [];
			parent.flavorIdsSortedByCreationDate = parent.flavorIdsSortedByCreationDate || [];
			parent.combinations = parent.combinations || [];
			if(typeof parent.branchCount == "undefined") parent.branchCount = 0;
			
			parent.combinations.push(combination);
			var flavor = flavors.shift();

			if(flavor){
				if(!parent.branchesByFlavorId[flavor._id]) {
					parent.branchesByFlavorId[flavor._id] = {};
					parent.flavorIdsSortedByCreationDate.push(flavor._id);
					parent.branchesSortedByBranchCount.push(parent.branchesByFlavorId[flavor._id]);
					parent.branchCount ++;
				}
				growBranch(parent.branchesByFlavorId[flavor._id], combination, flavors);
				parent.branchesByFlavorId[flavor._id].flavorIdsSortedByCreationDate.sort(sortByFlavorCreationDate);
				parent.branchesByFlavorId[flavor._id].branchesSortedByBranchCount.sort(sortByBranchCount);
			}
		}
		var setFlavors = function (value) {
			flavors = value;
			flavors.forEach(function(flavor, index){
				flavor.combinations = [];
				flavor.index = index;
				flavorsById[flavor._id] = flavor;
			});
		}
		var getFlavors = function (){
			return flavors;
		}
		var getFlavorsById = function(){
			return flavorsById;
		}
		var getCombinations = function(){
			return combinations;
		}
		var getCombinationsByUid = function(){
			return combinationsByUid;
		}
		var getCombinationsByRating = function(){
			return combinationsByRating;
		}
		var getTree = function(){
			return tree;
		}
		var sortByCombinationCount = function(a,b){
			return b.combinations.length - a.combinations.length;
		}
		var sortByIndex = function(a,b){
			return a.index - b.index;
		}
		var sortByUIDCombinationCount = function(a,b){
			return combinationsByUid[b].length; - combinationsByUid[a].length;
		}
		var sortByBranchCount = function(a,b){
			return b.branchCount - a.branchCount;
		}
		var generateCombinationUID = function(combination){
			combination.flavors.sort(sortByIndex);
			var uid = '';
			combination.flavors.forEach(function(flavor){
				uid += flavor._id;
			});
			return uid;
		}
		var sortByFlavorCreationDate = function(a,b){
			return (new Date(flavorsById[b].created)).getTime() - (new Date(flavorsById[a].created)).getTime();
		}

		Object.defineProperty(self, 'add', {
			value: add
		});
		Object.defineProperty(self, 'flavors', {
			set: setFlavors,
			get: getFlavors
		});
		Object.defineProperty(self, 'flavorsById', {
			get: getFlavorsById
		});
		Object.defineProperty(self, 'combinations', {
			get: getCombinations
		});
		Object.defineProperty(self, 'combinationsByUid', {
			get: getCombinationsByUid
		});
		Object.defineProperty(self, 'combinationsByRating', {
			get: getCombinationsByRating
		});
		Object.defineProperty(self, 'tree', {
			get: getTree
		});
		
		init();
	}
	return Database;
});