var exec = require("child_process").exec;

exports.handler = function(event, context, callback) { 
   exec("./ssllabs-scan " + event.host, function(err, stdout, stderr) {
      if (err) {
         callback("Scan of " + event.host + " failed");
         return;
      }
      callback(null, JSON.parse(stdout));
   });
};

/*
var event = {
//   host: "www.experts-exchange.com"
   host: "site.ausd.net"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
