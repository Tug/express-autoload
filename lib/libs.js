
module.exports.autoload = function(app, libsPath){
    var fs    = require("fs")
      , path  = require("path")
      , files = fs.readdirSync(libsPath)
      , names = files.map(function(f) {
            return path.basename(f).replace(/.js$/,'');
        });
    
    names.forEach(function(libName) {
        app.libs[libName] = require(path.join(libsPath, libName))(app);
    });
  
    return app.libs;

};
