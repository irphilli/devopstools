const pn = require('port-numbers');
const ps = require('portscanner');
const dns = require('dns');
const ip = require('ip');

const portMax = 65535;
const defaults = [
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

    if (ip.isV4Format(host) || ip.isV6Format(host)) {
        if (ip.isPrivate(host)) {
            callback('Invalid Host');
            return;
        }
        runIpScan(host, port, callback);
        return;
    }

    dns.lookup(host, function(err, address) {
        if (err) {
            callback('Invalid Host');
            return;
        }
        console.log(host + ' resolved to ' + address);
        runIpScan(address, port, callback);
    });
};

function runIpScan(address, port, callback) {
    if (port == null) {
        console.log('Default');
        var results = [];
        defaults.forEach(function(port) {
            scanPort(address, port, function(result) {
                results.push(result);
                if (results.length == defaults.length) {
                    callback(null, results.sort(compare));
                }
            });
        });
    }
    else {
        if (isNaN(port) || port < 0 || port > portMax) {
            callback('Invalid port number.');
            return;
        }
        port = Number(port);
        scanPort(address, port, function(result) {
            callback(null, result);
        });
    }
}

var scanPort = function(address, port, callback) {
    console.log('Scanning ' + address + ':' + port);

    ps.checkPortStatus(port, address, function (err, status) {
        var portInfo = pn.getService(port);

        var result = {};
        result.open = !err && status == 'open';
        result.port = port;
        result.name = (portInfo != null) ? portInfo.name : 'unknown';
        result.description = (portInfo != null) ? portInfo.description : '';
        callback(result);
    });
};

function compare(a, b) {
    return a.port - b.port;
}

/*
var event = {
//   port: "80",
   host: "www.experts-exchange.com"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
