#!/bin/env node
var express = require('express');
var fs      = require('fs');
var qs      = require('querystring');
var mysql	= require('mysql');

var ipaddress 	= process.env.OPENSHIFT_NODEJS_IP;
var port 		= process.env.OPENSHIFT_NODEJS_PORT || 8080;
var queue 		= [ ];
var confirm 	= { };
var arenas		= { };

if (typeof ipaddress === "undefined") {
	ipaddress = "127.0.0.1";
};

config = {
	host     : process.env.OPENSHIFT_MYSQL_DB_HOST,
	user     : process.env.OPENSHIFT_MYSQL_DB_USERNAME,
	pass     : process.env.OPENSHIFT_MYSQL_DB_PASSWORD,
	port     : process.env.OPENSHIFT_MYSQL_DB_PORT,
	database : 'aceeri'
}

var connection = mysql.createConnection(config);

connection.connect();

connection.on('close', function(err) {
	if (err) {
		connection = mysql.createConnection(config);
	} else {
		console.log('Connection closed normally.');
	}
});

var app  = express();
var id   = app.param("/^\d+$/");
var type = app.param("/^\w+$/");

app.use(express.bodyParser());

function dataQuery(query){
	var query = connection.query(query);

	query.on("error", function(err){
		throw err;
	})

	return query;
}

dataQuery("INSERT INTO queue VALUES (0, \"PiggyJingles\", 9999, 1020, 70918372, \"normal\");");

app.post('/join', function(req, res) {
	/*dataQuery("INSERT INTO queue VALUES (0,
		+ "\"" + req.body.name + "\"" + "," 
		+ parseInt(req.body.id) + "," 
		+ parseInt(req.body.rank) + ","
		+ parseInt(req.body.placeid) + ","
		+ "\"" + req.body.type; "\"" + 
		");"
	);*/

	var query = dataQuery("SELECT * FROM queue");

	query.on("result", function(row){
		connection.pause();
		if (row)
		console.log(row);
		connection.resume();
	})
	/*for (p1 = 0; p1 < queue.length; p1++) {
		for (p2 = 0; p2 < queue.length; p2 ++) {
			var player1 = queue[p1];
			var player2 = queue[p2];
			if (player1.type == player2.type && player1.id != player2.id && Math.abs(player1.rank - player2.rank) < 50) {
				queue.splice((p1 > p2) ? p1 : p2, 1);
				queue.splice((p1 > p2) ? p2 : p1, 1);
				confirm[player1.id] = { players : [ player1, player2 ], id : player1.placeid, type : player1.type };
				confirm[player2.id] = confirm[player1.id];
			}
		}
	}*/
	res.send("added");
});

app.get('/leave/:id', function(req, res) {
	req.params.id = parseInt(req.params.id);
	for (player = 0; player < queue.length; player++) {
		if (queue[player].id == req.params.id) {
			//console.log(queue[player].name + " has left(queue/" + queue[player].type + ")");
			queue.splice(player, 1);
			counter -= 1;
			break;
		}
	}

	res.send("removed");
});

app.get('/confirm/add/:id', function(req, res) {
	req.params.id = parseInt(req.params.id);
	var c         = confirm[req.params.id];

	if (c.players[0].id == req.params.id) {
		c.players[0].confirm = true;
	} else if (c.players[1].id == req.params.id) {
		c.players[1].confirm = true;
	}

	if (c.players[0].confirm && c.players[1].confirm) {
		arenas[c.id] = { players : [ c.players[0], c.players[1] ], arenaid : c.id, type : c.type, set : "Players2" };
		var other         = (confirm[req.params.id].players[0].id == req.params.id && confirm[req.params.id].players[1]) || (confirm[req.params.id].players[1].id == req.params.id && confirm[req.params.id].players[0]);
	}
	res.send("");
});

app.get('/confirm/remove/:id', function(req, res) {
	confirm[confirm[req.params.id].players[0].id] = null;
	confirm[confirm[req.params.id].players[1].id] = null;
	res.send("");
});

app.get('/confirm/:id', function(req, res) {
	res.send(confirm[parseInt(req.params.id)] || []);
});

app.post('/confirm/accept', function(req, res) {
	var response = parseInt(req.body.response);
	var userId   = parseInt(req.body.userId);
	if (confirm[userId].players[0].id == userId) {
		confirm[userId].players[0].accept = response;
	} else if (confirm[userId].players[1].id == userId) {
		confirm[userId].players[1].accept = response;
	}
})

app.get('/arenas/remove/:id', function(req, res) {
	arenas[parseInt(req.params.id)] = null;
	res.send("");
});

app.get('/arenas/:id', function(req, res) {
	res.send(arenas[parseInt(req.params.id)]);
});

app.get('/queue', function(req, res){
	res.send(queue);
})

app.get('/', function(req, res) {
	res.sendfile('');
});

app.listen(port, ipaddress, function() {
	console.log("Server online.");
});