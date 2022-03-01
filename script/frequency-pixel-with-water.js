/////////////////////////////////////////////////////////////////////////////////////////
// Calculate historical flood occurrence, based on script from Dr. Ate Poortinga
// https://code.earthengine.google.com/083a6f9a981d2737d8eac16cbe8505b0
// 
// Flood water was calculated by subtracting the extracted water from the permanent water
// 
// The result from this analysis will be added as a probability information
// to enhance WFP's VAMPIRE flood alert system (Extreme rainfall-triggering flood)
//
// Benny Istanto, Earth Observation and Climate Analyst
// Vulnerability Analysis and Mapping (VAM) unit, WFP Indonesia
// benny.istanto@wfp.org
/////////////////////////////////////////////////////////////////////////////////////////



// Define geographic domain.
var point = ee.Geometry.Point(112.4391, -7.0401);
var rectangle = ee.Geometry.Rectangle(57.0,-13.0,175,57.0);
var bbox = ee.Feature(rectangle).geometry();
Map.centerObject(point, 11);

// BBox for COs
var rectangle_LKA = ee.Geometry.Rectangle(79.204, 5.681, 82.1594, 10.114);
var bbox_LKA = ee.Feature(rectangle_LKA).geometry();




// --------------------------
// Import JRC Global Surface Water and extract permanent water from Seasonality layer
var jrcA = ee.Image('JRC/GSW1_2/GlobalSurfaceWater');
var seasonality = jrcA.select('seasonality').clip(bbox);

// Import JRC Monthly Water.
var jrcB = ee.ImageCollection("JRC/GSW1_2/MonthlyHistory");



// Define study period - adjust this date period to get monthly/yearly flood occurrence
// Select method for period of time. Choose continous or discrete
var startYear = 1984;
var endYear = 2018;
var startMonth = 1;
var endMonth = 1;

var startDate = ee.Date.fromYMD(startYear, startMonth,1); 
var endDate = ee.Date.fromYMD(endYear, endMonth,31); 

var months = endDate.difference(startDate, 'month').divide(12).toInt().add(1);
print('Number of month selected : ', months);

// Continuous method
//var myjrc = jrcB.filterBounds(bbox).filterDate(startDate, endDate);

// Discrete method
var myjrc = jrcB.filterBounds(bbox);
var myjrc = jrcB.filter(ee.Filter.calendarRange(startYear, endYear, 'year')).filter(ee.Filter.calendarRange(startMonth, endMonth, 'month'));



// Detect observations
var myjrc = myjrc.map(function(img){
  // observation is img > 0
  var obs = img.gt(0);
  return img.addBands(obs.rename('obs').set('system:time_start', img.get('system:time_start')));
});

// Detect all observations with water
var myjrc = myjrc.map(function(img){
  // if water
  var water = img.select('water').eq(2);
  return img.addBands(water.rename('onlywater').set('system:time_start', img.get('system:time_start')));
});



// Calculate the total amount of observations
var totalObs = ee.Image(ee.ImageCollection(myjrc.select("obs")).sum().toFloat());
// Calculate all observations with water
var totalWater = ee.Image(ee.ImageCollection(myjrc.select("onlywater")).sum().toFloat());
// Calculate the percentage of observations with water
var floodfreq0 = totalWater.divide(totalObs).multiply(100);

// Mask areas that are not water (land)
var landMask = floodfreq0.eq(0).not();
var floodfreq1 = floodfreq0.updateMask(landMask); //Historical water occurrence (permanent water + flood)
// --------------------------



// --------------------------
// Extract permanent water, threshold >= 82% occurrence
// 82% came from https://www.frontiersin.org/articles/10.3389/fenvs.2019.00191/full
var gte82Mask = floodfreq1.gte(82);
var pw82 = floodfreq1.updateMask(gte82Mask);

// Subtract water (flood) occurrence with permanent water, threshold >= 82% occurrence
var gt82Mask = floodfreq1.gte(82).not();
var floodfreq2 = floodfreq1.updateMask(gt82Mask);

// Extract permanent water, threshold >= 10month/year occurrence
var gte10Mask0 = seasonality.gte(10);
var pw10 = seasonality.updateMask(gte10Mask0);

// Subtract water (flood) occurrence with permanent water, threshold >= 10month/year occurrence
var gte10Mask1 = seasonality.gte(10).mask(1);
gte10Mask1 = gte10Mask1.eq(1).not();
var floodfreq3 = floodfreq1.updateMask(gte10Mask1);
// --------------------------



// Visualization and add map to canvas
// Seasonal Water - Orange to Red is persistent water for at least 10 month/year
var seasonalityVis = {min: 0.0, max: 12.0, palette: ['f7fbff','deebf7','c6dbef','9ecae1','6baed6','4292c6','2171b5','08519c','08306b','fd8d3c','f03b20','bd0026']};
// Flood Occurrence
var floodViz = {min:0, max:100, palette:['c10000','d742f4','001556','b7d2f7']};
// Permanent Water >=82%
var pw82Viz = {palette:"ff9e00"};
// Permanent Water >=10month
var pw10Viz = {palette:"38f500"};

// Add map to canvas
Map.addLayer(floodfreq3.clip(bbox), floodViz,"FloodFreq without PW >=10month", true);
Map.addLayer(floodfreq2.clip(bbox), floodViz,"FloodFreq without PW >=82%", false);
Map.addLayer(floodfreq1.clip(bbox), floodViz,"FloodFreq", false);
Map.addLayer(pw10.clip(bbox), pw10Viz,"Permanent Water >=10 month/year", false);
Map.addLayer(pw82.clip(bbox), pw82Viz,"Permanent Water >=82% occurrence", false);
Map.addLayer(seasonality.clip(bbox), seasonalityVis, "Seasonal Water", false); 



// Export the result to Google Drive
Export.image.toDrive({
  image:floodfreq3,
  description:'FF_LKA',
  folder:'GEE',
  scale:30,
  region: bbox_LKA,
  maxPixels:1e12
});



// Legend
// Set position of panel
var legend = ui.Panel({
  style: {
  position: 'bottom-right',
  padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'Probability of Flood Ocurrence (%)',
  style: {
  fontWeight: 'bold',
  fontSize: '18px',
  margin: '0 0 4px 0',
  padding: '0'
  }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Create the legend image
var lon = ee.Image.pixelLonLat().select('latitude');
var gradient = lon.multiply((floodViz.max-floodViz.min)/100.0).add(floodViz.min);
var legendImage = gradient.visualize(floodViz);
 
// Create text on top of legend
var panel = ui.Panel({
  widgets: [
    ui.Label(floodViz['max'])
    ],
  });
 
legend.add(panel);
 
// Create thumbnail from the image
var thumbnail = ui.Thumbnail({
  image: legendImage,
  params: {bbox:'0,0,10,100', dimensions:'10x200'},
  style: {padding: '1px', position: 'bottom-center'}
  });
 
// Add the thumbnail to the legend
legend.add(thumbnail);
 
// Area text on top of legend
var panel = ui.Panel({
  widgets: [
    ui.Label(floodViz['min'])
    ],
  });
 
legend.add(panel);
Map.add(legend);

// End of script 
