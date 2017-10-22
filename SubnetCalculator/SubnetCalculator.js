const calc = require( 'ip-subnet-calculator' );
const Address6 = require('ip-address').Address6;
const Address4 = require('ip-address').Address4;
const BigInteger = require('jsbn').BigInteger;

exports.handler = function(event, context, callback) {
    var address;
   
    if (event.address == null) {
        callback('Bad address or netmask');
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

    callback('Bad address or netmask');
};

function calculateV4(address, callback) {
    const ip = address.addressMinusSuffix;
    const prefixSize = address.subnetMask;

    if (prefixSize === 0) {
        callback('Bad netmask');
        return;
    }

    const ipInfo = calc.calculateSubnetMask(ip, prefixSize);
    if (ipInfo == null) {
        callback('Bad IP or Netmask');
        return;
    }

    var numberOfHosts = ipInfo.ipHigh - ipInfo.ipLow - 1;
    if (numberOfHosts < 0) numberOfHosts = 0;
    const hostMin = (numberOfHosts > 0) ? calc.toString(ipInfo.ipLow + 1) : 'N/A';
    const hostMax = (numberOfHosts > 0) ? calc.toString(ipInfo.ipHigh - 1) : 'N/A';

    callback(null,{
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
    });
}

function calculateV6(address, callback) {
    var numberOfHosts = address.endAddress().getBits().subtract(address.startAddress().getBits());
    numberOfHosts = numberOfHosts.add(new BigInteger('1')).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    callback(null,{
        ipv4: false,
        expanded: address.canonicalForm(),
        condensed: address.correctForm(),
        cidr: address.subnetMask,
        firstHost: address.startAddress().canonicalForm(),
        lastHost: address.endAddress().canonicalForm(),
        numHosts: numberOfHosts
    });
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
