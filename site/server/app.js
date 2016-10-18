var cluster = require('cluster'),
    util = require('util'),
    http = require('http'),
    socket = require('./socket'),
    sticky = require('sticky-session'),
    app  = require('./server'),
    Emitter = require('events');

function Server() {

    Emitter.call(this);
    this.workers = [];

}

util.inherits(Server, Emitter);

Server.prototype.sendMsg = function(type, body) {
    var workers = cluster.workers,
        worker;

    for(worker in workers) {
        if(workers.hasOwnProperty(worker)) {
            workers[worker].send({type: type, body: body});
        }
    }

};

Server.prototype.start = function() {

    cluster.setupMaster({
        exec: 'server/app.js'
    });

    var self = this,
        server = http.createServer(app);
    sticky.listen(server, 3000);

    cluster.on('message', function(worker, message) {
        switch(message.type) {
            case 'event':
                self.emit(message.name);
                break;
        }
    });


    this.on('set:db:state', function(state) {
        this.sendMsg('db', state);
    });

    this.on('report', function(report) {
        this.sendMsg('report', report);
    });

    this.on('error', function(err) {
        this.sendMsg('processError', err);
    });


    server.once('listening', function() {
        console.log('server started on 3000 port');
    });

    console.log('Server started');

};

if(cluster.isMaster){
    module.exports = Server;
} else {
    process.send({type: 'init'});

    var server = http.createServer(app),
        client;

    sticky.listen(server, 3000);
    client = socket(server);

    process.on('message', function(message) {
        switch(message.type) {
            case 'processError':
                client.broadcast(message.type, message.body);
                break;
            case 'report':
                client.broadcast(message.type, message.body);
                break;
        }
    });

    module.exports = server;
}




