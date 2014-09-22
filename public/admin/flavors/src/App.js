define(
[
	'happy/app/BaseApp',
	'happy/utils/ajax',

	'happy/_libs/mout/array/forEach',
	'happy/_libs/mout/array/indexOf'
],
function (
	BaseApp,
	ajax,
	forEach,
	indexOf
){
	var App = function(){
		var 
		self = this,
		container,
		host = "http://mixology.eu01.aws.af.cm/",
		//host = "http://127.0.0.1:8000/",
		action = 'flavors'; 

		var setup = function(){	
			self.setFPS(0);

			var formContainer = document.createElement('div');
			self.container.appendChild(formContainer);

			var name = document.createElement('input');
			name.type = 'text';
			name.placeholder = 'name';
			formContainer.appendChild(name);

			var color = document.createElement('input');
			color.type = 'text';
			color.placeholder = 'color';
			formContainer.appendChild(color);

			var groups = document.createElement('input');
			groups.type = 'text';
			formContainer.appendChild(groups);

			var addBtn = document.createElement('button');
			addBtn.innerHTML = 'add';
			formContainer.appendChild(addBtn);			
			addBtn.addEventListener('click', function(){
				add(name.value, color.value, groups.value.split(','));
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
			forEach(data, createSingle);
		}
		var createSingle = function(data){
			var item = document.createElement('div');
			item.style.color = data.color;
			item.style.backgroundColor	 = data.color;
			item.id = data._id; 

			var name = document.createElement('input');
			name.type = 'text';
			name.value = data.name;
			item.appendChild(name);

			var color = document.createElement('input');
			color.type = 'text';
			color.value = data.color;
			item.appendChild(color);

			var groups = document.createElement('input');
			groups.type = 'text';
			groups.value = data.groups;
			item.appendChild(groups);

			var created = document.createElement('input');
			created.type = 'text';
			created.value = data.created;
			item.appendChild(created);

			var updateBtn = document.createElement('button');
			updateBtn.innerHTML = 'update';
			updateBtn.addEventListener('click', function(){
				update(data._id, name.value, color.value, groups.value.split(','), created.value);
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

		var add = function(name, color, groups){
			var data = {
				name: name,
				color: color,
				groups: groups
			}

			ajax({
				url: host + 'api/' + action,
				method: 'POST',
				headers: {'Content-type': 'application/json'},
				data: JSON.stringify(data),
				onSuccess: refresh
			});
		}
		var update = function(id, name, color, groups, created){
			var data = {
				name: name,
				color: color,
				groups: groups,
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