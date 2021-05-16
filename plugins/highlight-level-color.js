// @author         vita10gy
// @name           Highlight portals by level color
// @category       Highlighter
// @version        0.1.3
// @description    Use the portal fill color to denote the portal level by using the game level colors.

/* exported setup --eslint */
/* global COLORS_LVL*/
// use own namespace for plugin
var highlightLevelColor = {};
window.plugin.highlightLevelColor = highlightLevelColor;

highlightLevelColor.highlight = function(data) {
  var portal_level = data.portal.options.data.level;
  if (portal_level !== undefined) {
    var opacity = .6;
    data.portal.setStyle({fillColor: COLORS_LVL[portal_level], fillOpacity: opacity});
  }
};

function setup () {
  window.addPortalHighlighter('Level Color', highlightLevelColor.highlight);
}
