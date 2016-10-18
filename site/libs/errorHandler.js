var http = require('http'),
    dateOutput = require('../libs/dateOutput'),
    writeLog = require('../libs/writeLog'),
    ErrorHandler = require('./sendError'),
    constructors  = {},
    util = require('util');

function ErrorFactory(type, message, status, data) {
    type = type[0].toUpperCase() + type.slice(1);

    if (ErrorFactory.constructors[type + 'Error']) {
        return new ErrorFactory.constructors[type + 'Error'](message, status, data);
    }

    return new Error(message);

}

function HttpError(message, status, data) {
    Error.apply(this, arguments);
    Error.captureStackTrace(this, this.constructor);

    this.status = status || 404;
    this.data = data;
    this.type = 'HttpError';
    this.message = message || http.STATUS_CODES[status] || 'Error';
}

function ProcessError(message,  status, deviceId) {
    Error.apply(this, arguments);
    Error.captureStackTrace(this, this.constructor);

    this.type = 'ProcessError';
    this.message = message || 'При опитуванні приладів сталась невідома помилка';
    if(typeof deviceId === 'number') this.problemDevice = deviceId;
}


function ServerError(message) {
    Error.apply(this, arguments);
    Error.captureStackTrace(this, this.constructor);

    this.type = 'ServerError';
    this.message = message || 'На сервері сталась невідома помилка';
}


function  DbError(message) {
    Error.apply(this, arguments);
    Error.captureStackTrace(this, this.constructor);
    this.type = 'DbError';
    this.message = message || 'На базі данних сталась невідома помилка';
}

constructors.HttpError = HttpError;
constructors.ProcessError = ProcessError;
constructors.ServerError = ServerError;
constructors.DbError = DbError;

for(var constr in constructors) {
    var Current = constructors[constr];
    util.inherits(Current, Error);
    Current.prototype.constructor = Current;
    Current.prototype.name = constr;
}

ProcessError.prototype.writeLog = function(arr) {
    var text = '', arr = arr || [this], filename, i = 0, max = arr.length;

    for(i; i < max; i++) {
        if(arr[i].problemDevice) text += 'Помилка приладу: ' + arr[i].problemDevice + '\r\n';
        text += 'Повідомлення помилки: ' + arr[i].message + '.\r\n';
        text += 'Місце помилки: \r\n' + arr[i].stack + '\r\n\r\n\r\n';
    }
    filename = 'error-' + dateOutput('d') + '.' + (Math.random() * 10000).toFixed();
    writeLog.write('errorLogs', filename, text);

};

ErrorFactory.constructors = constructors;
ErrorFactory.methods = ErrorHandler;

module.exports = ErrorFactory;

