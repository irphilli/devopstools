const whois = require('whois');
const geoip = require('geoip2');
const ip = require('ip');
const dns = require('dns');
const parseDomain = require('parse-domain');
const escapeHtml = require('escape-html');

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
                callback('Could not resolve ' + escapeHtml(host));
            }
            else {
                runIpLookup(host, ip, callback);
            }
        });
    }
};

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
            result.domain = domainInfo.domain + '.' + domainInfo.tld;
    }

    var runCallback = false;

    if (ip.isPrivate(lookupIp)) {
        result.private = true;
        callback(null, result);
        return;
    }

    geoip.init(); 
    geoip.lookupSimple(lookupIp, function (err, data) {
        if (!err) {
            result.location = '';
            if (data.city)
                result.location = data.city + ', ';
            if (data.subdivision)
                result.location += data.subdivision + ', ';
            result.location += data.country;
        }
      
        if (runCallback)
            callback(null, result);
        else
            runCallback = true;
    });

    whois.lookup(lookupIp, {'follow': 2}, function (err, data) {
        var regexps = {
            organization: /Organization: +(.+)/,
            abuseContact: /OrgAbuseEmail: +(.+)/,
            techContact:  /OrgTechEmail: +(.+)/
        };
        for (var key in regexps) {
            var found = data.match(regexps[key]);
            result[key] = (found) ? found[1] : null;
        }
        if (runCallback)
            callback(null, result);
        else
            runCallback = true;
    });
}

/*
var event = {
//   host: "104.20.69.216"
//   host: "98.139.183.24"
//   host: "127.0.0.1"
//   host: "10.10.0.1"
   host: "experts-exchange.com"
//   host: "a"
//   host: "2607:f8b0:4005:804::200e"
//   host: "<script>alert('test');</script>"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
