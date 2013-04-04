
var fs = require('fs');

exports.autoload = function(app, viewsConfig) {
    
    var renderer = viewsConfig.engine.render;
    
    if(!renderer) {
        renderer = function(str, options) { return str };
    }
    
    return createEngine(renderer);
    
};

function createEngine(renderer) {
    
    var cache = {};
    
    return function(path, options, fn){
        var key = path + ':string';

        if ('function' == typeof options) {
            fn = options, options = {};
        }

        options.filename = path;

        try {
            var str = options.cache
              ? cache[key] || (cache[key] = fs.readFileSync(path, 'utf8'))
              : fs.readFileSync(path, 'utf8');
            fn(null, renderer(str, options));
        } catch (err) {
            fn(err);
        }
    };
};



