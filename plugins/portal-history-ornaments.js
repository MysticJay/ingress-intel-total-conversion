// @author         Johtaja
// @name           Portal History Ornaments
// @category       Highlighter
// @version        0.1.0
// @description    Display portal history as ornaments


// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHistoryOrnaments = portalsHistory;

// Exposed functions
portalsHistory.toggleHistory        = toggleHistory;        // needed for button
portalsHistory.toggleDisplayMode    = toggleDisplayMode;    // used by dialog
portalsHistory.drawAllFlags         = drawAllFlags;         // hooked to 'mapDataRefreshEnd'

var KEY_SETTINGS = "plugin-portal-history-flags";

//------------------------------------------------------------------------------------------
// Toggle Switch

function makeButton () {
  var isClass = portalsHistory.settings.drawMissing ? 'revHistory' : 'normHistory';
  
  $('.leaflet-top.leaflet-left').append(
    $('<div>', { id: 'toggleHistoryButton', class: 'leaflet-control leaflet-bar' }).append(
      $('<a>', {
        id: 'toggleHistory',
        title: 'History toggle',
        class: isClass,
        click: function () { toggleHistory(true); return false; }
      })
    )
  )
};

function toggleHistory(keepUIbutton) {
  var button = $('#toggleHistory');

  portalsHistory.settings.drawMissing = !portalsHistory.settings.drawMissing
  localStorage[KEY_SETTINGS] = JSON.stringify(portalsHistory.settings);
  drawAllFlags();

  if (button.hasClass('normHistory')) {
    button.removeClass('normHistory');
    button.addClass('revHistory');
  } else {
    button.addClass('normHistory');
    button.removeClass('revHistory');
  }
};

function svgToIcon (str, s) {
  var url = ('data:image/svg+xml,' + encodeURIComponent(str)).replace(/#/g, '%23');
  return new L.Icon({
    iconUrl: url,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    className: 'no-pointer-events', // allows users to click on portal under the unique marker
  })
}

function loadSettings() {
  try {
    portalsHistory.settings = JSON.parse(localStorage[KEY_SETTINGS]);
  } catch (e) {
    portalsHistory.settings = {
      drawMissing: false,
      showVisited: true,
      showCaptured: true,
      showScoutControlled: false,
    };
  }
}

function toggleDisplayMode () {
  dialog({
    html: `<div id="portal-history-settings">
<div>
<select id="portal-history-settings--display-mode">
  <option value="received" ${portalsHistory.settings.drawMissing?'':'selected'}>Show uniques received</option>
  <option value="missing" ${portalsHistory.settings.drawMissing?'selected':''}>Show missing uniques</option>
</select>
</div>
<div><label style="color:red;"><input type="checkbox" id="portal-history-settings--show-visited" 
  ${portalsHistory.settings.showVisitedCaptured?'checked':''}> Show visited/captured</label></div>
<div><label style="color:violet;"><input type="checkbox" id="portal-history-settings--show-scouted" 
  ${portalsHistory.settings.showScoutControlled?'checked':''}> Show Scout Controlled</label></div>
</div>`,

    title: 'Portal History Settings',
    id: 'plugin-portal-history-flags',
    width: 'auto',
    closeCallback: function () {
      var elMode = document.getElementById('portal-history-settings--display-mode');
      var elVisitedCaptured = document.getElementById('portal-history-settings--show-visited');
      var elScouted = document.getElementById('portal-history-settings--show-scouted');

      portalsHistory.settings.drawMissing = elMode.value === 'missing';
      portalsHistory.settings.showVisitedCaptured = elVisitedCaptured.checked;
      portalsHistory.settings.showScoutControlled = elScouted.checked;

      localStorage[KEY_SETTINGS] = JSON.stringify(portalsHistory.settings);
      portalsHistory.drawAllFlags();
    }
  });
}
  
function createIcons () {
// portalMarkerRadiuses are [7, 7, 7, 7, 8, 8, 9, 10, 11];
  var LEVEL_TO_RADIUS =   [6, 6, 6, 6, 8, 8, 8, 10, 11];    // values differ as the weight is not included
  var scale = window.portalMarkerScale();
  portalsHistory.iconSemiMarked = {};
  portalsHistory.iconMarked = {};
  portalsHistory.iconScoutControlled = {};
  var parts = (portalsHistory.settings.showVisitedCaptured + portalsHistory.settings.showScoutControlled);
  LEVEL_TO_RADIUS.forEach((portalMarkerRadius, idx) => {
    var iconSize = (portalMarkerRadius * 2 + 8) * scale;    // 8 = 2 x weight of ornament (4px)
    var offset = 0;
    if (portalsHistory.settings.showScoutControlled) {
      portalsHistory.iconScoutControlled[idx] = svgToIcon(getSVGString(iconSize, 'violet', parts, offset), iconSize + 4);
      offset++;
      } else {
      portalsHistory.iconScoutControlled[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + 4);
    }

    if (portalsHistory.settings.showVisitedCaptured) {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(iconSize, 'yellow', parts, offset), iconSize + 4);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(iconSize, 'red', parts, offset), iconSize + 4);
      offset++;
    } else {
      portalsHistory.iconSemiMarked[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + 4);
      portalsHistory.iconMarked[idx] = svgToIcon(getSVGString(iconSize, 'transparent', parts, offset), iconSize + 4);
    }
  });
}

function drawPortalFlags (portal) {
  var drawMissing = portalsHistory.settings.drawMissing;
  portal._historyLayer = L.layerGroup();
  var history = portal.options.data.history;
  
  if (history) {
    if (drawMissing && !history.visited || !drawMissing && history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconMarked[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && history.visited && !history.captured 
        || !drawMissing && history.visited && !history.captured) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconSemiMarked[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
    if (drawMissing && !history.scoutControlled || !drawMissing && history.scoutControlled) {
      L.marker(portal._latlng, {
        icon: portalsHistory.iconScouted[portal.options.level],
        interactive: false,
        keyboard: false,
      }).addTo(portal._historyLayer);
    }
  }
  portal._historyLayer.addTo(portalsHistory.layerGroup);
}

function drawAllFlags () {
  portalsHistory.layerGroup.clearLayers();
  createIcons();
  var tileParams = window.getCurrentZoomTileParameters();
  if (tileParams.level !== 0) {
    return;
  }

  for (var id in window.portals) {
    drawPortalFlags(window.portals[id]);
  }
}

function getSVGString (size, color, parts, offset) {
  var circumference = size * Math.PI;
  var arcOffset = circumference / parts * (parts - 1);
  var rotate = 360 / parts * offset;
  return `<svg width="${(size+4)}" height="${(size+4)}" xmlns="http://www.w3.org/2000/svg">
          <circle stroke="${color}" stroke-width="4" fill="transparent" cx="${(size+4)/2}" cy="${(size+4)/2}" 
          r="${(size/2)}" stroke-dasharray="${circumference}" stroke-dashoffset="${arcOffset}" 
          transform="rotate(${rotate}, ${((size+4)/2)}, ${((size+4)/2)})" />
          </svg>`;
}
// -----------------------------------------------------------------------------------------
var setup = function () {

  $('<style>').prop('type', 'text/css').html('@include_string:portal-history-ornaments.css@').appendTo('head');

// Initialization
  loadSettings();
  portalsHistory.layerGroup = L.LayerGroup()
    .on('add', function () {
       $('#toggleHistoryButton').show();
    })
    .on('remove', function () {
      $('#toggleHistoryButton').hide();
    });

  window.addLayerGroup('Portal History', portalsHistory.layerGroup, false);

// Hooks
  window.addHook('mapDataRefreshEnd', portalsHistory.drawAllFlags);

// UI additions
  makeButton ();
  $('#toolbox').append('<a onclick="window.plugin.portalHistoryOrnaments.toggleDisplayMode()">Portal History</a>');
}
