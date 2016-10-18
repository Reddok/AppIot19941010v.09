var nodemailer = require('nodemailer'),
    config = require('../config/index'),
    mailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.get('mail:user'),
            pass: config.get('mail:password')
        }
    });

module.exports = {

    send: function(from, topic, message) {
        mailTransport.sendMail({
            from: from || config.get('name'),
            to: config.get('mail:admin'),
            subject: topic,
            text: message
        }, function(err) {
            console.log(err);
        });
    }

};