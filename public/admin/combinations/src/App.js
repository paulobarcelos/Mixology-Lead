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
		action = 'combinations'; 

		var setup = function(){	
			self.setFPS(0);

			var formContainer = document.createElement('div');
			self.container.appendChild(formContainer);

			var flavor1 = document.createElement('input');
			flavor1.type = 'text';
			flavor1.placeholder = 'flavor1';
			formContainer.appendChild(flavor1);

			var flavor2 = document.createElement('input');
			flavor2.type = 'text';
			flavor2.placeholder = 'flavor2';
			formContainer.appendChild(flavor2);

			var flavor3 = document.createElement('input');
			flavor3.type = 'text';
			flavor3.placeholder = 'flavor3';
			formContainer.appendChild(flavor3);

			var rating = document.createElement('input');
			rating.type = 'text';
			rating.placeholder = 'rating';
			formContainer.appendChild(rating);

			var comment = document.createElement('input');
			comment.type = 'text';
			comment.placeholder = 'comment';
			formContainer.appendChild(comment);

			var userId = document.createElement('input');
			userId.type = 'text';
			userId.placeholder = 'userId';
			formContainer.appendChild(userId);

			var created = document.createElement('input');
			created.type = 'text';
			created.placeholder = 'created';
			formContainer.appendChild(created);


			var addBtn = document.createElement('button');
			addBtn.innerHTML = 'add';
			formContainer.appendChild(addBtn);			
			addBtn.addEventListener('click', function(){
				var data = {
					flavorIds: [flavor1.value,flavor2.value,flavor3.value],
					rating: rating.value,
					comment: comment.value,
					userId: userId.value,
					created: created.value
				}
				add(data);
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
			console.log(data)

			var flavor1 = document.createElement('input');
			flavor1.type = 'text';
			flavor1.placeholder = 'flavor1';
			flavor1.value = data.flavorIds[0] || '';
			item.appendChild(flavor1);

			var flavor2 = document.createElement('input');
			flavor2.type = 'text';
			flavor2.placeholder = 'flavor2';
			flavor2.value = data.flavorIds[1] || '';
			item.appendChild(flavor2);

			var flavor3 = document.createElement('input');
			flavor3.type = 'text';
			flavor3.placeholder = 'flavor3';
			flavor3.value = data.flavorIds[2] || '';
			item.appendChild(flavor3);

			var rating = document.createElement('input');
			rating.type = 'text';
			rating.placeholder = 'rating';
			rating.value = data.rating;
			item.appendChild(rating);

			var comment = document.createElement('input');
			comment.type = 'text';
			comment.placeholder = 'comment';
			comment.value = data.comment;
			item.appendChild(comment);

			var userId = document.createElement('input');
			userId.type = 'text';
			userId.placeholder = 'user';
			userId.value = data.userId;
			item.appendChild(userId);

			var created = document.createElement('input');
			created.type = 'text';
			created.placeholder = 'created';
			created.value = data.created;
			item.appendChild(created);


			var updateBtn = document.createElement('button');
			updateBtn.innerHTML = 'update';
			updateBtn.addEventListener('click', function(){
				var _data = {
					flavorIds: [flavor1.value,flavor2.value,flavor3.value],
					rating: rating.value,
					comment: comment.value,
					userId: userId.value,
					created: created.value
				}
				update(data._id, _data);
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

		var add = function(data){
			ajax({
				url: host + 'api/' + action,
				method: 'POST',
				headers: {'Content-type': 'application/json'},
				data: JSON.stringify(data),
				onSuccess: refresh
			});
		}
		var update = function(id, data){
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