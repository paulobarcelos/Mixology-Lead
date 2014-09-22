var static = require('node-static');
var file = new static.Server('./public', {cache:0});

require('http').createServer(function (request, response) {

	if(request.url == '/'){
		response.writeHead(302,	{Location: '/station'});
		response.end();
		return;
	}

	request.addListener('end', function () {
		file.serve(request, response);
	});
	
}).listen(process.env.VCAP_APP_PORT || process.env.PORT || 8080);