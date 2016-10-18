var util = require('util'),
    Events = require('events'),
    MapTables = require('../libs/entities'),
    ErrorFactory = require('../libs/errorHandler');




var operators = {
    $btw: function(query) {
        return " " + query.key + " BETWEEN " + query.range.min + " AND " + query.range.max;
    },
    $qt: function(query) {
        return " " + query.key + " >= " + query.val;
    },
    $lt: function(query) {
        return " " + query.key + " <= " + query.val;
    },
    $like: function(query) {
        return " " + query.key + " LIKE " + "'" + query.val + "'";
    },
    $in: function(query) {
        return " " + query.key + " IN " + "( '" + query.values.join("', '") +"' )";
    }
};

function Controller() {

    Events.call(this);

    if(this.database) {
        for(var table in MapTables) {
            this.createTable(MapTables[table]);
        }
    }

}

Controller.prototype.createTable = function(table) {
    var string = "CREATE TABLE IF NOT EXISTS " + table.name + " (_id integer PRIMARY KEY AUTOINCREMENT",
        props = table.props,
        self = this;
    for(var field in props) {
        string += ", " + field + ' ' + props[field].type;
        if(props[field].notNull) string += ' NOT NULL';
        if(props[field].default) string += " DEFAULT '" + props[field].default + "'";
    }
    string += ')';


    return new Promise(function(res, rej) {
        self.database.run(string, function(err) {
            if(err) rej(err);
            res();
        })
    });
};

Controller.prototype.getDevices = function(states) {
    var self = this;

    return this.get('device', {state: states}).then(function(items) {

        var ids = items.map(function(item) {
            item.properties = [];
            return item._id;
        });

        return self.get('property', {relId: ids}).then(function(properties) {
            items.forEach(function(item) {
                var i = 0;
                while(i < properties.length) {
                    if(properties[i].relId + "" === item._id + ""){
                        item.properties.push(properties.splice(i, 1)[0]);
                    } else {
                        i++;
                    }
                }

            });



            return items;

        })

    });
};

Controller.prototype.get = function(entity, condition, options) {
    var self = this;
    condition = omitNonExistFields(entity, condition);



    return new Promise (function(resolve, reject) {
        console.log("SELECT * FROM " + self.getNameTable(entity) + getQueryString(condition) + prepareOptionsString(options));
        self.database.all("SELECT * FROM " + self.getNameTable(entity) + getQueryString(condition) + prepareOptionsString(options), function(err, rows) {
            if(err) reject(err);
            resolve(rows);
        });
    });

};

Controller.prototype.update = function(entity, condition, options) {

        var self = this,
            data = omitNonExistFields(entity, options.data);
        condition = omitNonExistFields(entity, condition);

    console.log("UPDATE " + self.getNameTable(entity) +  getQueryString(data, 'update') + getQueryString(condition));

        return new Promise(
            function(resolve, reject) {
                self.database.run("UPDATE " + self.getNameTable(entity) +  getQueryString(data, 'update') + getQueryString(condition),
                    function(err){
                        if(err) reject(err);
                        resolve();
                    }
                );

            }
        )



};

Controller.prototype.remove = function(entity, condition, options) {
    var self = this;
    condition = omitNonExistFields(entity, condition);

    console.log(condition);

    return  new Promise (
        function(resolve, reject) {
            console.log('remove query', "DELETE FROM " + self.getNameTable(entity) + getQueryString(condition));
            self.database.run("DELETE FROM " + self.getNameTable(entity) + getQueryString(condition),
                function(err){
                    if(err) reject(err);
                    resolve();
                });
        }
    );

};

Controller.prototype.create = function(entity, options) {
    var self = this,
        data, request;

    console.log('entity', entity, 'data', options.data);

    if(Array.isArray(options.data)) {
        data = options.data.map(function(item) {
            return omitNonExistFields(entity, item);
        });
    } else {
        data = omitNonExistFields(entity, options.data);
    }

    data = getInsertValues(data);
    request = "INSERT INTO " + this.getNameTable(entity) + " (" + data.names.join(', ') + ")";


    if(data.items.length > 1) {
        var items = data.items.map(function(item) {
            return " SELECT '" + item.join("', '") + "'";
        });
        request += items.join(" UNION ALL ");
    } else {
        request += " VALUES ('" + data.items[0].join("', '") + "')";
    }

    console.log('create', request);

    return new Promise (
        function(resolve, reject) {
            self.database.run(request, [],
                function(err) {
                    if(err) reject(err);
                    resolve(this.lastID);
                })
        }
    );

};

Controller.prototype.drop = function(entity) {
    var self = this;

    return new Promise(
        function(resolve, reject) {
            console.log('drop', "DROP TABLE " + self.getNameTable(entity));
            self.database.run("DROP TABLE " + self.getNameTable(entity), [],
                function(err) {
                    if(err) reject(err);
                    resolve();
                })
        }
    ).then(function() {
        var table = MapTables[entity];
        return self.createTable(table);
    })

};

Controller.prototype.count = function(entity, condition) {
    var self = this;

    return new Promise(
        function(resolve, reject) {
            self.database.all('SELECT COUNT(*) FROM ' + self.getNameTable(entity) + getQueryString(condition), function(err, count) {
                if(err) reject(err);
                resolve(count[0]['COUNT(*)']);
            });
        }
    )

};



Controller.prototype.getNameTable = function(entity) {
    return MapTables[entity].name;
};

Controller.prototype.createReport = function(res) {
    var data = res.data,
        date = new Date(),
        logPath = res.log,
        self = this;

    this.create('report', {data: {date: date.getTime(), logLink: logPath}}).then(function() {
        self.emit('report:created');
        if(data.length){
            var request = [], date = new Date();
            data.forEach(function(device) {
                if(device.properties instanceof Array){
                    device.properties.forEach(function(property) {
                        request.push({
                            name: property.name,
                            value: property.value,
                            deviceId: device.id,
                            deviceName: device.name,
                            propertyId: property.propertyId,
                            actionType: property.actionType,
                            actionName: property.actionName,
                            time: date.getTime()
                        }) ;
                    });
                }
            });

            self.create('stat', {data: request});

        }
    });

};


/*Private functions*/

function defaultError(err) {
    var error = ErrorFactory('Db', err.message);
    ErrorFactory.methods.handleError(error);
}



function prepareOptionsString(options) {

    var resultStr = '';
    if(typeof options === 'object' && options !== null) {
        console.log('options', options);
        if(typeof options.order !== 'undefined'&& typeof options.order.by !== 'undefined') {
            resultStr += " ORDER BY " + options.order.by;
            resultStr += " " + options.order.type + " " || " DESC ";
        }
        if(options.limit && typeof options.limit === 'number' ) resultStr += " LIMIT " + options.limit;
        if(options.offset && typeof options.offset === 'number') resultStr += " OFFSET " + options.offset;
    }

    console.log('options str', resultStr);
    return resultStr;
}

function getQueryString(obj, mode) {

    try{

        mode = mode || 'select';
        if(typeof obj !== 'object' || obj === null) return "";
        var res = [], key;

        for(key in obj) {
            if(obj.hasOwnProperty(key)) {
                if(operators[key]) {
                    res.push(operators[key](obj[key]));
                } else if(Array.isArray(obj[key])){
                    res.push(operators.$in({key: key, values: obj[key]}));
                } else if(typeof obj[key] !== 'object') {
                    res.push(key + " = '" + obj[key] + "'");
                }
            }
        }

        return res.length? mode === 'update'? " SET " + res.join(", ") : " WHERE " + res.join(" AND ") : "";

    }catch(err) {
        defaultError(err);
    }

}

function getInsertValues(arr) {

    var names = [],
        items = [],
        key;

    arr = Array.isArray(arr)? arr : [arr];

    arr.forEach(function(item) {
        var res = [];
        for(key in item) {
            if(item.hasOwnProperty(key)) {
                if(!~names.indexOf(key)) names.push(key);
                res.push(item[key]);
            }
        }
        items.push(res);
    });

    return {names: names, items: items};
}

function omitNonExistFields(entity, data) {

    var res = {},
        props = MapTables[entity].props, key;

    for(key in data) {
        if(data.hasOwnProperty(key)) {
            if(operators[key]) {
                if(data[key].key === '_id' || typeof props[data[key].key] !== 'undefined') res[key] = data[key];
            } else {
                if(key === '_id' || typeof props[key] !== 'undefined') res[key] = data[key];
            }
        }
    }

    return res;
}

util.inherits(Controller, Events);


module.exports = Controller;











