#!/bin/env node
var express = require('express');
var fs      = require('fs');
var qs      = require('querystring');

var WebServer = function() {

    var self = this;
    var counter = 0;

    self.setupVariables = function() {

        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        self.queue = [];
    	self.confirm = {};
    	self.arenas = {};

        if (typeof self.ipaddress === "undefined") {
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    /*self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };*/

    //self.cache_get = function(key) { return self.zcache[key]; };

    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        //console.log('%s: Node server stopped.', Date(Date.now()) );
    };

    self.setupTerminationHandlers = function(){
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    self.initializeServer = function() {
        self.app = express();

        var id = self.app.param("/^\d+$/");
        var type = self.app.param("/^\w+$/");

        //var userId = self.app.param("user/^\d+$/");

        self.app.use(express.bodyParser());
		self.app.use('/css', express.static(__dirname + '/css'));
		//self.app.use('/fonts', express.static(__dirname + '/fonts'));
		self.app.use('/img', express.static(__dirname + '/img'));
	
		//root url (http://quadVector.tk) || (http://aceeri-ludomentis.rhcloud.com/)

		//Joining queue
		self.app.post('/join', function(req, res) {
			//var inQueue = false;
			var queue = self.queue;

			queue.push({ name : req.body.name, id : req.body.id, rank : req.body.rank, type : req.body.type, confirm : false, placeid : req.body.placeid });
			counter += 1;
			console.log(req.body.name + " has joined(queue/" + req.body.type + ")");

			//Removes from queue and adds to confirmation
			if (counter > 1) {
		    	console.log("Sorting", queue.length, "players");
		    	for (p1 = 0; p1 < queue.length; p1++) {
		    		for (p2 = 0; p2 < queue.length; p2 ++) {
						var player1 = queue[p1];
						var player2 = queue[p2];
		    			if (player1.type == player2.type && player1.id != player2.id && Math.abs(player1.rank - player2.rank) < 50) {
		    				queue.splice((p1 > p2) ? p1 : p2, 1);
		    				queue.splice((p1 > p2) ? p2 : p1, 1);
		    				/*if (p1 > p2) {
		    					queue.splice(p1, 1);
		    					queue.splice(p2, 1);
		    				} else {
		    					queue.splice(p2, 1);
		    					queue.splice(p1, 1);
		    				}*/
		    				self.confirm[player1.id] = { players : [ player1, player2 ], id : player1.placeid, type : player1.type };
		    				self.confirm[player2.id] = self.confirm[player1.id];
		    				//self.confirm.push({ players : [ player1, player2 ], id : player1.placeid, type : player1.type });
							console.log("Matching " + player1.name + ", " + player2.name + " in arena/" + player1.type + ": " + player1.placeid);
		    			}
		    		}
		    	}
		    }
			res.send("added");
		});

		//Leaving queue
		self.app.get('/leave/:id', function(req, res) {
			var queue = self.queue;
			for (player = 0; player < queue.length; player++){
				if (queue[player].id == req.params.id) {
					console.log(queue[player].name + " has left(queue/" + queue[player].type + ")");
					queue.splice(player, 1);
					counter -= 1;
					break;
				}
			}
			res.send("removed");
		});

		//Add to confirm queue
		self.app.get('/confirm/add/:id', function(req, res) {
			var c = self.confirm[req.params.id];

			if (c.players[0].id == req.params.id){
				c.players[0].confirm = true;
			} else if (c.players[1].id == req.params.id){
				c.players[1].confirm = true;
			}

			if (c.players[0].confirm && c.players[1].confirm){
				self.arenas[c.id] = { players = [ c.players[0], c.players[1], arenaid : c.id, type : c.type };
				c = null;
			}
			res.send("");

			/*for (player = 0; player < self.confirm.length; player++) {
				if (self.confirm[player].players[0].id == req.params.id) {
					self.confirm[player].players[0].confirm = true;
					console.log(self.confirm[player].players[0].name + " confirmed.");
				} else if (self.confirm[player].players[1].id == req.params.id) {
					self.confirm[player].players[1].confirm = true;
					console.log(self.confirm[player].players[1].name + " confirmed.");
				}
				if (self.confirm[player].players[0].confirm && self.confirm[player].players[1].confirm) {
					self.arenas[arenaid] = { arenaid: self.confirm[player].id, type : self.confirm[player]type };
					//self.arenas.push({ arenaid : self.confirm[player].id, type : self.confirm[player].type });
					console.log("Pushing new arena(" + self.confirm[player].id + ") to array.");
					break;
				}
			}
			res.send(self.confirm[player]);*/
		});
		
		//Remove from confirm queue
		self.app.get('/confirm/remove/:id', function(req, res) {
			self.confirm[self.confirm[req.params.id].players[1].id] = null;
			self.confirm[req.params.id] = null;
			res.send("");

			/*for (player = 0; player < self.confirm.length; player++) {
				if (self.confirm[player].players[0].id == req.params.id || self.confirm[player].players[1].id == req.params.id) {
					console.log("Removing from confirmation queue(" + self.confirm[player].players[0].name + " & " + self.confirm[player].players[1].name + ")");
					self.confirm.splice(player, 1);
				}
			}
			res.send("");*/
		});

		//Get confirm queue
		self.app.get('/confirm/:id', function(req, res) {
			//console.log("Requesting confirmation qeueue");
			res.send(self.confirm[req.params.id]);

			/*var p;
			req.params.id = parseInt(req.params.id);
			for (i = 0; i < self.confirm.length; i++) {
				if (self.confirm[i].players[0].id == req.params.id || self.confirm[i].players[1].id == req.params.id) { 
					p = self.confirm[i];
					break;
				}
			}
			res.send(self.confirm);*/
		});
		
		//Remove arena
		self.app.get('/arenas/remove/:id', function(req, res) {
			self.arenas[req.params.id] = null;
			res.send("");

			/*for (i = 0; i < self.arenas.length; i++) {
				if (self.arenas[i].arenaid == parseInt(req.params.id)) {
					self.arenas.splice(i, 1);
					break;
				}
			}
			res.send("removed");*/
		});

		//Get arenas
		self.app.get('/arenas/:id', function(req, res) {
			res.send(self.arenas[req.params.id]);
			/*var a;
			req.params.id = parseInt(req.params.id);
			for (i = 0; i < self.arenas.length; i++){
				if (self.arenas[i].arenaid == req.params.id){
					a = self.arenas[i];
					break;
				}
			}
			res.send(a);*/
		});

		//get queue
		self.app.get('/queue', function(req, res){
			res.send(self.queue);
		});

		//get amount of players added to queue
		self.app.get('/counter', function(req, res){
        	res.send(counter);
        })
		
		//Send index.html if root url
        self.app.get('/', function(req, res) {
        	res.sendfile('index.html');
        });
    };

    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();
        self.initializeServer();
    };

    self.start = function() {
        self.app.listen(self.port, self.ipaddress, function() {
            console.log("Server online.");
        });
    };
};

var ws = new WebServer();
ws.initialize();
ws.start();