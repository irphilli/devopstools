var AWS = require("aws-sdk");
var fs = require("fs");
var process = require('child_process');

var incoming = "files/incoming/";
var properties = "/tmp/entry.processors.properties";
var tmpout = "/tmp/zipgrep.out";

exports.handler = function(event, context, callback) {
   if (!event.bucket || !event.file || !event.command) {
      callback("Bad parameters");
      return;
   }
   if (event.command == "grep") {
      if (!event.pattern && !event.extensions) {
         callback("Bad parameters");
         return;
      }
      event.extensions = event.extensions.trim();
      var extensions = [];

      var extensions = new Set();
      event.extensions.split(",").forEach(function(item) {
         item = item.trim();
         if (item != "") {
            item = item.replace(/^\./, "");
            extensions.add(item);
         }
      });
      extensions = Array.from(extensions);
   }

   var params = {
      Bucket: event.bucket,
      Key: incoming + event.file
   };
   var s3 = new AWS.S3();
   var tmp = "/tmp/" + event.file;
   var stream = s3.getObject(params).createReadStream();
   stream.pipe(fs.createWriteStream(tmp));
   stream.on("error", function(err) {
      console.log("Could not download s3://" + event.bucket + "/" + incoming + event.file);
      console.log(err);
      callback("Backend error (could not retrieve file)");
   });
   stream.on("finish", function() {
      switch (event.command) {
         case "list":
            list(tmp, callback);
         break;
         case "grep":
            grep(tmp, event.pattern, extensions, callback);
         break;
         default:
            callback("Unknown command: " + event.command);
      }
   });
};

function list(file, callback) {
   if (fs.existsSync(tmpout))
      fs.unlinkSync(tmpout);

   var stdout = "";
   var stderr = "";
	var child = process.spawn("java", ["-jar", "zipgrep.jar", "-list", file]);

   child.stdout.on("data", function(data) {
      fs.appendFileSync(tmpout, data);
      stdout += data;
   });
   child.stderr.on("data", function(data) {
      stderr += data;
   });
	child.on("close", function(code) {
		if (code != 0) {
         console.log(stderr);
         callback("Unable to open archive");
         return;
      }
   	var strlen = file.length + 2; // 2 for 0-based + extra slash

		stdout = "";
		stderr = "";
		child = process.spawn("cut", ["-c" + strlen + "-", tmpout]);

		child.stdout.on("data", function(data) {
         stdout += data;
      });
		child.stderr.on("data", function(data) {
         stderr += data;
      });
      child.on("close", function(code) {
         if (code != 0) {
            console.log(stderr);
            callback("Server error");
            return;
         }
         var result = {
            list: stdout
         };
         callback(null, result);
      });
		
	});
}

function setUpExtensionConfig(file, extensions, callback) {
   if (fs.existsSync(properties))
      fs.unlinkSync(properties);

   if (extensions.length > 0) {
      var stream = fs.createWriteStream(properties);
      stream.once("open", function(fd) {
         extensions.forEach(function(item) {
            stream.write("." + item + "=com.technojeeves.zipgrep.processors.SimpleTextProcessor");
         });
         stream.end();
      });
      stream.on("error", function(err) {
         callback(err);
      });
      stream.on("finish", function() {
         callback(null);
      });
   }
}

function grep(file, pattern, extensions, callback) {
   setUpExtensionConfig(file, extensions, function(err) {
      if (err) {
         console.log(err);
         callback("Server error");
         return;
      }

      if (fs.existsSync(tmpout))
         fs.unlinkSync(tmpout);

      var stdout = "";
      var stderr = "";
      var child = process.spawn("java", ["-jar", "zipgrep.jar", file, pattern]);

      child.stdout.on("data", function(data) {
         fs.appendFileSync(tmpout, data);
         stdout += data;
      });
      child.stderr.on("data", function(data) {
         stderr += data;
      });
      child.on("close", function(code) {
         if (code != 0) {
            console.log(stdout);
            console.log(stderr);
            console.log(code);
            callback("Unable to run grep (bad pattern?)");
            return;
         }
         var strlen = file.length + 2; // 2 for 0-based + extra slash

         stdout = "";
         stderr = "";
         child = process.spawn("cut", ["-c" + strlen + "-", tmpout]);

         child.stdout.on("data", function(data) {
            stdout += data;
         });
         child.stderr.on("data", function(data) {
            stderr += data;
         });
         child.on("close", function(code) {
            if (code != 0) {
               console.log(stdout);
               console.log(stderr);
               console.log(code);
               callback("Server error");
               return;
            }
            var result = {
               grep: stdout
            };
            callback(null, result);
         });
      });
   });
}

/*
var event = {
   bucket: "filedb.dev.redsrci.com",
   file: "ee-dist.zip",
   command: "grep",
//   command: "list",
   pattern: "ZipGrep",
   extensions: "java"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
