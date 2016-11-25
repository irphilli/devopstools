console.log("Loading Function");

var whois = require("whois");
var geoip = require("geoip2");
var ip = require("ip");
var dns = require("dns");
var exec = require("child_process").exec;
var parseDomain = require("parse-domain");

var db = "GeoIP2-City.mmdb";

exports.handler = function(event, context, callback) {
   var host = event.host;

   if (ip.isV4Format(host) || ip.isV6Format(host)) {
      dns.reverse(host, function(err, hostname) {
         if (err)
            hostname = null;
         hostname = hostname[0];
         runIpLookup(hostname, host, callback);
      });
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
      organization: null
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

   exec("unxz -fk " + db + ".xz", function(err) {
      if (err) {
         console.log("Could not look up IP");
         return;
      }

      geoip.init(db); 
      geoip.lookupSimple(lookupIp, function (err, data) {
         result.location = (err) ? null : data.city + ", " + data.subdivision + ", " + data.country;
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

var event = {
//   host: "104.20.69.216"
//   host: "98.139.183.24"
//   host: "127.0.0.1"
   host: "experts-exchange.com"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
