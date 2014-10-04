define(
[
	'happy/app/BaseApp',
	'happy/utils/keyCode',

	'DataLoader',
	'Database',
	'TreeView',
	'TreeViewTimeline',
	'FeaturedCombinations',
	'FlavorBars',
	'CombinationRanking'
],
function (
	BaseApp,
	keyCode,

	DataLoader,
	Database,
	TreeView,
	TreeViewTimeline,
	FeaturedCombinations,
	FlavorBars,
	CombinationRanking
){
	var App = function(){
		var 
		self = this,
		database,
		treeView,
		treeViewTimeline,
		featuredCombinations,
		flavorBars,
		combinationRankingPositive,
		combinationRankingNegative,
		currentScreen,
		host = (window.location.hostname.indexOf('localhost') > -1) ?  
			"http://127.0.0.1:8000/" : 'http://mixology-api-lead.herokuapp.com/';

		var setup = function(){	
			//self.setFPS(0);

			database = new Database();

			treeView = new TreeView(self.container);		
			featuredCombinations = new FeaturedCombinations(self.container);
			flavorBars = new FlavorBars(self.container);
			combinationRankingPositive = new CombinationRanking(self.container, "awesome", true);
			combinationRankingNegative = new CombinationRanking(self.container, "awful", false);

			var dataLoader = new DataLoader({
				api: host + 'api/',
				flavors: 'flavors',
				combinations: 'combinations'
			})
			dataLoader.combinationsUpdatedSignal.add(onCombinationsUpdated);
			dataLoader.flavorsLoadedSignal.add(onFlavorsLoaded);

			treeViewTimeline = new TreeViewTimeline(self.container, dataLoader);

			dataLoader.load();	

					
		}

		var onFlavorsLoaded = function(loader){
			console.log('flavors',loader.flavors);
			database.flavors = loader.flavors;
			treeView.flavorsById = database.flavorsById;
			treeViewTimeline.flavorsById = database.flavorsById;
			flavorBars.flavorsById = database.flavorsById;
			combinationRankingPositive.flavorsById = database.flavorsById;
			combinationRankingNegative.flavorsById = database.flavorsById;
		}

		var firstRun = true;
		var onCombinationsUpdated = function(loader){
			console.log('combinations',loader.latestCombinations);
			database.add(loader.latestCombinations);
			treeView.data = database.tree;
			featuredCombinations.combinations = database.combinations;
			flavorBars.combinations = database.combinations;
			combinationRankingPositive.combinations = database.combinations;
			combinationRankingPositive.combinationsByUid = database.combinationsByUid;
			combinationRankingNegative.combinations = database.combinations;
			combinationRankingNegative.combinationsByUid = database.combinationsByUid;

			if(treeView.isAnimating) treeView.render();
			if(firstRun){
				firstRun = false;
				
				featuredCombinations.stopSignal.addOnce(onFeaturedCombinationsStop);
				featuredCombinations.start();
				currentScreen = featuredCombinations;
			}
		}

		var onResize = function(size){
			treeView.size = size;
			treeViewTimeline.size = size;
			featuredCombinations.size = size;
			flavorBars.size = size;
			combinationRankingPositive.size = size;
			combinationRankingNegative.size = size;
		}

		var onFeaturedCombinationsStop = function(){
			featuredCombinations.stopSignal.remove(onFeaturedCombinationsStop);
			currentScreen = treeView;
			treeView.stopSignal.add(onTreeViewStop);
			treeView.start(0,5);
		}
		var onTreeViewStop = function(){
			treeView.stopSignal.remove(onTreeViewStop);
			currentScreen = featuredCombinations;
			featuredCombinations.stopSignal.add(onFeaturedCombinationsStop);
			featuredCombinations.start();
		}

		
		var onKeyUp = function(e) {	
			switch(keyCode.codeToChar(e.keyCode)){
				case 'SPACEBAR':
					self.toggleFullscreen();					
					break;
				case '0':
					removeAllSignals();			
					break;
				case '1':
					removeAllSignals();
					currentScreen.exit(treeViewTimeline.start());
					currentScreen = treeViewTimeline;
					break;
				case '2':
					removeAllSignals();	
					currentScreen.exit(flavorBars.start());
					currentScreen = flavorBars;			
					break;
				case '3':
					removeAllSignals();	
					currentScreen.exit(combinationRankingPositive.start());
					currentScreen = combinationRankingPositive;				
					break;
				case '4':
					removeAllSignals();		
					currentScreen.exit(combinationRankingNegative.start());
					currentScreen = combinationRankingNegative;				
					break;
				case '5':
					removeAllSignals();	
					combinationRankingNegative.exit();			
					break;
				case '9':
					removeAllSignals();	
					featuredCombinations.resetUsedIds();

					featuredCombinations.stopSignal.addOnce(onFeaturedCombinationsStop);
					featuredCombinations.start();
					featuredCombinations.maxCount = 99999;		
					break;
			}
		}

		var removeAllSignals = function(){
			treeView.stopSignal.removeAll();
			featuredCombinations.stopSignal.removeAll();
			flavorBars.stopSignal.removeAll();
		}

		var update = function(dt){
			treeView.update(dt);
			featuredCombinations.update(dt);
		}
		var draw = function(dt){
			
		}

		self.setup = setup;
		self.update = update;
		self.draw = draw;
		self.onResize = onResize;
		self.onKeyUp = onKeyUp;
	}
	App.prototype = new BaseApp();
	return App;
});