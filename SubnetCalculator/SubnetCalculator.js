var calc = require( 'ip-subnet-calculator' );
var Address6 = require("ip-address").Address6;
var Address4 = require("ip-address").Address4;
var BigInteger = require('jsbn').BigInteger;

exports.handler = function(event, context, callback) {
   var address;
   
   if (event.address == null) {
      callback("Bad address or netmask");
      return;
   }

   address = new Address4(event.address);
   if (address.isValid()) {
      calculateV4(address, callback);
      return;
   }
   
   address = new Address6(event.address);
   if (address.isValid()) {
      calculateV6(address, callback);
      return;
   }

   callback("Bad address or netmask");
}

function calculateV4(address, callback) {
   var ip = address.addressMinusSuffix;
   var prefixSize = address.subnetMask;

   if (prefixSize === 0) {
      callback("Bad netmask");
      return;
   }

   var ipInfo = calc.calculateSubnetMask(ip, prefixSize);
   if (ipInfo == null) {
      callback("Bad IP or Netmask");
      return;
   }

   var numberOfHosts = ipInfo.ipHigh - ipInfo.ipLow - 1;
   if (numberOfHosts < 0) numberOfHosts = 0;
   var hostMin = (numberOfHosts > 0) ? calc.toString(ipInfo.ipLow + 1) : "N/A";
   var hostMax = (numberOfHosts > 0) ? calc.toString(ipInfo.ipHigh - 1) : "N/A";

   var result = {
      ipv4: true,
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

function calculateV6(address, callback) {
   var numberOfHosts = address.endAddress().getBits().subtract(address.startAddress().getBits());
   numberOfHosts = numberOfHosts.add(new BigInteger('1')).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

   var result = {
      ipv4: false,
      expanded: address.canonicalForm(),
      condensed: address.correctForm(),
      cidr: address.subnetMask,
      firstHost: address.startAddress().canonicalForm(),
      lastHost: address.endAddress().canonicalForm(),
      numHosts: numberOfHosts
   };
   callback(null, result);
}

/*
var event = {
   address: "2001:0db8:85a3::8a2e:0370:7334/64"
//   address: "2001:0db8:85a3::8a2e:0370:7334"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
