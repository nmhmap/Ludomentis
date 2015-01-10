#!/bin/env node
var express = require('express');
var fs      = require('fs');
var qs      = require('querystring');

var WebServer = function() {

    var self = this;

    self.setupVariables = function() {

        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        self.queue = [];
    	self.confirm = [];
    	self.arenas = [];

        if (typeof self.ipaddress === "undefined") {
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };

    self.cache_get = function(key) { return self.zcache[key]; };

    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
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

        self.app.use(express.bodyParser());
		self.app.use('/css', express.static(__dirname + '/css'));
		self.app.use('/fonts', express.static(__dirname + '/fonts'));
		self.app.use('/img', express.static(__dirname + '/img'));


		//client -> server (join queue) -> web server (/join)
		//client -> server (leave queue) -> web server (/leave/:playerid)
		//server (ask for confirm queue) -> web server (/confirm) -> server (extracts placeid from confirm)
		//server (confirm player) -> web server (/confirm/add/:playerid)
		//server (wait until both confirmed)
		//server (teleport players to arena)
		//arena (both players joined) -> web server (/confirm/remove/:playerid)
	
		//root url (http://trivector.tk) || (http://aceeri-ludomentis.rhcloud.com/)

		//Joining queue
		self.app.post('/join', function(req, res) {
			var inQueue = false;
			var queue = self.queue;

			//Check if in queue
			for (player = 0; player < queue.length; player++) {
				if (queue[player].type == req.body.type && queue[player].id == req.body.id) {
					//console.log("Already queued", queue[player].name);
					inQueue = true;
					break;
				} else if (queue[player].type != req.body.type && queue[player].id == req.body.id) {
					inQueue = false;
					//console.log("Already queued", queue[player].name, "(different type)");
					queue.splice(player, 1);
					break;
				}
			}


			//Adds to queue
			if (!inQueue) {
				queue.push({ name : req.body.name, id : req.body.id, rank : req.body.rank, type : req.body.type, confirm : false, placeid : req.body.placeid });
				//console.log(req.body.name + " has joined(queue/" + req.body.type + ")");
			}


			//Removes from queue and adds to confirmation
	    	console.log("Sorting", queue.length, "players");
	    	for (p1 = 0; p1 < queue.length; p1++) {
	    		for (p2 = 0; p2 < queue.length; p2 ++) {
					var player1 = queue[p1];
					var player2 = queue[p2];
	    			if (player1.type == player2.type && player1.id != player2.id && player1.rank + 50 > player2.rank - 50) {
	    				if (p1 > p2) {
	    					queue.splice(p1, 1);
	    					queue.splice(p2, 1);
	    				} else {
	    					queue.splice(p2, 1);
	    					queue.splice(p1, 1);
	    				}
	    				self.confirm.push({ players : [ player1, player2 ], id : player1.placeid, type : player1.type });
						console.log("Matching " + player1.name + ", " + player2.name + " in arena/" + player1.type + ": " + player1.placeid);
	    			}
	    		}
	    	}
			res.send("added");
		});

		//Leaving queue
		self.app.get('/leave/:id', function(req, res) {
			var queue = self.queue;
			for (player = 0; player < queue.length; player++){
				console.log("playerid: ", queue[player].id, req.params.id);
				if (queue[player].id == req.params.id) {
					//console.log(queue[player].name + " has left(queue/" + queue[player].type + ")");
					queue.splice(player, 1);
					break;
				}
			}
			res.send("removed");
		});

		//Add to confirm queue
		self.app.get('/confirm/add/:id', function(req, res) {
			for (player = 0; player < self.confirm.length; player++) {
				if (self.confirm[player].players[0].id == req.params.id) {
					self.confirm[player].players[0].confirm = true;
					console.log(self.confirm[player].players[0].name + " confirmed.");
				} else if (self.confirm[player].players[1].id == req.params.id) {
					self.confirm[player].players[1].confirm = true;
					console.log(self.confirm[player].players[1].name + " confirmed.");
				}
				if (self.confirm[player].players[0].confirm && self.confirm[player].players[1].confirm) {
					self.arenas.push({ arenaid : self.confirm[player].id, type : self.confirm[player].type });
					//console.log("Pushing new arena(" + self.confirm[player].id + ") to array.");
					break;
				}
			}
			res.send(self.confirm[player]);
		});
		
		//Remove from confirm queue
		self.app.get('/confirm/remove/:id', function(req, res) {
			for (player = 0; player < self.confirm.length; player++) {
				if (self.confirm[player].players[0].id == req.params.id || self.confirm[player].players[1].id == req.params.id) {
					//console.log("Removing from confirmation queue(" + self.confirm[player].players[0].name + " & " + self.confirm[player].players[1].name + ")");
					self.confirm.splice(player, 1);
				}
			}
			res.send("");
		});

		//Get confirm queue
		self.app.get('/confirm', function(req, res) {
			//console.log("Requesting confirmation qeueue");
			res.send(self.confirm);
		});
		
		//Remove arena
		self.app.get('/arenas/remove/:id', function(req, res){
			var found = false;
			for (i = 0; i < self.arenas.length; i++) {
				if (self.arenas[i].arenaid == parseInt(req.params.id)) {
					self.arenas.splice(i, 1);
					var found = true;
					break;
				}
			}
			res.send(found);
		});

		//Get arenas
		self.app.get('/arenas', function(req, res) {
			res.send(self.arenas);
		});

		self.app.get('/queue', function(req, res){
			res.send(self.queue);
		});
		
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