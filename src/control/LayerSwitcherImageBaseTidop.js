/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
import ol_control_LayerSwitcherTidop from './LayerSwitcherTidop.js'
import '../layer/GetPreview.js'
import ol_ext_element from '../util/element.js';

/**
 * @classdesc OpenLayers Layer Switcher Control.
 * @require layer.getPreview
 *
 * @constructor
 * @extends {ol_control_LayerSwitcher}
 * @param {Object=} options Control options.
 */
var ol_control_LayerSwitcherImageBaseTidop = class olcontrolLayerSwitcherImageBaseTidop extends ol_control_LayerSwitcherTidop {
  constructor(options) {
    options = options || {};
    options.switcherClass = ((options.switcherClass || '') +  ' ol-layerswitcher-image-base-tidop').trim();
    options.mouseover = (options.mouseover !== false);

    super(options);
  }
  
  /** Render a list of layer
   * @param {elt} element to render
   * @layers {Array{ol.layer}} list of layer to show
   * @api stable
   */
  drawList(ul, layers) {
    var self = this;

    var totalLayers = []
    layers.forEach(function (layer) {
      if (layer.getLayers) {
        layer.getLayers().forEach(function (subLayer) {
          totalLayers.push(subLayer)
        });
      }
      else
        totalLayers.push(layer)
    });

    var setVisibility = function (e) {
      e.preventDefault();
      var l = self._getLayerForLI(this);
      self.switchLayerVisibility(l, totalLayers);
      if (e.type == "touchstart")
        self.element.classList.add("ol-collapsed");
    };

    ol_ext_element.setStyle(ul, { height: 'auto' });

    totalLayers.forEach(function (layer) {
      if (self.displayInLayerSwitcher(layer) && layer.get('baseLayer')) {
        var preview = layer.getPreview ? layer.getPreview() : ["none"];
        var d = ol_ext_element.create('LI', {
          className: 'ol-imgcontainer' + (layer.getVisible() ? ' ol-visible' : ''),
          on: { 'touchstart click': setVisibility },
          parent: ul
        });
        self._setLayerForLI(d, layer);
        preview.forEach(function (img) {
          ol_ext_element.create('IMG', {
            src: img,
            parent: d
          });
        });
        ol_ext_element.create('p', {
          html: layer.get("title") || layer.get("name"),
          parent: d
        });

        if (self.testLayerVisibility(layer))
          d.classList.add('ol-layer-hidden');
      }
    });
  }
  /** Disable overflow
  */
  overflow() { }
}

export default ol_control_LayerSwitcherImageBaseTidop