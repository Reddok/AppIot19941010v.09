var child = require('child_process');

module.exports = function(winCommand, unixCommand) {

    var isWin = /^win/.test(process.platform),
        command = isWin? winCommand : unixCommand;

    return launchCommand(command);

};

function launchCommand(command) {
    return new Promise(function(res, rej) {
        child.exec(command, function (err, stdout){
            if (err) {
                console.log("child processes failed with error code: " + err.code, 'error message ' + err.message);
                rej(err)
            }
            console.log('Everything be fine, out is:' + stdout);
            res(stdout);
        });
    })
}