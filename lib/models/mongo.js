
var debug = require('debug')('autoload');

exports.autoload = function(app, model, mongoConfig, callback) {
    
    if( mongoConfig.options
        && mongoConfig.options.db
        && mongoConfig.options.db.safe
        && mongoConfig.options.db.safe.w == 'all' ) {
        mongoConfig.options.db.safe.w = mongoConfig.servers.length;
    }
    
    var connStr = 'mongodb://';

    if( mongoConfig.options
        && mongoConfig.options.user
        && mongoConfig.options.pass ) {
        connStr += mongoConfig.options.user+":"+mongoConfig.options.pass+"@";
    }
    
    connStr += mongoConfig.servers.join(',');
    
    model.mongoose = app.libs.mongoose.createConnection(connStr, mongoConfig.options, function () {
        debug('Connected to MongoDB!');
        model.mongo = model.mongoose.db;
        callback && callback(null, model.mongo);
    });

}

