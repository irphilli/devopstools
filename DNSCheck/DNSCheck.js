const https = require('https');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

exports.handler = function(event, context, callback) {
   const options = {
      host: 'intodns.com',
      path: '/' + event.host
   }
   var request = https.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) {
         data += chunk;
      });
      res.on('end', function () {
         parseHtml(data, callback);
      });
   });
   request.on('error', function (e) {
      callback("Error fetching from intodns.com: " + e);
   });
   request.end();
};

function parseHtml(html, callback) {
   const dom = new JSDOM(html);
   const tbody = dom.window.document.querySelector("tbody");
   var category;
   var result = {};

   if (tbody) {
      for (var i = 0; i < tbody.children.length; i++) {
         const tr = tbody.children[i];
         var offset = 0;
         if (tr.children.length == 4) {
            category = tr.children[0].textContent;
            offset = 1;
            result[category] = {};
         }
         const level = tr.children[0 + offset].children[0].alt.replace("Information", "Info");
         const test = tr.children[1 + offset].textContent;
         const info = tr.children[2 + offset].textContent.replace(/^(\s|\t)*/gm, "");

         if (!result[category][level]) {
            result[category][level] = [];
         }
         result[category][level].push({
            "test": test,
            "info": info
         });
      }
      callback(null, result);
   }
   else {
      callback("Invalid response");
   }
}

/*
var event = {
   host: "experts-exchange.com"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
