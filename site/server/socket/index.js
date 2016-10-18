var socket = require('socket.io');


module.exports = function(app) {

    console.log(socket);

    var io = socket(app);


    io.on("connection", function () {
        console.log("CONNECTION ACCEPT");
    });

    io.on('disconnect', function(){
        console.log('user disconnected');
    });

    console.log('socket established');

    return io;



}