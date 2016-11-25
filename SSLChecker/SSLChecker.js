console.log("Loading Function");

var https = require("https");
var sslinfo = require("sslinfo");
var exec = require("child_process").exec;

var attrs = {
   v2: 1,
   v3: 2,
   cert: 4,
   https: 8
};

var allAttrs = 0;
for (var key in attrs) {
   allAttrs += attrs[key];
}

exports.handler = function(event, context, callback) {
   var host = event.host;
   var port = 443;

   var options = {
      host: host,
      port: port,
      method: 'GET'
   };

   var completedAttrs = 0;
   var result = {};

   var req = https.request(options, function(res) {
      var certificateInfo = res.connection.getPeerCertificate(true);
      result.https = true;

      completedAttrs += attrs.https;
      if (completedAttrs == allAttrs)
         callback(null, result);
   });
   req.on("error", function (err) {
      callback("Could not connect to " + host + ":" + port);
   });
   req.end();

   sslinfo.getServerResults(options).
      done(function(res) {
         result.cert = true;

         completedAttrs += attrs.cert;
         if (completedAttrs == allAttrs)
            callback(null, result);
      },
      function(err) {
         callback("Could not connect to  " + host + ":" + port);
      }
   );

   exec("echo | openssl s_client -connect " + host + ":" + port + "-ssl2", function(err) {
      if (err) {
         console.log("no ssl 2");
      }
      completedAttrs += attrs.v2;
      if (completedAttrs == allAttrs)
         callback(null, result);
   });

   exec("echo | openssl s_client -connect " + host + ":" + port + "-ssl3", function(err) {
      if (err) {
         console.log("no ssl 3");
      }
      completedAttrs += attrs.v3;
      if (completedAttrs == allAttrs)
         callback(null, result);
   });
};

/*
var event = {
   host: "www.experts-exchange.com"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
