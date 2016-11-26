var calc = require( 'ip-subnet-calculator' );

var format = "%-25s";

exports.handler = function(event, context, callback) {
   var ip = event.ip;
   var prefixSize = event.prefixSize;

   var ipInfo = calc.calculateSubnetMask(ip, prefixSize);
   if (ipInfo == null) {
      // Invalid input
      callback("Bad IP or Netmask");
      return;
   }

   var numberOfHosts = ipInfo.ipHigh - ipInfo.ipLow - 1;
   var hostMin = calc.toString(ipInfo.ipLow + 1);
   var hostMax = calc.toString(ipInfo.ipHigh - 1);

   var result = {
      ip: ip,
      netmask: ipInfo.prefixMaskStr,
      cidr: ipInfo.prefixSize,
      wildcard: ipInfo.invertedMaskStr,
      network: ipInfo.ipLowStr,
      broadcast: ipInfo.ipHighStr,
      firstHost: hostMin,
      lastHost: hostMax,
      numHosts: numberOfHosts
   };

   callback(null, result);
}

var event = {
   ip: "192.168.0.2",
   prefixSize: "24"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
