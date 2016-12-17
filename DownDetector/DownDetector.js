var http = require("http");
var https = require("https");
var url = require('url');

exports.handler = function(event, context, callback) {
   if (!event.host.startsWith("http"))
      event.host = "http://" + event.host;

   var urlInfo = url.parse(event.host);

   var options = {
      host: urlInfo.host,
      port: (urlInfo.protocol == "http:") ? 80 : 443
   };
   var connector = (urlInfo.protocol == "http:") ? http : https;

   var req = connector.request(options, function(res) {
      var statusCode = res.statusCode;
      if (statusCode >= 400) {
         var result = {
            host: options.host,
            up: false,
            reason: "bad status code (" + statusCode + ")"
         };
         callback(null, result);
         return;
      }

      var result = {
         host: options.host,
         up: true,
         statusCode: statusCode
      };
      callback(null, result);
   });
   req.on("error", function (err) {
      var result = {
         host: options.host,
         up: false,
         reason: err.syscall + " failed with code " + err.code
      };
      callback(null, result);
   });
   req.end();
};

/*
var event = {
   host: "a"
//   host: "https://www.experts-exchange.com/test.html"
//   host: "http://experts-exchange-437318971.us-east-1.elb.amazonaws.com"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
