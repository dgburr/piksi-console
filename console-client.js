// Global state
var last_hb;

var cc = 0;
var colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'];

var fixModes = ['Invalid',
                'Single Point Position (SPP)',
                'Differential GNSS (DGNSS)',
                'Float RTK',
                'Fixed RTK',
                'Dead Reckoning',
                'SBAS Position'];
var fix_colors = ['#808080', '#ff0000', '#0000ff', '#e67e22', '#008000', '#000000', '#ff00ff'];
var color = function() {
  return colors[cc++];
}

var plots = {};

var init = function(io) {
  last_hb = new Date().getTime();

  var piksiCoords = {};
  var polylines = {};
  var markers = {};

  var positioned = false;

  var handlers = {
    'pos_llh': function(msg) {
      var id = msg.input_id;
      if(id == 1) { // step_gnss: use msg.fixedMode, msg.numSats
        if (msg.fixedMode) {
          nsats_legend = document.getElementById('nsats')
          if (nsats_legend) {
            nsats_legend.innerHTML= "N sats = " + msg.numSats
          }
        } else {
          nsats_legend = document.getElementById('nsats')
          if (nsats_legend) {
            nsats_legend.innerHTML= "N sats = -"
          }
        }
      } else if(id == 2) { // step_dr: use msg.fixedMode, msg.point, msg.h_acc
        if (msg.fixedMode) {
          piksiCoords[id] = piksiCoords[id] || [];
          piksiCoords[id].push(msg.point);
          // keep last 1000 points to show trailing path
          if(piksiCoords[id].length > 1000) {
            piksiCoords[id].shift()
          }

          if (document.getElementById('span_checkbox') && document.getElementById('span_checkbox').checked) {
            window.map.setCenter(msg.point);
          }

          fix_legend = document.getElementById('fix')
          if (fix_legend) {
            fix_legend.innerHTML= "Fix mode = " + fixModes[msg.fixedMode]
          }

          h_acc_legend = document.getElementById('h_acc')
          if (h_acc_legend) {
            h_acc_legend.innerHTML= "2D accuracy = " + msg.h_acc/1000 + "m"
          }

          var pos_circle = new google.maps.Circle({
            strokeColor: fix_colors[msg.fixedMode],
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: fix_colors[msg.fixedMode],
            fillOpacity: 0.35,
            map: window.map,
            center: msg.point,
            radius: msg.h_acc/1000
          });

          // Set all markers
          for (var piksiId in piksiCoords) {
            var path = piksiCoords[piksiId];
            var pathBegin = path[0];
            var pathEnd = path[path.length - 1];
            markers[piksiId] = markers[piksiId] || {};

            markers[piksiId].begin = markers[piksiId].begin ||
              new google.maps.Marker({
                map: window.map,
                title: "Piksi " + piksiId + " path begin"
              });
            markers[piksiId].begin.setPosition(pathBegin);

            markers[piksiId].end = markers[piksiId].end ||
              new google.maps.Marker({
                map: window.map,
                title: "Piksi " + piksiId + " path end"
              });
            markers[piksiId].end.setPosition(pathEnd);
          }

          // Set all polylines
          for (var piksiId in piksiCoords) {
            var path = piksiCoords[piksiId];
            polylines[piksiId] = polylines[piksiId] ||
              new google.maps.Polyline({
                map: window.map,
                geodesic: true,
                strokeColor: colors[piksiId],
                strokeOpacity: 1.0,
                strokeWeight: 2
              });
            polylines[piksiId].setPath(path);
          }
        } else {
          fix_legend = document.getElementById('fix')
          if (fix_legend) {
            fix_legend.innerHTML= "Fix mode = " + fixModes[0]
          }
          age_legend = document.getElementById('age')
          if (age_legend) {
            age_legend.innerHTML= "Age of corrections = - s"
          }
          h_acc_legend = document.getElementById('h_acc')
          if (h_acc_legend) {
            h_acc_legend.innerHTML= "2D accuracy = - m"
          }
          speed_legend = document.getElementById('speed')
          if (speed_legend) {
            speed_legend.innerHTML= "Ground speed = - m/s | - km/h | - mph";
          }
          speed_acc_legend = document.getElementById('speed_acc')
          if (speed_acc_legend) {
            speed_acc_legend.innerHTML= "Ground speed accuracy = - m/s"
          }
        }
      }
    },
    'vel_ned': function(msg) {
      if (msg.velMode) {
        speed_legend = document.getElementById('speed')
        if (speed_legend) {
          speed_ms = Math.round(Math.sqrt((msg.vel_n/1000)**2 + (msg.vel_e/1000)**2)*100)/100
          speed_ms = speed_ms.toFixed(2)
          speed_kph = Math.round(speed_ms*3.6*100)/100
          speed_kph = speed_kph.toFixed(2)
          speed_mph = Math.round(speed_kph*0.621371*100)/100
          speed_mph = speed_mph.toFixed(2)
          speed_legend.innerHTML= "Ground speed = " + speed_ms + " m/s | " + speed_kph + " km/h | " + speed_mph + " mph";
        }

        speed_acc_legend = document.getElementById('speed_acc')
        if (speed_acc_legend) {
          speed_acc_ms = msg.h_acc/1000
          speed_acc_ms = speed_acc_ms.toFixed(2)
          speed_acc_kph = Math.round(speed_acc_ms*3.6*100)/100
          speed_acc_kph = speed_acc_kph.toFixed(2)
          speed_acc_mph = Math.round(speed_acc_kph*0.621371*100)/100
          speed_acc_mph = speed_acc_mph.toFixed(2)
          speed_acc_legend.innerHTML= "Ground speed accuracy = " + speed_acc_ms + " m/s | " + speed_acc_kph + " km/h | " + speed_acc_mph + " mph";
        }
      }
    },
    'age_cor': function(msg) {
      if (msg.age_cor != 65535) {
        age_legend = document.getElementById('age')
        if (age_legend) {
          age_legend.innerHTML= "Age of corrections = " + msg.age_cor/10 + " s"
        }
      } else {
        age_legend = document.getElementById('age')
        if (age_legend) {
          age_legend.innerHTML= "Age of corrections = - s"
        }
      }
    },
    'heartbeat': function(msg) {
      var now = new Date().getTime();
      last_hb = now;
    }
  }
  io.input.add(handlers);
}

// TODO animate heartbeat, other messages?
var animate = function() {
  var now = new Date().getTime();
  var delta = Math.pow(1/2, (now - last_hb) / 3000);
  window.requestAnimationFrame(animate);
}

module.exports = init;
