var ErrorHandler = require('../../libs/errorHandler'),
    Router = require('koa-router'),
    config = require('../../config');

var StatsController = function(db) {

    if (!(this instanceof StatsController)) {
        return new StatsController(db);
    }

    this.registerRoutes = function() {
        var router = Router();

        router.get('/', this.index);
        router.del('/:id', this.remove);

        return router;
    };


    this.index = function* (next) {
        var params = this.request.query,
            sorting = params.sort_by || 'time',
            order = params.order || 'DESC',
            query = {},
            options = {}, length, props;

        if(params.deviceId) query.deviceId = params.deviceId;
        if(params.propertyId) query.propertyId = params.propertyId;
        if(params.from && params.to) {

            var min = new Date(params.from),
                max = new Date(params.to);

            query.$btw = {
                key: 'time',
                range: {
                    min: min.getTime(),
                    max: max.getTime()
                }
            };
        }


        options.order = {
            by: sorting,
            type: order
        };

        if(!params.infinity) {
            params.page = params.page ? +params.page : 1;
            params.per_page = params.per_page? +params.per_page : 10;

            options.limit = params.per_page;
            options.offset = (params.page - 1) * params.per_page;
        }


        props = yield db.get('stat', query, options);
        length = yield db.count('stat', params.deviceId? {deviceId: params.deviceId} : {});



        this.body = {records: props, initialLength: length};

    };

    this.remove = function* (next, propertyIds) {

        var groupId;

        if(this.request) {
            groupId = this.request.body.ids;
            if(!groupId || Array.isArray(groupId) && !groupId.length) throw new ErrorHandler('Http', 'Для видалення необхідно вказати ідентифікатори.', 400);
            groupId = Array.isArray(groupId)? groupId : [groupId];

            yield db.remove('stat', {_id: groupId});

        } else {
            groupId = propertyIds;
            if(!groupId || (Array.isArray(groupId) && !groupId.length)) return;
            groupId = Array.isArray(groupId)? groupId : [groupId];
            console.log('stats group id', groupId);

            yield db.remove('stat', {propertyId: groupId});
        }

        this.body = {data: 'Логи видалені!'};

    };

};

module.exports = StatsController;