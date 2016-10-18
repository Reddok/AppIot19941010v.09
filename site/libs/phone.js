var config = require('../config/index'),
    twilio = require('twilio')(config.get('twilio:sid'), config.get('twilio:token'));


module.exports = {

    sendSMS: function(to, message) {
        return twilio.sendMessage({
            to: to,
            from: config.get('twilio:number'),
            body: message
        }).then(
            function(response) {
                return response
            },
            function(err) {
                console.log('Error happened when send sms: ', err);
                throw err;
            }
        );
    }

};