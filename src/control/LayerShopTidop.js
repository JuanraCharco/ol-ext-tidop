/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
  released under the CeCILL-B license (French BSD license)
  (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/

import ol_ext_element from '../util/element.js'
import ol_layer_Group from 'ol/layer/Group.js'
import ol_layer_Layer from 'ol/layer/Layer.js'
import ol_control_LayerSwitcherTidop from '../control/LayerSwitcherTidop.js'

/** LayerShop a layer switcher with special controls to handle operation on layers.
 * @fires select
 * @fires drawlist
 * @fires toggle
 * @fires reorder-start
 * @fires reorder-end
 * @fires layer:visible
 * @fires layer:opacity
 * 
 * @constructor
 * @extends {ol_control_LayerSwitcher}
 * @param {Object=} options
 *  @param {boolean} options.selection enable layer selection when click on the title
 *  @param {function} options.displayInLayerSwitcher function that takes a layer and return a boolean if the layer is displayed in the switcher, default test the displayInLayerSwitcher layer attribute
 *  @param {boolean} options.show_progress show a progress bar on tile layers, default false
 *  @param {boolean} options.mouseover show the panel on mouseover, default false
 *  @param {boolean} options.reordering allow layer reordering, default true
 *  @param {boolean} options.trash add a trash button to delete the layer, default false
 *  @param {function} options.oninfo callback on click on info button, if none no info button is shown DEPRECATED: use on(info) instead
 *  @param {boolean} options.extent add an extent button to zoom to the extent of the layer
 *  @param {function} options.onextent callback when click on extent, default fits view to extent
 *  @param {number} options.drawDelay delay in ms to redraw the layer (usefull to prevent flickering when manipulating the layers)
 *  @param {boolean} options.collapsed collapse the layerswitcher at beginning, default true
 *  @param {ol.layer.Group} options.layerGroup a layer group to display in the switcher, default display all layers of the map
 *  @param {boolean} options.noScroll prevent handle scrolling, default false
 *
 * Layers attributes that control the switcher
 *	- allwaysOnTop {boolean} true to force layer stay on top of the others while reordering, default false
 *	- displayInLayerSwitcher {boolean} display the layer in switcher, default true
 *	- noSwitcherDelete {boolean} to prevent layer deletion (w. trash option = true), default false
 */
var ol_control_LayerShopTidop = class olcontrolLayerShopTidop extends ol_control_LayerSwitcherTidop {
  constructor(options) {

    options = options || {};
    options.selection = true;
    options.noScroll = true;

    super(options);
    this.element.classList.add('ol-layer-shop-tidop');

    // Control title (selected layer)
    var title = this.element.insertBefore(ol_ext_element.create('DIV', { className: 'ol-title-bar' }), this.getPanel());
    this.on('select', function (e) {
      title.innerText = e.layer ? e.layer.get('title') : '';
      this.element.setAttribute('data-layerClass', this.getLayerClass(e.layer));
    }.bind(this));

    // Top/bottom bar
    this._topbar = this.element.insertBefore(ol_ext_element.create('DIV', {
      className: 'ol-bar ol-top-bar toolbar-options'
    }), this.getPanel());
    this._bottombar = ol_ext_element.create('DIV', {
      className: 'ol-bar ol-bottom-bar',
      parent: this.element
    });

    this.lockDiv = ol_ext_element.create('DIV', {
      className: ' ol-buttom ol-unselectable ol-control-tidop d-none-tidop',
      click: function (e) {
        e.stopPropagation()
        e.preventDefault()
        var l = this.getSelection() //getMap().getLayers().item(this.getMap().getLayers().getLength() - 1)
        var iconLock = 'fa-solid fa-lock'
        if (l.get('tidop').time.lockClass !== undefined)
          iconLock = l.get('tidop').time.lockClass
        var iconUnlock = 'fa-solid fa-lock-open'
        if (l.get('tidop').time.unlockClass !== undefined)
          iconUnlock = l.get('tidop').time.unlockClass;
        var lock = l.get('tidop').time.lock
        var timeContent = '';
        if (lock !== true)
          timeContent += '<i class="' + iconLock + ' " style="margin-right: 3px;"></i>'
        else
          timeContent += '<i class="' + iconUnlock + ' " style="margin-right: 3px;"></i>'
        lock = !lock
        var time = l.get('tidop').time.value
        var extra_layer_data = document.getElementsByClassName(l.get('id') + '-extra-layer-data')[0];
        if (time !== '' && time !== undefined)
          extra_layer_data.innerHTML = timeContent + time
        else
          extra_layer_data.innerHTML = ''
        var p = l.getProperties()
        p.tidop.time.lock = lock
        l.setProperties(p)

        var c = this.lockI.getAttribute('class').split(' ')
        c.forEach((item, id) => {
          this.lockI.classList.remove(item)
        })
        if (!lock) {
          var unlockClassArray = iconUnlock.split(' ')
          for (var x=0;x<unlockClassArray.length;x++)
            this.lockI.classList.add(unlockClassArray[x])
        }
        else {
          var lockClassArray = iconLock.split(' ')
          for (var x=0;x<lockClassArray.length;x++)
            this.lockI.classList.add(lockClassArray[x])
        }

      }.bind(this),
      parent: this._topbar
    })
    this.lockButton = ol_ext_element.create('BUTTOM', {
      type: 'buttom',
      parent: this.lockDiv
    })
    this.lockI = ol_ext_element.create('I', {
      className:'fa-solid fa-lock-open',
      parent: this.lockButton
    })

    this.removeDiv = ol_ext_element.create('DIV', {
      className: ' ol-buttom ol-unselectable ol-control-tidop',
      click: function (e) {
        e.stopPropagation()
        e.preventDefault()
        var l = this.getSelection() //getMap().getLayers().item(this.getMap().getLayers().getLength() - 1)
        var id = l.get('id')
        if (l.getLayers)
          this.getMap().removeLayer(l)
        else {
          var layers = this.getMap().getLayers()
          var cont = -1
          var contGroup = -1
          var contSelected = 0
          var contGroupSelected = 0
          layers.forEach(function(lg){
            // Layer Group
            if (lg.getLayers) {
              contGroup++
              cont = -1
              var sublayers = lg.getLayers()
              sublayers.forEach(function(sl){
                cont++
                var idLayer = sl.get('id')
                if (id === idLayer) {
                  contSelected = cont
                  contGroupSelected = contGroup

                  sl.setVisible(false)
                  sl.set('displayInLayerSwitcher',false)

                }
              })
            }

          })

        }
      }.bind(this),
      parent: this._topbar
    })
    this.removeButton = ol_ext_element.create('BUTTOM', {
      type: 'buttom',
      parent: this.removeDiv
    })
    this.removeI = ol_ext_element.create('I', {
      className:'fa-solid fa-trash-alt',
      parent: this.removeButton
    })

    // Opacity
    this.opacityDiv = ol_ext_element.create('DIV', {
      className: 'opacity-tidop no-visible',
      parent: this._topbar
    })
    this.opacityInput = ol_ext_element.create('INPUT', {
      type: 'range',
      min: 0,
      max: 1,
      step: 0.01,
      value: 1,
      change: function (e) {
        e.stopPropagation()
        e.preventDefault()
        var l = this.getSelection()
        var op = parseFloat(this.opacityInput.value)
        l.setOpacity(op)
        //this.opacitySpan.innerHTML = (op * 100) + '%'
      }.bind(this),
      parent: this.opacityDiv
    })

    this._controls = [];
  }
  /** Set the map instance the control is associated with.
   * @param {_ol_Map_} map The map instance.
   */
  setMap(map) {
    if (this.getMap()) {
      // Remove map controls
      this._controls.forEach(function (c) {
        this.getMap().removeControl(c);
      }.bind(this));
    }

    super.setMap(map);

    if (map) {
      // Select first layer
      this.selectLayer();
      // Remove a layer
      this._listener.removeLayer = map.getLayers().on('remove', function (e) {
        // Select first layer
        if (e.element === this.getSelection()) {
          this.selectLayer();
        }
      }.bind(this));
      // Add controls
      this._controls.forEach(function (c) {
        this.getMap().addControl(c);
      }.bind(this));
    }
  }
  /** Get the bar element (to add new element in it)
   * @param {string} [position='top'] bar position bottom or top, default top
   * @returns {Element}
   */
  getBarElement(position) {
    return position === 'bottom' ? this._bottombar : this._topbar;
  }
  /** Add a control to the panel
   * @param {ol_control_Control} control
   * @param {string} [position='top'] bar position bottom or top, default top
   */
  addControl(control, position) {
    this._controls.push(control);
    control.setTarget(position === 'bottom' ? this._bottombar : this._topbar);
    if (this.getMap()) {
      this.getMap().addControl(control);
    }
  }

  /** Select a layer
   * @param {ol.layer.Layer} layer
   * @api
   */
  selectLayer(layer, silent) {
    if (!layer) {
      if (!this.getMap())
        return
      layer = this.getMap().getLayers().item(this.getMap().getLayers().getLength() - 1)
    }
    this._selectedLayer = layer

    if (layer instanceof ol_layer_Group)
      this.lockDiv.classList.add('d-none-tidop')
    else {
      if (layer.get('tidop') === undefined || layer.get('tidop') === null)
        this.lockDiv.classList.add('d-none-tidop')
      else
      if (layer.get('tidop').time === undefined || layer.get('tidop').time === null)
        this.lockDiv.classList.add('d-none-tidop')
      else
      if (layer.get('tidop').time.lock === undefined || layer.get('tidop').time.lock === null)
        this.lockDiv.classList.add('d-none-tidop')
      else
        this.lockDiv.classList.remove('d-none-tidop')
    }

    // Opacity
    this.opacityInput.value = layer.getOpacity()

    this.drawPanel()
    if (!silent)
      this.dispatchEvent({ type: 'select', layer: layer })
  }

  drawList(ul, collection) {
    var self = this
    var layers = collection.getArray()

    // Change layer visibility
    var setVisibility = function (e) {
      e.stopPropagation()
      e.preventDefault()
      var l = self._getLayerForLI(this.parentNode.parentNode)
      self.switchLayerVisibility(l, collection)
      if (self.get('selection') && l.getVisible()) {
        self.selectLayer(l)
      }
      if (self.onchangeCheck) {
        self.onchangeCheck(l)
      }
    }
    // Info button click
    function onInfo(e) {
      e.stopPropagation()
      e.preventDefault()
      var l = self._getLayerForLI(this.parentNode.parentNode)
      self.oninfo(l)
      self.dispatchEvent({ type: "info", layer: l })
    }
    // Zoom to extent button
    function zoomExtent(e) {
      e.stopPropagation()
      e.preventDefault()
      var l = self._getLayerForLI(this.parentNode.parentNode)
      if (self.onextent) {
        self.onextent(l)
      } else {
        self.getMap().getView().fit(l.getExtent(), self.getMap().getSize())
      }
      self.dispatchEvent({ type: "extent", layer: l })
    }
    // Remove a layer on trash click
    function removeLayer(e) {
      e.stopPropagation()
      e.preventDefault()
      var li = this.parentNode.parentNode.parentNode.parentNode
      var layer, group = self._getLayerForLI(li)
      // Remove the layer from a group or from a map
      if (group) {
        layer = self._getLayerForLI(this.parentNode.parentNode)
        group.getLayers().remove(layer)
        if (group.getLayers().getLength() == 0 && !group.get('noSwitcherDelete')) {
          removeLayer.call(li.querySelectorAll('.layerTrash')[0], e)
        }
      } else {
        li = this.parentNode.parentNode
        self.getMap().removeLayer(self._getLayerForLI(li))
      }
    }



    // Create a list for a layer
    function createLi(layer) {
      if (!this.displayInLayerSwitcher(layer)) {
        this._setLayerForLI(null, layer)
        return
      }

      var li = ol_ext_element.create('LI', {
        className: (layer.getVisible() ? "ol-visible " : " ") + (layer.get('baseLayer') ? "baselayer" : ""),
        parent: ul
      })
      this._setLayerForLI(li, layer)
      if (this._selectedLayer === layer) {
        li.classList.add('ol-layer-select')
      }

      var layer_buttons = ol_ext_element.create('DIV', {
        className: 'ol-layerswitcher-tidop-buttons',
        parent: li
      })

      // Content div
      var d = ol_ext_element.create('DIV', {
        className: 'li-content' + ' ' + layer.get('id') + '-li-content',
        parent: li
      })

      // Visibility
      ol_ext_element.create('INPUT', {
        type: layer.get('baseLayer') ? 'radio' : 'checkbox',
        className: 'ol-visibility',
        checked: layer.getVisible(),
        click: setVisibility,
        parent: d
      })

      var icon_layer = ''
      if (layer.get('icon'))
        icon_layer = '<i class="' + layer.get('icon') +  ' " style="margin-right: 3px;"></i>'

      // Label
      var label = ol_ext_element.create('LABEL', {
        title: layer.get('title') || layer.get('name'),
        click: setVisibility,
        style: {
          userSelect: 'none'
        },
        parent: d
      })
      label.addEventListener('selectstart', function () { return false })
      ol_ext_element.create('SPAN', {
        html: icon_layer + layer.get('title') || layer.get('name'),
        click: function (e) {
          if (this.get('selection')) {
            e.stopPropagation()
            this.selectLayer(layer)
          }
        }.bind(this),
        parent: label
      })


      if(this.getLayerClass(layer) != 'ol-layer-group')
        var dd = ol_ext_element.create('DIV', {
          className: 'extra-layer-data' + ' ' + layer.get('id') + '-extra-layer-data',
          //html: 'prueba',
          parent: d
        })

      if (layer.get('tidop') !== undefined && layer.get('tidop') !== null) {
        if (layer.get('tidop').time !== undefined && layer.get('tidop').time !== null) {
          var timeContent = '';
          var iconLock = 'fa-solid fa-lock'
          if (layer.get('tidop').time.lockClass !== undefined && layer.get('tidop').time.lockClass !== null)
            iconLock = layer.get('tidop').time.lockClass
          var iconUnlock = 'fa-solid fa-lock-open'
          if (layer.get('tidop').time.unlockClass !== undefined && layer.get('tidop').time.unlockClass !== null)
            iconUnlock = layer.get('tidop').time.unlockClass;
          if (layer.get('tidop').time.lock !== undefined && layer.get('tidop').time.lock !== null) {
            var c = this.lockI.getAttribute('class').split(' ')
            c.forEach((item, id) => {
              this.lockI.classList.remove(item)
            })
            if (layer.get('tidop').time.lock === true) {
              timeContent += '<i class="' + iconLock + ' " style="margin-right: 3px;"></i>'

              var lockClassArray = iconLock.split(' ')
              for (var x=0;x<lockClassArray.length;x++)
                this.lockI.classList.add(lockClassArray[x])
            }
            else {
              timeContent += '<i class="' + iconUnlock + ' " style="margin-right: 3px;"></i>'

              var unlockClassArray = iconUnlock.split(' ')
              for (var x=0;x<unlockClassArray.length;x++)
                this.lockI.classList.add(unlockClassArray[x])
            }
          }
          if (layer.get('tidop').time.value) {
            var time = layer.get('tidop').time.value
            var extra_layer_data = document.getElementsByClassName(layer.get('id') + '-extra-layer-data')[0];
            if (time !== '' && time !== undefined)
              extra_layer_data.innerHTML = timeContent + time
            else
              extra_layer_data.innerHTML = ''
          }
        }
      }


      //  up/down
      if (this.reordering) {
        if ((i < layers.length - 1 && (layer.get("allwaysOnTop") || !layers[i + 1].get("allwaysOnTop")))
            || (i > 0 && (!layer.get("allwaysOnTop") || layers[i - 1].get("allwaysOnTop")))) {
          ol_ext_element.create('DIV', {
            className: 'layerup ol-noscroll',
            title: this.tip.up,
            on: { 'mousedown touchstart': function (e) { self.dragOrdering_(e) } },
            parent: layer_buttons
          })
        }
      }

      // Show/hide sub layers
      if (layer.getLayers) {
        var nb = 0
        layer.getLayers().forEach(function (l) {
          if (self.displayInLayerSwitcher(l))
            nb++
        })
        if (nb) {
          ol_ext_element.create('DIV', {
            className: layer.get("openInLayerSwitcher") ? "collapse-layers" : "expend-layers",
            title: this.tip.plus,
            click: function () {
              var l = self._getLayerForLI(this.parentNode.parentNode)
              l.set("openInLayerSwitcher", !l.get("openInLayerSwitcher"))
            },
            parent: layer_buttons
          })
        }
      }






      // Info button
      if (this.oninfo) {
        ol_ext_element.create('DIV', {
          className: 'layerInfo',
          title: this.tip.info,
          click: onInfo,
          parent: layer_buttons
        })
      }
      // Layer remove
      if (this.hastrash && !layer.get("noSwitcherDelete")) {
        ol_ext_element.create('DIV', {
          className: 'layerTrash',
          title: this.tip.trash,
          click: removeLayer,
          parent: layer_buttons
        })
      }
      // Layer extent
      if (this.hasextent && layers[i].getExtent()) {
        var ex = layers[i].getExtent()
        if (ex.length == 4 && ex[0] < ex[2] && ex[1] < ex[3]) {
          ol_ext_element.create('DIV', {
            className: 'layerExtent',
            title: this.tip.extent,
            click: zoomExtent,
            parent: layer_buttons
          })
        }
      }

      // Progress
      if (this.show_progress && layer instanceof ol_layer_Tile) {
        var p = ol_ext_element.create('DIV', {
          className: 'layerswitcher-progress',
          parent: d
        })
        this.setprogress_(layer)
        layer.layerswitcher_progress = ol_ext_element.create('DIV', { parent: p })
      }

      // Opacity
      var opacity = ol_ext_element.create('DIV', {
        className: 'layerswitcher-opacity',
        // Click on the opacity line
        click: function (e) {
          if (e.target !== this)
            return
          e.stopPropagation()
          e.preventDefault()
          var op = Math.max(0, Math.min(1, e.offsetX / ol_ext_element.getStyle(this, 'width')))
          self._getLayerForLI(this.parentNode.parentNode).setOpacity(op)
          this.parentNode.querySelectorAll('.layerswitcher-opacity-label')[0].innerHTML = Math.round(op * 100)
        },
        parent: d
      })
      // Start dragging
      ol_ext_element.create('DIV', {
        className: 'layerswitcher-opacity-cursor ol-noscroll',
        style: { left: (layer.getOpacity() * 100) + "%" },
        on: {
          'mousedown touchstart': function (e) { self.dragOpacity_(e) }
        },
        parent: opacity
      })
      // Percent
      ol_ext_element.create('DIV', {
        className: 'layerswitcher-opacity-label',
        html: Math.round(layer.getOpacity() * 100),
        parent: d
      })

      // Layer group
      if (layer.getLayers) {
        li.classList.add('ol-layer-group')
        if (layer.get("openInLayerSwitcher") === true) {
          var ul2 = ol_ext_element.create('UL', {
            parent: li
          })
          this.drawList(ul2, layer.getLayers())
        }
      }
      li.classList.add(this.getLayerClass(layer))

      // Dispatch a dralist event to allow customisation
      this.dispatchEvent({ type: 'drawlist', layer: layer, li: li })
    }

    // Add the layer list
    for (var i = layers.length - 1; i >= 0; i--) {
      createLi.call(this, layers[i])
    }

    this.viewChange()

    if (ul === this.panel_)
      this.overflow()
  }

}

export default ol_control_LayerShopTidop
