var _ = require('underscore');
var repl = require('repl');

var binary = require('binary');

var libsbp = require('libsbp');
var dispatcher = libsbp.dispatch;

var obj = require('./base/obj');

var net = require('net');

var mkConnection = function(port, ip) {
  var piksiObj = new obj();

  var piksi = new net.Socket();

  piksi.connect(port, ip, function() {
    console.log('TCP port open!');
    piksiObj.handle({tag: 'open'});

    dispatcher(piksi, function (err, framedMessage) {
      // MSG_POS_LLH
      if (0x020A === framedMessage.sbp.msg_type) {
        piksiObj.handle({
          tag: 'pos_llh',
          point: { lat: framedMessage.fields.lat, lng: framedMessage.fields.lon }, // east/north
          numSats: framedMessage.fields.n_sats,
          fixedMode: framedMessage.fields.flags & 7,
          h_acc: framedMessage.fields.h_accuracy,
          v_acc: framedMessage.fields.v_accuracy,
        });
      }

      // MSG_VEL_NED
      if (0x020E === framedMessage.sbp.msg_type) {
        piksiObj.handle({
          tag: 'vel_ned',
          vel_n: framedMessage.fields.n,
          vel_e: framedMessage.fields.e,
          vel_d: framedMessage.fields.d,
          h_acc: framedMessage.fields.h_accuracy,
          v_acc: framedMessage.fields.v_accuracy,
          velMode: framedMessage.fields.flags & 7
        });
      }

      // MSG_AGE_CORRECTIONS
      if (0x0210 === framedMessage.sbp.msg_type) {
        piksiObj.handle({
          tag: 'age_cor',
          age_cor: framedMessage.fields.age
        });
      }
    });
  });

  piksi.on('close', function() {
    console.log('Connection closed');
  });

  return piksiObj;
}

module.exports = mkConnection
