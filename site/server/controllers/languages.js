var ErrorHandler = require('../../libs/errorHandler'),
    Router = require('koa-router'),
    config = require('../../config'),
    translations = require('../../libs/languages');

var LangController = function() {

    if (!(this instanceof LangController)) {
        return new LangController();
    }

    this.registerRoutes = function() {
        var router = Router();
        router.get('/:lang', this.index);
        return router;
    };

    this.index = function* (next) {

        var lang = this.params.lang,
            slugs = config.get('language:accepted').map(function(obj){return obj.slug});

        if(!~slugs.indexOf(lang) || !translations[lang]) throw ErrorHandler('Http', 'Цієї моаи нема в списку присутніх.', 404);
        config.set('language:current', lang);
        yield config.save();
        config.load();
        this.body = translations[lang];

    };

};

module.exports = LangController;