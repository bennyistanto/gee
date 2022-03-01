///////////////////////////////////////////////////////////////////////////////////////////////////
// Monthly weather monitoring using data from ECMWF ERA5 and NASA GLDAS
// - https://developers.google.com/earth-engine/datasets/catalog/NASA_FLDAS_NOAH01_C_GL_M_V001
// - https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_MONTHLY
//
// FLDAS (precipitation, air temperature, relative humidity), 
// ERA5 (precipitation, air temperature, wind speed and direction)
//
// The code was compiled from various source (GEE help, GEE Groups, StackExchange)
//
// Benny Istanto, Earth Observation and Climate Analyst
// Vulnerability Analysis and Mapping (VAM) unit, WFP Indonesia
// benny.istanto@wfp.org
///////////////////////////////////////////////////////////////////////////////////////////////////


// Define geographic domain.
//---
var rectangle = ee.Geometry.Rectangle(92, -12, 145, 9); // Indonesia
var bbox = ee.Feature(rectangle).geometry(); 
Map.setCentre(118, -3, 6);


// Import latest data from GLDAS and ERA5
//---
var FLDAS = ee.ImageCollection("NASA/FLDAS/NOAH01/C/GL/M/V001").first(); 
var ERA5 = ee.ImageCollection("ECMWF/ERA5/MONTHLY").first();


// Total rainfall in milimeters (choose between FDLAS or EAR5)
//---
// FLDAS
var Precip = FLDAS.expression(
  'P * 86400 * 30', { // Need to find better script to define number of days on presented month, could be 28,29,30 or 31
    P: FLDAS.select('Rainf_f_tavg')
    }
  ).float();

// //ERA5
// var Precip = ERA5.expression(
//   'P * 1000', {
//     P: ERA5.select('total_precipitation')
//   }
// ).float();


// Air Temperature in Celcius (choose between FDLAS or ERA5)
//---
// FLDAS
var Tave = FLDAS.expression(
  'T - T0', {
    T: FLDAS.select('Tair_f_tavg'),
    T0: 273.15
  }
).float()

// //ERA5
// var Tave = ERA5.expression(
//   'T - T0', {
//     T: ERA5.select('mean_2m_air_temperature'),
//     T0: 273.15
//   }
// ).float();


// Relative Humidity
//---
// https://earthscience.stackexchange.com/questions/2360/how-do-i-convert-specific-humidity-to-relative-humidity/2361#2361
var RH = FLDAS.expression(
  '0.263 * p * q * (exp(17.67 * (T - T0) / (T - 29.65))) ** -1', {
    T: FLDAS.select('Tair_f_tavg'),
    T0: 273.15,
    p: FLDAS.select('Psurf_f_tavg'),
    q: FLDAS.select('Qair_f_tavg')
  }
).float();


// Wind speed and direction
//---
// Based on code from Gennadii Donchyts
// https://code.earthengine.google.com/320ee5bc81f2de3ae49f348f8ec9a6d7
var uv0 = ERA5.select(['u_component_of_wind_10m', 'v_component_of_wind_10m']);
var uv10 = uv0.clip(bbox);

var scale = Map.getScale() * 10; //25000
var numPixels = 1e10;

var samples = uv10.rename(['u10', 'v10']).sample({
  region: bbox, 
  scale: scale, 
  numPixels: numPixels, 
  geometries: true
});

var scaleVector = 0.1;

var vectors = samples.map(function(f) {
  var u = ee.Number(f.get('u10')).multiply(scaleVector);
  var v = ee.Number(f.get('v10')).multiply(scaleVector);
  
  var origin = f.geometry();

  // translate
  var proj = origin.projection().translate(u, v);
  var end = ee.Geometry.Point(origin.transform(proj).coordinates());

  // construct line
  var geom = ee.Algorithms.GeometryConstructors.LineString([origin, end], null, true);
  
  return f.setGeometry(geom);
});

var uv10final = uv10.pow(2).reduce(ee.Reducer.sum()).sqrt();



//Color-codes based on Color-Brewer https://colorbrewer2.org/
//---
// Visualization palette for total precipitation
var PrecipVis = {
  min: 0, 
  max: 400, 
  palette: ['#FFFFFF', '#00FFFF', '#0080FF', '#DA00FF', '#FFA400','#FF0000']
};

// Visualization palette for temperature
var TaveVis = {
  min:-20, 
  max:40, 
  palette: ['#000080','#0000D9','#4000FF','#8000FF','#0080FF','#00FFFF','#00FF80','#80FF00','#DAFF00',
          '#FFFF00','#FFF500','#FFDA00','#FFB000','#FFA400','#FF4F00','#FF2500','#FF0A00','#FF00FF']
};

// Relative Humidity visualisation
var rhVis = {
  min: 70,
  max: 100,
  palette: ['a50026', 'd73027', 'f46d43', 'fdae61', 'fee090', 'e0f3f8', 'abd9e9', '74add1', '4575b4', '313695'],
};

// Wind speed visualisation
var windVis = {
  min: 0,
  max: 10,
  palette: ['3288bd', '66c2a5', 'abdda4', 'e6f598', 'fee08b', 'fdae61', 'f46d43', 'd53e4f'],
};



// Add map to layer
Map.addLayer(uv10final.clip(bbox), windVis, 'Wind Speed (m/s)', false);
Map.addLayer(vectors.style({ color: 'white', width: 1 }), {}, 'Wind vectors', false);
Map.addLayer(RH.clip(bbox), rhVis, 'Relative Humidity (%)', false);
Map.addLayer(Tave.clip(bbox), TaveVis, 'Average Temperature (°C)', false);
Map.addLayer(Precip.clip(bbox), PrecipVis, 'Precipitation (mm)', true);


// Export the result to Google Drive
Export.image.toDrive({
  image:Precip, // Change this variable
  description:'Precip', // Adjust the name
  folder:'GEE', // Adjust the folder inside tyour Google Drive
  scale:30,
  region: bbox,
  maxPixels:1e12
});

// End of script
