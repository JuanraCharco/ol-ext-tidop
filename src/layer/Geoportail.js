/*	Copyright (c) 2019 Jean-Marc VIGLINO,
  released under the CeCILL-B license (French BSD license)
  (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
import ol_layer_Tile from 'ol/layer/Tile.js'
import ol_format_WMTSCapabilities from 'ol/format/WMTSCapabilities.js'
import ol_ext_Ajax from '../util/Ajax.js'
import {transformExtent as ol_proj_transformExtent} from 'ol/proj.js'
// import {intersects as ol_extent_intersects} from 'ol/extent'

import ol_source_Geoportail from '../source/Geoportail.js'

/** IGN's Geoportail WMTS layer definition
 * @constructor 
 * @extends {ol.layer.Tile}
 * @param {olx.layer.WMTSOptions=} options WMTS options if not defined default are used
 *  @param {string} options.layer Geoportail layer name
 *  @param {string} options.gppKey Geoportail API key, default use layer registered key
 *  @param {ol.projectionLike} [options.projection=EPSG:3857] projection for the extent, default EPSG:3857
 * @param {olx.source.WMTSOptions=} tileoptions WMTS options if not defined default are used
 */
 var ol_layer_Geoportail = class ollayerGeoportail extends ol_layer_Tile {
  constructor(layer, options, tileoptions) {
    options = options || {}
    tileoptions = tileoptions || {}
    // use function(options, tileoption) when layer is set in options
    if (typeof (layer) !== 'string') {
      tileoptions = options || {}
      options = layer
      layer = options.layer
    }
    var maxZoom = options.maxZoom

    // A source is defined
    if (options.source) {
      layer = options.source.getLayer()
      options.gppKey = options.source.getGPPKey()
    }

    var capabilities = window.geoportailConfig ? window.geoportailConfig.capabilities[options.gppKey || options.key] || window.geoportailConfig.capabilities["default"] || ol_layer_Geoportail.capabilities : ol_layer_Geoportail.capabilities
    capabilities = capabilities[layer]
    if (!capabilities)
      capabilities = ol_layer_Geoportail.capabilities[layer]
    if (!capabilities) {
      capabilities = { title: layer, originators: [] }
      console.error("ol.layer.Geoportail: no layer definition for \"" + layer + "\"\nTry to use ol/layer/Geoportail~loadCapabilities() to get it.")
      // throw new Error("ol.layer.Geoportail: no layer definition for \""+layer+"\"");
    }

    // tile options & default params
    for (var i in capabilities) {
      if (typeof tileoptions[i] == "undefined")
        tileoptions[i] = capabilities[i]
    }

    if (options.gppKey || options.key) tileoptions.gppKey = options.gppKey || options.key;
    // if (!tileoptions.gppKey && !tileoptions.key) tileoptions.gppKey = options.gppKey || options.key
    if (!options.source) options.source = new ol_source_Geoportail(layer, tileoptions)
    if (!options.title) options.title = capabilities.title
    if (!options.name) options.name = layer
    options.layer = layer
    if (!options.queryable) options.queryable = capabilities.queryable
    if (!options.desc) options.desc = capabilities.desc
    if (!options.extent && capabilities.bbox) {
      if (capabilities.bbox[0] > -170 && capabilities.bbox[2] < 170) {
        options.extent = ol_proj_transformExtent(capabilities.bbox, 'EPSG:4326', options.projection || 'EPSG:3857')
      }
    }
    options.maxZoom = maxZoom

    // calculate layer max resolution
    if (!options.maxResolution && tileoptions.minZoom) {
      options.source.getTileGrid().minZoom -= (tileoptions.minZoom > 1 ? 2 : 1)
      options.maxResolution = options.source.getTileGrid().getResolution(options.source.getTileGrid().minZoom)
      options.source.getTileGrid().minZoom = tileoptions.minZoom
    }

    super(options)
    this._originators = capabilities.originators

    // BUG GPP / OLD VERSION: Attributions constraints are not set properly :(
    /** /
    
      // Set attribution according to the originators
      var counter = 0;
      // Get default attribution
      var getAttrib = function(title, o) {
        if (this.get('attributionMode')==='logo') {
          if (!title) return ol_source_Geoportail.prototype.attribution;
          else return '<a href="'+o.href+'"><img src="'+o.logo+'" title="&copy; '+o.attribution+'" /></a>';
        } else {
          if (!title) return ol_source_Geoportail.prototype.attribution;
          else return '&copy; <a href="'+o.href+'" title="&copy; '+(o.attribution||title)+'" >'+title+'</a>'
        }
      }.bind(this);
    
      var currentZ, currentCenter = [];
      var setAttribution = function(e) {
        var a, o, i;
        counter--;
        if (!counter) {
          var z = e.frameState.viewState.zoom;
          console.log(e)
          if (z===currentZ
            && e.frameState.viewState.center[0]===currentCenter[0]
            && e.frameState.viewState.center[1]===currentCenter[1]){
              return;
          }
          currentZ = z;
          currentCenter = e.frameState.viewState.center;
          var ex = e.frameState.extent;
          ex = ol_proj_transformExtent (ex, e.frameState.viewState.projection, 'EPSG:4326');
          if (this._originators) {
            var attrib = this.getSource().getAttributions();
            // ol v5
            if (typeof(attrib)==='function') attrib = attrib();
            attrib.splice(0, attrib.length);
            var maxZoom = 0;
            for (a in this._originators) {
              o = this._originators[a];
              for (i=0; i<o.constraint.length; i++) {
                if (o.constraint[i].maxZoom > maxZoom
                  && ol_extent_intersects(ex, o.constraint[i].bbox)) {
                    maxZoom = o.constraint[i].maxZoom;
                }
              }
            }
            if (maxZoom < z) z = maxZoom;
            if (this.getSource().getTileGrid() && z < this.getSource().getTileGrid().getMinZoom()) {
              z = this.getSource().getTileGrid().getMinZoom();
            }
            for (a in this._originators) {
              o = this._originators[a];
              if (!o.constraint.length) {
                attrib.push (getAttrib(a, o));
              } else {
                for (i=0; i<o.constraint.length; i++) {
                  if ( z <= o.constraint[i].maxZoom
                    && z >= o.constraint[i].minZoom
                    && ol_extent_intersects(ex, o.constraint[i].bbox)) {
                      attrib.push (getAttrib(a, o));
                      break;
                  }
                }
              }
            }
            if (!attrib.length) attrib.push ( getAttrib() );
            this.getSource().setAttributions(attrib);
          }
        }
      }.bind(this);
    
      this.on('precompose', function(e) {
        counter++;
        setTimeout(function () { setAttribution(e) }, 500);
      });
    /**/
  }
  /** Register new layer capability
   * @param {string} layer layer name
   * @param {*} capability
   */
  static register(layer, capability) {
    ol_layer_Geoportail.capabilities[layer] = capability
  }
  /** Check if a layer registered with a key?
   * @param {string} layer layer name
   * @returns {boolean}
   */
  static isRegistered(layer) {
    return ol_layer_Geoportail.capabilities[layer] && ol_layer_Geoportail.capabilities[layer].key
  }
  /** Load capabilities from the service
   * @param {string} gppKey the API key to get capabilities for
   * @return {*} Promise-like response
   */
  static loadCapabilities(gppKey) {
    var onSuccess = function () { }
    var onError = function () { }
    var onFinally = function () { }

    this.getCapabilities(gppKey).then(function (c) {
      ol_layer_Geoportail.capabilities = c
      onSuccess(c)
    }).catch(function (e) {
      onError(e)
    }).finally(function (c) {
      onFinally(c)
    })

    var response = {
      then: function (callback) {
        if (typeof (callback) === 'function')
          onSuccess = callback
        return response
      },
      catch: function (callback) {
        if (typeof (callback) === 'function')
          onError = callback
        return response
      },
      finally: function (callback) {
        if (typeof (callback) === 'function')
          onFinally = callback
        return response
      }
    }
    return response
  }
  /** Get Key capabilities
   * @param {string} gppKey the API key to get capabilities for
   * @return {*} Promise-like response, use then, catch and finally to get the response
   */
  static getCapabilities(gppKey, old) {
    var capabilities = {}
    var onSuccess = function () { }
    var onError = function () { }
    var onFinally = function () { }

    // Find min max zoom in the list
    function getMinMaxZoom(z) {
      var zoom = {
        min: parseFloat(z[0].TileMatrix),
        max: parseFloat(z[0].TileMatrix)
      }
      for (var k=1; k<z.length; k++) {
        zoom.min = Math.min(zoom.min, parseFloat(z[k].TileMatrix));
        zoom.max = Math.max(zoom.max, parseFloat(z[k].TileMatrix));
      }
      return zoom;
    }
    // Guess a theme in the list
    function getTheme(id) {
      for (var i=0; i<ol_layer_Geoportail.themes.length; i++) {
        if (ol_layer_Geoportail.themes[i].rex.test(id)) return ol_layer_Geoportail.themes[i].theme;
      }
      return 'autre';
    }

// Next version Geoplateforme with getcapabilities
// TODO remove test
if (!old) {
    // Old default apikey
    if (gppKey === 'gpf') gppKey = undefined;
    var server = gppKey ? 'https://data.geopf.fr/private/wmts' : 'https://data.geopf.fr/wmts';
    var url = server + "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";
    if (gppKey) {
      url += "&apikey="+gppKey;
    }
    ol_ext_Ajax.get({
      url: url,
      dataType: 'TEXT',
      error: function (e) {
        onError(e)
        onFinally({})
      },
      success: function (resp) {
        // Get layerinfo
        var layersInfo = (new DOMParser()).parseFromString(resp, "text/xml")
        layersInfo = layersInfo.getElementsByTagName('Layer')
        // Parse config
        var parser = new ol_format_WMTSCapabilities()
        resp = parser.read(resp)
        var layers = resp.Contents.Layer;
        var capabilities = {};
        var themes = {};
        for (var i=0; i<layers.length; i++) {
          var l = layers[i];
          var zoom = getMinMaxZoom(l.TileMatrixSetLink[0].TileMatrixSetLimits)
          var theme = getTheme(l.Identifier)
          if (!themes[theme]) themes[theme] = {};
          themes[theme][l.Identifier] = capabilities[l.Identifier] = {
            layer: l.Identifier,
            key: gppKey,
            theme: theme,
            desc: l.Abstract,
            server: server,
            bbox: l.WGS84BoundingBox,
            format: l.Format[0],
            minZoom: zoom.min,
            maxZoom: zoom.max,
            originators: { 'Geoservices': { attribution: 'Géoservices', href: 'https://geoservices.ign.fr/' } },
            queryable: layersInfo[i].getElementsByTagName('InfoFormat').length > 0,
            style: (l.Style && l.Style.length ? l.Style[0].Identifier : 'normal'),
            tilematrix: 'PM',
            title: l.Title
          }
        }
        // Return capabilities
        onSuccess(capabilities, themes)
        onFinally(capabilities, themes)
      }
    })
} else {
// Old version
// TODO remove old version
    var geopresolutions = [156543.03390625, 78271.516953125, 39135.7584765625, 19567.87923828125, 9783.939619140625, 4891.9698095703125, 2445.9849047851562, 1222.9924523925781, 611.4962261962891, 305.74811309814453, 152.87405654907226, 76.43702827453613, 38.218514137268066, 19.109257068634033, 9.554628534317017, 4.777314267158508, 2.388657133579254, 1.194328566789627, 0.5971642833948135, 0.29858214169740677, 0.14929107084870338]
    // Transform resolution to zoom
    var getZoom = function(res) {
      res = Number(res) * 0.000281
      for (var r = 0; r < geopresolutions.length; r++)
        if (res > geopresolutions[r])
          return r
    }
    // Merge constraints 
    var mergeConstraints = function(ori) {
      for (var i = ori.constraint.length - 1; i > 0; i--) {
        for (var j = 0; j < i; j++) {
          var bok = true
          for (var k = 0; k < 4; k++) {
            if (ori.constraint[i].bbox[k] != ori.constraint[j].bbox[k]) {
              bok = false
              break
            }
          }
          if (!bok)
            continue
          if (ori.constraint[i].maxZoom == ori.constraint[j].minZoom
            || ori.constraint[j].maxZoom == ori.constraint[i].minZoom
            || ori.constraint[i].maxZoom + 1 == ori.constraint[j].minZoom
            || ori.constraint[j].maxZoom + 1 == ori.constraint[i].minZoom
            || ori.constraint[i].minZoom - 1 == ori.constraint[j].maxZoom
            || ori.constraint[j].minZoom - 1 == ori.constraint[i].maxZoom) {
            ori.constraint[j].maxZoom = Math.max(ori.constraint[i].maxZoom, ori.constraint[j].maxZoom)
            ori.constraint[j].minZoom = Math.min(ori.constraint[i].minZoom, ori.constraint[j].minZoom)
            ori.constraint.splice(i, 1)
            break
          }
        }
      }
    }

    // Get capabilities
    ol_ext_Ajax.get({
      url: 'https://wxs.ign.fr/' + gppKey + '/autoconf/',
      dataType: 'TEXT',
      error: function (e) {
        onError(e)
        onFinally({})
      },
      success: function (resp) {
        var parser = new DOMParser()
        var config = parser.parseFromString(resp, "text/xml")
        var layers = config.getElementsByTagName('Layer')
        for (var i = 0, l; l = layers[i]; i++) {
          // WMTS ?
          if (!/WMTS/.test(l.getElementsByTagName('Server')[0].attributes['service'].value))
            continue
          //        if (!all && !/geoportail\/wmts/.test(l.find("OnlineResource").attr("href"))) continue;
          var service = {
            key: gppKey,
            server: l.getElementsByTagName('gpp:Key')[0].innerHTML.replace(gppKey + "/", ""),
            layer: l.getElementsByTagName('Name')[0].innerHTML,
            title: l.getElementsByTagName('Title')[0].innerHTML,
            format: l.getElementsByTagName('Format')[0] ? l.getElementsByTagName('Format')[0].innerHTML : 'image.jpeg',
            style: l.getElementsByTagName('Style')[0].getElementsByTagName('Name')[0].innerHTML,
            queryable: (l.attributes.queryable.value === '1'),
            tilematrix: 'PM',
            minZoom: getZoom(l.getElementsByTagName('sld:MaxScaleDenominator')[0].innerHTML),
            maxZoom: getZoom(l.getElementsByTagName('sld:MinScaleDenominator')[0].innerHTML),
            bbox: JSON.parse('[' + l.getElementsByTagName('gpp:BoundingBox')[0].innerHTML + ']'),
            desc: l.getElementsByTagName('Abstract')[0].innerHTML.replace(/^<!\[CDATA\[(.*)\]\]>$/, '$1')
          }
          service.originators = {}
          var origin = l.getElementsByTagName('gpp:Originator')
          for (var k = 0, o; o = origin[k]; k++) {
            var ori = service.originators[o.attributes['name'].value] = {
              href: o.getElementsByTagName('gpp:URL')[0].innerHTML,
              attribution: o.getElementsByTagName('gpp:Attribution')[0].innerHTML,
              logo: o.getElementsByTagName('gpp:Logo')[0].innerHTML,
              minZoom: 20,
              maxZoom: 0,
              constraint: []
            }
            // Scale contraints
            var constraint = o.getElementsByTagName('gpp:Constraint')
            for (var j = 0, c; c = constraint[j]; j++) {
              var zmax = getZoom(c.getElementsByTagName('sld:MinScaleDenominator')[0].innerHTML)
              var zmin = getZoom(c.getElementsByTagName('sld:MaxScaleDenominator')[0].innerHTML)
              if (zmin > ori.maxZoom)
                ori.maxZoom = zmin
              if (zmin < ori.minZoom)
                ori.minZoom = zmin
              if (zmax > ori.maxZoom)
                ori.maxZoom = zmax
              if (zmax < ori.minZoom)
                ori.minZoom = zmax

              ori.constraint.push({
                minZoom: zmin,
                maxZoom: zmax,
                bbox: JSON.parse('[' + c.getElementsByTagName('gpp:BoundingBox')[0].innerHTML + ']')
              })
            }
            // Merge constraints
            mergeConstraints(ori)
          }
          capabilities[service.layer] = service
        }
        onSuccess(capabilities, {})
        onFinally(capabilities, {})
      }
    })
}
// TODO END

    // Promise like response
    var response = {
      then: function (callback) {
        if (typeof (callback) === 'function'){
          onSuccess = callback
        }
        return response
      },
      catch: function (callback) {
        if (typeof (callback) === 'function'){
          onError = callback
        }
        return response
      },
      finally: function (callback) {
        if (typeof (callback) === 'function'){
          onFinally = callback
        }
        return response
      },
    }
    return response
  }
}

/** Default capabilities for main layers
 */
ol_layer_Geoportail.capabilities = {
  "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2": {"layer":"GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2","theme":"cartes","desc":"Cartographie multi-échelles sur le territoire national, issue des bases de données vecteur de l’IGN, mis à jour régulièrement et réalisée selon un processus entièrement automatisé.","server":"https://data.geopf.fr/wmts","bbox":[-175,-85,175,85],"format":"image/png","minZoom":0,"maxZoom":19,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":false,"style":"normal","tilematrix":"PM","title":"Plan IGN v2"},
  "CADASTRALPARCELS.PARCELLAIRE_EXPRESS": {"layer":"CADASTRALPARCELS.PARCELLAIRE_EXPRESS","theme":"parcellaire","desc":"Plan cadastral informatisé vecteur de la DGFIP édition Juillet 2023.","server":"https://data.geopf.fr/wmts","bbox":[-63.3725,-21.4756,55.9259,51.3121],"format":"image/png","minZoom":0,"maxZoom":19,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":false,"style":"normal","tilematrix":"PM","title":"PCI vecteur"},
  "ORTHOIMAGERY.ORTHOPHOTOS": {"layer":"ORTHOIMAGERY.ORTHOPHOTOS","theme":"ortho","desc":"Photographies aériennes","server":"https://data.geopf.fr/wmts","bbox":[-180,-89,180,89],"format":"image/jpeg","minZoom":0,"maxZoom":20,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":true,"style":"normal","tilematrix":"PM","title":"Photographies aériennes"},
  // Need API key
  "GEOGRAPHICALGRIDSYSTEMS.MAPS": {"layer":"GEOGRAPHICALGRIDSYSTEMS.MAPS","theme":"cartes","desc":"Cartes IGN","server":"https://data.geopf.fr/private/wmts","bbox":[-180,-68.1389,180,80],"format":"image/jpeg","minZoom":0,"maxZoom":18,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":false,"style":"normal","tilematrix":"PM","title":"Cartes IGN"},
  // Other layers
  "ADMINEXPRESS-COG-CARTO.LATEST": {"layer":"ADMINEXPRESS-COG-CARTO.LATEST","theme":"administratif","desc":"Limites administratives Express COG code officiel géographique 2023","server":"https://data.geopf.fr/wmts","bbox":[-63.3725,-21.4756,55.9259,51.3121],"format":"image/png","minZoom":6,"maxZoom":16,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":true,"style":"normal","tilematrix":"PM","title":"ADMINEXPRESS COG CARTO"},
  "GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN": {"layer":"GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN","theme":"cartes","desc":"Carte des zones ayant une valeur de pente supérieure à 30°-35°-40°-45° d'après la BD ALTI au pas de 5m","server":"https://data.geopf.fr/wmts","bbox":[-63.1614,-21.5446,56.0018,51.0991],"format":"image/png","minZoom":0,"maxZoom":17,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":false,"style":"normal","tilematrix":"PM","title":"Carte des pentes"},
  "ELEVATION.SLOPES": {"layer":"ELEVATION.SLOPES","theme":"altimetrie","desc":"La couche altitude se compose d'un MNT (Modèle Numérique de Terrain) affiché en teintes hypsométriques et issu de la BD ALTI®.","server":"https://data.geopf.fr/wmts","bbox":[-179.5,-75,179.5,75],"format":"image/jpeg","minZoom":6,"maxZoom":14,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":false,"style":"normal","tilematrix":"PM","title":"Altitude"},
  "GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1": { "key":"cartes", "server":"https://wxs.ign.fr/geoportail/wmts","layer":"GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1","title":"Plan IGN j+1","format":"image/png","style":"normal","queryable":false,"tilematrix":"PM","minZoom":0,"maxZoom":18,"bbox":[-179.5,-75,179.5,75],"desc":"Plan IGN j+1","originators":{"IGN":{"href":"http://www.ign.fr","attribution":"Institut national de l'information géographique et forestière","logo":"https://wxs.ign.fr/static/logos/IGN/IGN.gif","minZoom":0,"maxZoom":18,"constraint":[{"minZoom":0,"maxZoom":18,"bbox":[-179,-80,179,80]}]}}},
  // "GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1": { "theme":"cartes", "server":"https://data.geopf.fr/wmts","layer":"GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1","title":"Plan IGN j+1","format":"image/png","style":"normal","queryable":false,"tilematrix":"PM","minZoom":0,"maxZoom":18,"bbox":[-179.5,-75,179.5,75],"desc":"Plan IGN j+1","originators":{"IGN":{"href":"http://www.ign.fr","attribution":"Institut national de l'information géographique et forestière","logo":"https://wxs.ign.fr/static/logos/IGN/IGN.gif","minZoom":0,"maxZoom":18,"constraint":[{"minZoom":0,"maxZoom":18,"bbox":[-179,-80,179,80]}]}}},
  "TRANSPORTNETWORKS.ROADS": {"layer":"TRANSPORTNETWORKS.ROADS","theme":"topographie","desc":"Affichage du réseau routier français et européen.","server":"https://data.geopf.fr/wmts","bbox":[-63.9692,-21.4969,55.9644,71.5841],"format":"image/png","minZoom":6,"maxZoom":18,"originators":{"Geoservices":{"attribution":"Géoservices","href":"https://geoservices.ign.fr/"}},"queryable":false,"style":"normal","tilematrix":"PM","title":"Routes"},
};

/** List of theme with a regexp to filter layers by theme (with getcapabilities)
 * @API
 */
ol_layer_Geoportail.themes = [{
  theme: 'edugeo',
  rex: /EDUGEO|PVA_IGN_zone-marais|VERDUN|DOUAUMONT/
}, {
  theme: 'cartes',
  rex: /GEOGRAPHICALGRIDSYSTEMS|CARTES|SCAN/
}, {
  theme: 'agriculture',
  rex: /AGRICULTURE|PAC/
}, {
  theme: 'altimetrie',
  rex: /ELEVATION|SLOPE/
}, {
  theme: 'parcellaire',
  rex: /PARCELS|Parcellaire/
}, {
  theme: 'administratif',
  rex: /ADMIN/
}, {
  theme: 'ocsge',
  rex: /OCSGE/
}, {
  theme: 'clc',
  rex: /\.CLC|\.CHA/
}, {
  theme: 'environnement',
  rex: /PROTECTEDAREAS|FORETS|DEBROUSSAILLEMENT|LANDCOVER|PROTECTEDSITES|CHASSE/
}, {
  theme: 'topographie',
  rex: /RAILWAYS|BUILDINGS|RUNWAYS|COMMONTRANSPORTELEMENTS|UTILITYANDGOVERNMENTALSERVICES|GEOGRAPHICALNAMES\.NAMES|HYDROGRAPHY|TRANSPORTNETWORKS.ROADS$|hedge.hedge/
}, {
  theme: 'transport',
  rex: /TRANSPORTNETWORKS\.ROADS|TRANSPORTS\.DRONES|SECUROUTE/
}, {
  theme: 'economie',
  rex: /INSEE|AREAMANAGEMENT/
}, {
  theme: 'agriculture',
  rex: /LANDUSE|PRAIRIES/
}, {
  theme: 'satellite',
  rex: /ORTHO-SAT|SPOT5|RAPIDEYE/
}, {
  theme: 'orthohisto',
  rex: /ORTHOPHOTOS\d|ORTHO-EXPRESS-\d/
}, {
  theme: 'ortho',
  rex: /ORTHOIMAGERY/
}];

export default ol_layer_Geoportail
