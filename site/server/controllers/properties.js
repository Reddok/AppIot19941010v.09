var ErrorHandler = require('../../libs/errorHandler'),
    Router = require('koa-router'),
    Validator = require('../../libs/validator');

var PropertyController = function(db) {
    var StatsControllerClass = require('./stats'),
        statsController = new StatsControllerClass(db),

        validator = new Validator({
            name: {IsLength: {options: {min: 4}}},
            propertyId: {required: true},
            maxValue: {isInt: true},
            minValue: {isInt: true},
            lackLink: {isUrl: true},
            excessLink: {isUrl: true},
            lackName: {IsLength: {options: {min: 4}}},
            excessName: {IsLength: {options: {min: 4}}},
            relId: {required: true}
        });


    if (!(this instanceof PropertyController)) {
        return new PropertyController(db);
    }

    this.registerRoutes = function() {
        var router = Router();

        router.get('/', this.index);
        router.post('/', this.create);
        router.get('/:id', this.show);
        router.put('/:id', this.update);
        router.del('/:id', this.remove);
        router.del('/', this.removeAll);
        router.get('/count', this.count);

        return router;
    };



    this.index = function* (next) {
        var params = this.request.query,
            deviceId = params.deviceId,
            query, properties;

        query = deviceId? {relId: deviceId} : {};

        properties = yield db.get('property', query);

        this.body = properties;
    };


    this.create = function* (next) {
        var property = this.request.body,
            propertyId, errors;

        console.log('incoming property', property);

        if(!property ) {
            throw new ErrorHandler('Http', 'Не вказано ніяких данних для створення.', 400);
        }

        errors = validator.validate(property).errors;
        console.log('errors', errors);
        if(errors) throw ErrorHandler('Http', 'Validation error!', 422, {errors: errors});

        propertyId = yield db.create('property', {data: property});
        console.log('return id', propertyId);
        this.body = {_id: propertyId};
    };


    this.show = function* (next) {
        var id = this.params.id,
            property;

        property = yield db.get('property', {_id: id});

        this.body = property[0];

    };

    this.update = function* (next) {
        var id = this.params.id,
            data = this.request.body;
            yield db.update('property', {_id: id}, {data: data});
            this.body = {data: 'Властивість успішно обновлена'};

    };

    this.remove = function* (next) {

        var id = this.params.id;

        if(!id) {
            throw ErrorHandler('Http', 'Для видалення властивостей необхідно вказати їхні ID', 400);
        }

        yield db.remove('property', {_id: id});
        this.body = {data: 'Властивість успішно видалена!'};

    };

    this.removeAll = function* (next, ids) {

        var groupId = this.request? this.request.body.ids : ids;

        if(!groupId || Array.isArray(groupId) && !groupId.length) {
            if(this.request) throw new ErrorHandler('HttpError', 'Не вказано ніяких данних для створення.', 400);
            else return;
        }
        groupId = Array.isArray(groupId)? groupId : [groupId];

        if(!this.request) {
            groupId = yield db.get('property', {relId: groupId});
            groupId = groupId.map(function(obj) { return obj._id});
        }

        if(groupId.length) {
            yield db.remove('property', {_id: groupId});
            statsController.remove(null, groupId);
        }

        this.body = {data: 'Вибрані властивості успішно видалені!'};

    };

    this.drop = function* (next) {

        yield db.drop('property', {});
        this.body = "OK";

    };

    this.count = function* (next) {
        var deviceId = this.query.deviceId;
        this.body = yield db.count('property', deviceId? {relId: deviceId} : {});
    }


};

module.exports = PropertyController;