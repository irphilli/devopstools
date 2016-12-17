var AWS = require("aws-sdk");
var whois = require("whois");
var geoip = require("geoip2");
var ip = require("ip");
var dns = require("dns");
var exec = require("child_process").exec;
var parseDomain = require("parse-domain");

var bucket = "ittools.redsrci.com";
var db = "GeoIP2-City.mmdb";

exports.handler = function(event, context, callback) {
   var host = event.host;

   if (ip.isV4Format(host) || ip.isV6Format(host)) {
      try {
         dns.reverse(host, function(err, hostname) {
            if (err)
               hostname = null;
            if (hostname != null)
               hostname = hostname[0];
            runIpLookup(hostname, host, callback);
         });
      }
      catch (err) {
         runIpLookup(null, host, callback);
      }
   }
   else {
      dns.lookup(host, function(err, ip) {
         if (err) {
            callback("Could not resolve " + host);
         }
         else {
            runIpLookup(host, ip, callback);
         }
      });
   }
}

function runIpLookup(hostname, lookupIp, callback) {
   var result = {
      hostname: hostname,
      ip: lookupIp,
      domain: null,
      location: null,
      organization: null,
      private: false
   };
   if (hostname != null) {
      var domainInfo = parseDomain(hostname);
      if (domainInfo != null)
         result.domain = domainInfo.domain + "." + domainInfo.tld;
   }

   var runCallback = false;

   if (ip.isPrivate(lookupIp)) {
      result.private = true;
      callback(null, result);
      return;
   }

   var s3 = new AWS.S3();
   var params = {
      Bucket: bucket,
      Key: db
   };
   var file = require('fs').createWriteStream('/tmp/' + db);
   var stream = s3.getObject(params).createReadStream().pipe(file);

   stream.on("error", function() {
      console.log("Could not look up IP");
      if (runCallback)
         callback(null, result);
      else
         runCallback = true;
   });

   stream.on("finish", function() {
      geoip.init("/tmp/" + db); 
      geoip.lookupSimple(lookupIp, function (err, data) {
         if (!err) {
            result.location = "";
            if (data.city)
               result.location = data.city + ", ";
            if (data.subdivision)
               result.location += data.subdivision + ", ";
            result.location += data.country;
         }
         
         if (runCallback)
            callback(null, result);
         else
            runCallback = true;
      });
   });

   whois.lookup(lookupIp, {"follow": 2}, function (err, data) {
      var regexp = /Organization: +(.+)/;
      var found = data.match(regexp);
      result.organization = (found) ? found[1] : null;
      if (runCallback)
         callback(null, result);
      else
         runCallback = true;
   });
};

/*
var event = {
//   host: "104.20.69.216"
//   host: "98.139.183.24"
//   host: "127.0.0.1"
//   host: "10.10.0.1"
   host: "experts-exchange.com"
//   host: "a"
//   host: "2607:f8b0:4005:804::200e"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
