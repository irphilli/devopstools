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
   var req = https.request(options, function(res) {
      var certificateInfo = res.connection.getPeerCertificate();
      checkSSL(host, port, false, false, true, certificateInfo, callback);
   });
   req.on("error", function (err) {
      var expired = (err.code == "CERT_HAS_EXPIRED");
      var notYetValid = (err.code == "CERT_NOT_YET_VALID");
      var chainValid = expired || notYetValid;
      checkSSL(host, port, expired, notYetValid, chainValid, null, callback);
   });
   req.end();
};

function checkSSL(host, port, expired, notYetValid, chainValid, certificateInfo, callback) {
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

   var result = {
      expired: expired,
      notYetValid: notYetValid,
      chainValid: chainValid,
      tls1: false,
      tls1_1: false,
      tls1_2: false
   }; 

   var error = false;
   var completedAttrs = 0;

   var options = {
      host: host,
      port: port,
      method: 'GET'
   };

   if (certificateInfo == null) {
      var req = https.request(options, function(res) {
         var certificateInfo = res.connection.getPeerCertificate();
         console.log(certificateInfo);

         completedAttrs += attrs.https;
         if (completedAttrs == allAttrs)
            callback(null, result);
      });
      req.on("error", function (err) {
         if (!error) {
            error = true;
            callback("Could not connect to " + host + ":" + port);
         }
      });
      req.end();
   }
   else {
      completedAttrs += attrs.https;
      console.log(certificateInfo);
   }

   sslinfo.getServerResults(options).
      done(function(res) {
         var ciphers = new Set();
         Object.keys(res.ciphers).forEach(function(item) {
            if (res.ciphers[item].enabled.length > 0) {
               if (item == "TLSv1_method")
                  result.tls1 = true;
               else if (item == "TLSv1_1_method")
                  result.tls1_1 = true;
               else if (item == "TLSv1_2_method")
                  result.tls1_2 = true;
            }
            res.ciphers[item].enabled.forEach(function(cipher) {
               ciphers.add(cipher);
            });
         });

         result.ciphers = Array.from(ciphers);

         completedAttrs += attrs.cert;
         if (completedAttrs == allAttrs)
            callback(null, result);
      },
      function(err) {
         if (!error) {
            error = true;
            callback("Could not connect to " + host + ":" + port);
         }
      }
   );

   exec("echo | openssl s_client -connect " + host + ":" + port + " -ssl2", function(err) {
      result.ssl2 = (err == null);
      completedAttrs += attrs.v2;
      if (completedAttrs == allAttrs)
         callback(null, result);
   });

   exec("echo | openssl s_client -connect " + host + ":" + port + " -ssl3", function(err) {
      result.ssl3 = (err == null);
      completedAttrs += attrs.v3;
      if (completedAttrs == allAttrs)
         callback(null, result);
   });
};

var event = {
//   host: "www.experts-exchange.com"
//   host: "expired.badssl.com"
//   host: "self-signed.badssl.com"
//   host: "incomplete-chain.badssl.com"
   host: "untrusted-root.badssl.com"
//   host: "revoked.badssl.com"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
