console.log("Loading Function");

var calc = require( 'ip-subnet-calculator' );
var sprintf = require("sprintf-js").sprintf;

var format = "%-25s";

exports.handler = function(event, context, callback) {
   var ip = event.ip;
   var prefixSize = event.prefixSize;

   var ipInfo = calc.calculateSubnetMask(ip, prefixSize);
   if (ipInfo == null) {
      // Invalid input
      // callback("Bad IP or Netmask");
      return;
   }

   var numberOfHosts = ipInfo.ipHigh - ipInfo.ipLow - 1;
   var hostMin = calc.toString(ipInfo.ipLow + 1);
   var hostMax = calc.toString(ipInfo.ipHigh - 1);

   var output = "<pre>\n";

   output += "<font color=\"#000000\">Address:    </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, ip) + "</font>\n";
   output += "<br/>\n";

   output += "<font color=\"#000000\">Netmask:    </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, ipInfo.prefixMaskStr + " (/" + ipInfo.prefixSize + ")") + "</font>\n";
   output += "<br/>\n";

   output += "<font color=\"#000000\">:Wildcard:  </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, ipInfo.invertedMaskStr) + "</font>\n";
   output += "<br/>\n";

   output += "<br/><br/>-------------------------------------------<br/><br/>\n";

   output += "<font color=\"#000000\">Network:    </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, ipInfo.ipLowStr) + "</font>\n";
   output += "<br/>\n";

   output += "<font color=\"#000000\">Broadcast:  </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, ipInfo.ipHighStr) + "</font>\n";
   output += "<br/>\n";
   
   output += "<font color=\"#000000\">First Host: </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, hostMin) + "</font>\n";
   output += "<br/>\n";

   output += "<font color=\"#000000\">Last Host:  </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, hostMax) + "</font>\n";
   output += "<br/>\n";

   output += "<font color=\"#000000\"># of Hosts: </font>\n";
   output += "<font color=\"#0000ff\">" + sprintf(format, numberOfHosts) + "</font>\n";
   output += "<br/>\n";

   output += "</pre>";

   console.log(output);
//   callback(null, output);
}

var event = {
   ip: "192.168.0.2",
   prefixSize: "24"
};
exports.handler(event, null, null);
