// Scanning for 'bad' SSL, so this is OK for once!
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const tls = require('tls');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const pemtools = require('pemtools');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const escapeHtml = require('escape-html');
const ps = require('portscanner');

const cacertFile = '/etc/ssl/certs/ca-bundle.crt';

const portMax = 65535;
const now = Date.now();
const maxChainSize = 20;

const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

const sslscan = './sslscan --no-fallback --no-renegotiation --no-compression --no-heartbleed --xml=-';

const attrs = {
    cert: 1,
    https: 2
};

var allAttrs = 0;
for (var key in attrs) {
    allAttrs += attrs[key];
}

exports.handler = function(event, context, callback) {
    var host;
    var port;

    if (event.host.includes(':')) {
        var tokens = event.host.split(':');
        host = tokens[0];
        port = tokens[1];
        if (isNaN(port) || port < 0 || port > portMax) {
            callback('Invalid port number.');
            return;
        }
    }
    else {
        host = event.host;
        port = 443;
    }
    if (host.trim().length == 0) {
        callback('Invalid host');
        return;
    }

    ps.checkPortStatus(port, host, function (err, status) {
        if (err || status != 'open') {
            callback('Could not connect to ' + escapeHtml(host) + ':' + port);
            return;
        }
        checkSSL(host, port, callback);
    });
};

function getCertInfo(host, rawCertificateInfo) {
    var result = {
        trusted: false,
        expired: false,
        invalid: false,
        matches: false
    };

    // Alternate names
    if (rawCertificateInfo.subjectaltname) {
        result.altnames = [];
        rawCertificateInfo.subjectaltname.split(',').forEach(function(item) {
            result.altnames.push(item.replace(/^ ?DNS:/, ''));
        });
    }

    // Check that cert matches
    var check = (result.altnames) ? result.altnames.slice(0) : [];
    if (check.indexOf(rawCertificateInfo.subject.CN) == -1) {
        check.add(rawCertificateInfo.subject.CN);
    }
    check.forEach(function(item) {
        item = item.replace(/\./g, '\\.');
        item = item.replace(/^\*/, '[^\\.]*');
        item = '^' + item;
        var regexp = new RegExp(item);

        if (host.match(regexp))
            result.matches = true;
    });

    var certs = [];

    const versionRegEx = /Version: ([0-9]+)/;
    const signatureRegEx = /Signature Algorithm: ([0-9a-z-]+)/i;
    var currentCert = rawCertificateInfo;
    var currentChainCount = 0;
    while (currentChainCount < maxChainSize) {
        var cert = {};

        var from = new Date(currentCert.valid_from);
        var to = new Date(currentCert.valid_to);

        if (to < now)
            result.expired = true;
        if (from > now)
            result.invalid = true;

        cert.from = months[from.getUTCMonth()] + ' ' + from.getUTCDate() + ', ' + from.getUTCFullYear();
        cert.to = months[to.getUTCMonth()] + ' ' + to.getUTCDate() + ', ' + to.getUTCFullYear();
        cert.subject = currentCert.subject;
        if (currentCert != currentCert.issuerCertificate)
            cert.issuer = currentCert.issuer;
        cert.pem = pemtools(currentCert.raw, 'CERTIFICATE').pem;
        cert.fingerprint = currentCert.fingerprint;
        cert.serialNumber = currentCert.serialNumber.replace(/..\B/g, '$&:');
        certs.push(cert);

        try {
            var stdout = execSync('echo "' + cert.pem + '" | openssl x509 -noout -text').toString();
            var versionMatch = stdout.match(versionRegEx);
            if (versionMatch) {
                cert.version = versionMatch[1];
            }

            var signatureMatch = stdout.match(signatureRegEx);
            if (signatureMatch) {
                cert.signatureAlgoritm = signatureMatch[1];
            }
        }
        catch (err) {
            // Ignore
        }

        if (!currentCert.issuerCertificate)
            break;

        if (currentCert == currentCert.issuerCertificate) {
            var cacerts = fs.readFileSync(cacertFile, 'utf8');
            result.trusted = cacerts.includes(cert.pem);
            break;
        }
        currentCert = currentCert.issuerCertificate;
        currentChainCount++;
    }
    result.certs = certs;
    return result;
}

function checkSSL(host, port, callback) {
    var result = {
        'TLSv1.0': false,
        'TLSv1.1': false,
        'TLSv1.2': false,
        'SSLv2': false,
        'SSLv3': false
    }; 

    var error = false;
    var completedAttrs = 0;

    exec('echo | ' + sslscan + ' ' + host + ':' + port, function(err, stdout) {
        if (err) {
            if (!error) {
                error = true;
                callback('Could not connect to ' + escapeHtml(host) + ':' + port);
            }
            return;
        }

        parseString(stdout, function (err, res) {
            if (err || res.document.ssltest == undefined || res.document.ssltest.legnth == 0 || res.document.ssltest[0].cipher == undefined) {
                if (!error) {
                    error = true;
                    callback('Could not connect to ' + escapeHtml(host) + ':' + port);
                }
                return;
            }

            var ciphers = new Set();
            res.document.ssltest[0].cipher.forEach(function(item) {
                ciphers.add(item.$.cipher);
                result[item.$.sslversion] = true;
            });
            result.ciphers = Array.from(ciphers).sort();

            completedAttrs += attrs.cert;
            if (completedAttrs == allAttrs)
                callback(null, result);
        });
    });

    var options = {
        host: host,
        port: port,
        servername: host
    };
    var socket = tls.connect(options, function() {
        result.certificateInfo = getCertInfo(host, socket.getPeerCertificate(true));
        socket.end();
        completedAttrs += attrs.https;
        if (completedAttrs == allAttrs)
            callback(null, result);
    });
    socket.on('error', function(err) {
        if (!error && !result.certificateInfo) {
            error = true;
            callback('Could not connect to ' + escapeHtml(host) + ':' + port);
        }
    });
}

/*
var event = {
//   host: "wrong.host.badssl.com"
    host: 'www.experts-exchange.com'
//   host: "expired.badssl.com"
//   host: "self-signed.badssl.com"
//   host: "incomplete-chain.badssl.com"
//   host: "untrusted-root.badssl.com"
//   host: "revoked.badssl.com"
//   host: "qqq"
//   host: "<script>alert('test');</script>"
//   host: "www.nu.nl"
//   host: "www.nu"
//   host: "carol.ns.cloudflare.com"
};
exports.handler(event, null, function(err, result) {
    console.log(err);
    console.log(result);
});
*/
