console.log("Loading Function");

var pn = require("port-numbers");
var ps = require("portscanner");
var dns = require("dns");

var portMax = 65535;
var defaults = [
   21,
   22,
   23,
   25,
   69,
   80,
   110,
   135,
   139,
   143,
   389,
   443,
   1433,
   2049,
   3306,
   3389,
   5060,
   5432,
   8080,
   8443
];

exports.handler = function(event, context, callback) {
   var host = event.host;
   var port = event.port;

   // Host is required
   dns.lookup(host, function(err, address) {
      if (err) {
         // callback("Invalid Host");
         return;
      }
      console.log(host + " resolved to " + address);
      if (port == null) {
         console.log("Default");
         var results = [];
         defaults.forEach(function(port) {
            scanPort(host, port, function(result) {
               results.push(result);
               if (results.length == defaults.length) {
                  console.log(results.sort(compare));
                  //callback(null, result);
               }
            });
         });
      }
      else {
         if (isNaN(port) || port < 0 || port > portMax) {
            //callback("Invalid port number.");
            return;
         }
         port = Number(port);
         scanPort(address, port, function(result) {
            console.log(result);
            //callback(null, result);
         });
      }
   });
}

var scanPort = function(address, port, callback) {
   console.log("Scanning " + address + ":" + port);

   ps.checkPortStatus(port, address, function (err, status) {
      console.log(port);
      var portInfo = pn.getService(port);

      var result = {};
      result.open = !err && status == "open";
      result.port = port;
      result.name = (portInfo != null) ? portInfo.name : "unknown";
      result.description = (portInfo != null) ? portInfo.description : "";
      callback(result);
   });
}

function compare(a, b) {
   return a.port - b.port;
}

var event = {
//   port: "80",
   host: "www.experts-exchange.com"
};
exports.handler(event, null, null);
