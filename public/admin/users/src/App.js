define(
[
	'happy/app/BaseApp',

	'happy/utils/browser',
	'happy/utils/ajax',

	'happy/_libs/mout/array'
],
function (
	BaseApp,
	browser,
	ajax,
	arrayUtils
){
	var App = function(){
		var 
		self = this,
		container,
		host = "http://mixology.eu01.aws.af.cm/",
		//host = "http://127.0.0.1:8000/",
		action = 'users'; 

		var setup = function(){	
			self.setFPS(0);

			var formContainer = document.createElement('div');
			self.container.appendChild(formContainer);

			var browserField = document.createElement('input');
			browserField.type = 'text';
			browserField.placeholder = 'browser';
			formContainer.appendChild(browserField);
			var browserInfo = browser.getInfo();
			browserField.value = browserInfo.name + '_' + browserInfo.version + '_' + browserInfo.os;

			var addBtn = document.createElement('button');
			addBtn.innerHTML = 'add';
			formContainer.appendChild(addBtn);			
			addBtn.addEventListener('click', function(){
				add(browserField.value);
			});

			var deleteAllBtn = document.createElement('button');
			deleteAllBtn.innerHTML = 'DELETE ALL';
			formContainer.appendChild(deleteAllBtn);			
			deleteAllBtn.addEventListener('click', function(){
				if(confirm("Do you really wanna delete?"))	removeAll();
			});

			container = document.createElement('div');
			self.container.appendChild(container);

			refresh();
		}

		var refresh = function(){
			ajax({
				url: host + 'api/' + action + '?'+(new Date()).getTime() ,
				onSuccess: function(request){
					createList(JSON.parse(request.responseText));
				}
			})
		}
		var createList = function(data){
			while (container.hasChildNodes()) {
				container.removeChild(container.lastChild);
			}
			arrayUtils.forEach(data, createSingle);
		}
		var createSingle = function(data){
			var item = document.createElement('div');

			var browserField = document.createElement('input');
			browserField.type = 'text';
			browserField.value = data.browser;
			browserField.placeholder = 'browser';
			item.appendChild(browserField);

			var createdField = document.createElement('input');
			createdField.type = 'text';
			createdField.value = data.created;
			createdField.placeholder = 'created';
			item.appendChild(createdField);

			var updateBtn = document.createElement('button');
			updateBtn.innerHTML = 'update';
			updateBtn.addEventListener('click', function(){
				update(data._id, browserField.value, createdField.value);
			});
			item.appendChild(updateBtn);

			var delBtn = document.createElement('button');
			delBtn.innerHTML = 'remove';
			delBtn.addEventListener('click', function(){
				remove(data._id);
			});	
			item.appendChild(delBtn);		

			container.appendChild(item);
		}

		var add = function(browser){
			var data = {
				browser: browser
			}
			ajax({
				url: host + 'api/' + action,
				method: 'POST',
				headers: {'Content-type': 'application/json'},
				data: JSON.stringify(data),
				onSuccess: refresh
			});
		}
		var update = function(id, browser, created){
			var data = {
				browser: browser,
				created: created
			}

			ajax({
				url: host + 'api/' + action + '/' + id,
				method: 'PUT',
				headers: {'Content-type': 'application/json'},
				data: JSON.stringify(data),
				onSuccess: refresh
			});
		}
		var remove = function(id){
			ajax({
				url: host + 'api/' + action + '/' + id,
				method: 'DELETE',
				onSuccess: refresh
			})
		}

		var removeAll = function(){
			ajax({
				url: host + 'api/' + action + '/',
				method: 'DELETE',
				onSuccess: refresh
			})
		}

		self.setup = setup;
	}
	App.prototype = new BaseApp();
	return App;
});