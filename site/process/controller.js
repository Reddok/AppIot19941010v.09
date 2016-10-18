var util = require('util'),
    Events = require('events'),
    config = require('../config/index'),
    cheerio = require('cheerio'),
    request = require('request'),
    errorHandler = require('../libs/errorHandler'),
    dateOutput = require('../libs/dateOutput'),
    logs = require('../libs/writeLog');

function Controller() {

    Events.call(this);

    this.items = [];
    this.restored = [];

}

Controller.prototype.review = function(items) {
    var errors = [],
        self = this;

    return Promise.all(items.map(function(device) {

        return self.makeRequest(device, errors);

    })).then(function(res) {

        var filename, log, pathSavedLog,
            date = dateOutput('d', new Date());

        res = res.filter(function(item) {
            return item && typeof item === 'object';
        });
        res = res.concat(self.addRestored());


        if(errors.length) {
            errorHandler.constructors.ProcessError.prototype.writeLog(errors);
        }


        /*Створює текст звіту і записує у відповідний файл*/
        log = self.writeLogMessage(res, errors, date);
        filename = 'log-' + date + '.' + (Math.random() * 10000000).toFixed();
        pathSavedLog = logs.write('statistics/' + config.get('logs:filepath'), filename, log);


        self.emit('report:create', {data: res, log: pathSavedLog});

    }).catch(function(err) {
        console.log('Зробив зовнішній ловець', err);
        self.emit('error', err.message);
    });
};

Controller.prototype.initPing = function(item) {
    this.emit('device:change:state', 'stick', item._id);
    this.ping(item, 0);
};

Controller.prototype.ping = function (item, retries) {
    var max = config.get('process:ping:triesReconnect'),
        self = this;
    if(retries > max) {
        self.emit('device:change:state', 'dead', item._id);
        console.log("З'єднання втрачено. Прилад " + item.name + "перейшов в статус 'неактивний'");
    } else {
        console.log("Спроба отримати з'єднання з приладом " + item.name);
        request({url: item.host_page, timeout: config.get('process:ping:timeout')}, function (err, response, data) {
            if (!err && response.statusCode === 200) {
                console.log("З'єднання отримано з приладом " + item.name);
                self.restored.push({item: item, data: data});
                self.emit('device:change:state', 'alive', item._id);
            } else {
                console.log("Невдалось отримати з'єднання з приладом " + item.name);
                retries++;
                setTimeout(self.ping.bind(self, item, retries), config.get('process:ping:interval'));
            }
        });
    }

};

Controller.prototype.addRestored = function() {
    var res = [], self = this;
    try{
        if(Array.isArray(self.restored) && self.restored.length) {
            self.restored.forEach(function(item, i) {
                self.restored.splice(i, 1);
                res.push(self.makeDecision(item.item, item.data));
            });
        }
    }catch(err) {
        throw new Error('В ресторед сталася наступна помилка:' + err);
    }
    console.log('restored повернув', res);
    return res;
};

Controller.prototype.makeRequest = function(item, errors) {
    var self = this;
    if(item.host_page.indexOf('http://') !== 0 && item.host_page.indexOf('https://') !== 0) item.host_page = 'http://' + item.host_page;
    /*Робиться один конкретний запит на конкретну сторінку*/

    return new Promise(function(res, rej) {

        request({url: item.host_page, timeout: config.get('request:timeout')}, function(err, response, data) {
            if(err || response.statusCode != 200) {
                console.log('Error', err);
                var message = 'Помилка при завантаженні сторінки ' + item.host_page + ' приладу ' + item.name + '. ID приладу: ' + item._id + '',
                    error = errorHandler('Process', message, item._id);
                errors.push(error);
                self.initPing(item);
                res(null);
                return error;

            }
            res(self.makeDecision(item, data, rej));
        });

    });
};

Controller.prototype.makeDecision = function(item, data, reject) {
    try{
        var $, res = {} ,currentProperties, type, actionName;
        res.name = item.name;
        res.id = item._id;
        res.properties = [];

        $ = cheerio.load(data);

        currentProperties = item["properties"];

        for(var i = 0; i < currentProperties.length; i++) {
            var deviceProperty = parseFloat($('#' + currentProperties[i].propertyId).text());


            if(!isNaN(deviceProperty)){
                if(currentProperties[i].maxValue < deviceProperty) {  /* Отримане значення вище максимального */
                    console.log('excessLink', currentProperties[i].excessLink);
                    request(currentProperties[i].excessLink, function(err, resp, data) {});
                    type = 'excess';
                    actionName = currentProperties[i].excessName;
                } else if(currentProperties[i].minValue > deviceProperty) {  /* Отримане значення нижче мінімального */
                    console.log('lackLink', currentProperties[i].lackLink);
                    request(currentProperties[i].lackLink, function(err, resp, data) {});
                    type = 'lack';
                    actionName = currentProperties[i].lackName;
                } else {
                    console.log('default');
                    type = 'default';
                    actionName = 'Значення в межах норми';
                }
                res.properties.push({name: currentProperties[i].name, value: deviceProperty, propertyId: currentProperties[i]._id, relDevice: item._id, actionType: type, actionName: actionName});
            } else {
                var errorMessage = "Властивості " + currentProperties[i].name + "не виявлено в приладі. Перевірте, чи ця властивість наявна на даному приладі або чи вказаний правильний ідентифікатор властивості. \r\n";
                res.properties.push({name: currentProperties[i].name, error: errorMessage, propertyId: currentProperties[i]._id, relDevice: item._id, actionType: 'error', actionName: 'error'});  /*Тимчасовий обробник помилок. Потім напишу щось інше, якщо не забуду.*/
            }
        }
        return res;

    }catch(err) {
        if(reject) {
            reject(err);
        }else{
            throw err;
        }
    }

};

Controller.prototype.writeLogMessage = function(res, errors, date) {
    var log = '';
    if(!res.length && !errors.length) {
        log = 'Нема доступних пристроїв для провірки. Зареєструйте хоча б один.\r\n\r\n\r\n'
    } else {
        if(res.length) {
            log = res.reduce(function(prev, current) {
                var mes  = "\r\nХарактеристики приладу в кімнаті " + current.name + ": \r\n";
                if(current.properties) {
                    current.properties.forEach(function(property) {
                        mes += 'Прилад показав наступне значення властивості ' + property.name + ': ' + property.value + '. \r\n';
                    });
                } else {
                    mes += 'В цьому приладі нема властивостей. Або вони ще не задані, або при запрошенні сторінки сталась помилка.';
                }
                mes += '\r\n\r\n\r\n';
                return prev + mes;
            }, '');
        }
        if(errors.length) {
            log += 'При проходженні опитування стались наступні помилки:\r\n';
            errors.forEach(function(error) {
                log += error.message;
            });
        }

    }
    log += 'Станом на ' + date + '.';
    return log;
};



util.inherits(Controller, Events);


module.exports = Controller;











