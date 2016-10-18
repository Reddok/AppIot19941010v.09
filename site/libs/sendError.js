var socket = require('../server/socket'),
    mail = require('./mail'),
    log = require('./writeLog');

function dateToString(date) {
    let dateObj = {
        seconds: date.getSeconds(),
        minutes: date.getMinutes(),
        hours: date.getHours(),
        days: date.getDate(),
        months: date.getMonth() + 1
    };

    for(let val in dateObj) {
        if(dateObj.hasOwnProperty(val)) {
            if(dateObj[val] < 10) dateObj[val] = '0' + dateObj[val];
        }
    }

    return dateObj.hours + '_' + dateObj.minutes + '_' + dateObj.seconds + '___' + dateObj.days + '_' + dateObj.months + '_' + date.getFullYear();

}

function sendSocketError(err) {
        /*socket.broadcast('Error', err);*/
}

function logError(err) {

    let message = err.message + '\n' + err.errorStack,
        logName = err.name + '-' + dateToString(new Date());

    mail.send('Site Notify', err.name, message);
    log.write('errors', logName, message);

}

module.exports = {
    sendError: sendSocketError,
    logError: logError,
    handleError: function(err) {
        this.sendError(err);
        this.logError(err);
    }
};


