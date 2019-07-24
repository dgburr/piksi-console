var _ = require('underscore');
var startServer = require('../base/server');
var pc = require('../console_tcp');

var sockets = {};

//var piksi1 = pc("/dev/ttyACM2");
var piksi1 = pc(1235,'127.0.0.1');
//var piksi1 = pc(55555,'10.1.23.101');
//var piksi2 = pc("/dev/cu.usbserial-00002014");
//var piksi = pc("/dev/tty.usbserial-00001014");


var server = startServer(2223);

// Forward messages to clients
piksi1.add_default(function(msg) {
  msg.piksi_id = 1;
  _.each(sockets, function(out) {
    //console.log("piksi 1", msg);
    out.handle(msg);
  });
});

//piksi2.add_default(function(msg) {
//  msg.piksi_id = 2;
//  _.each(sockets, function(out) {
//    //console.log("piksi 2", msg);
//    out.handle(msg);
//  });
//});

server.add({
  // {ws, id}
  'close': function(msg) {
    delete sockets[msg.id];
  },
  'connection': function(msg) {
    // Forward messages
    sockets[msg.id] = msg.output;
  },
});
