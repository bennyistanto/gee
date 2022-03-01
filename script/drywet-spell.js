///////////////////////////////////////////////////////////////////////////////////////////////
// Script to calculate statistics information based on number of dry-spells and wet-spells 
//
// The code was compiled from various source (GEE help, GEE Groups, StackExchange)
//
// Benny Istanto, Earth Observation and Climate Analyst
// Vulnerability Analysis and Mapping (VAM) unit, WFP Indonesia | Email: benny.istanto@wfp.org
///////////////////////////////////////////////////////////////////////////////////////////////


// BBox for Indonesia
var rectangle = ee.Geometry.Rectangle(92.126, -13.242, 145.3, 8.405); //Indonesia
var bbox_Indonesia = ee.Feature(rectangle).geometry();
Map.setCenter(120, -2, 5);

// Import CHIRPS Daily
var CHIRPS = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY");

// Define time range
var startyear = 1981;
var endyear = 2019;
var startmonth = 7; // Set for July
var endmonth = 7; // Set for July

// Set EE date format
var startdate = ee.Date.fromYMD(startyear,startmonth,1);
var enddate = ee.Date.fromYMD(endyear,endmonth,31);

// Filter data
var datain_t = CHIRPS.filterDate(startdate, enddate)
  .filter(ee.Filter.calendarRange(startmonth,endmonth, 'month'))
  .select("precipitation").map(function(img){
    return img.addBands(ee.Image.constant(0).uint8().rename('counter'));
  })
  .sort('system:time_start');

// Start reading the data 
var dataset = datain_t
.filterDate(startdate,enddate)
.sort('system:time_start:');
print(dataset,"dataset");

var precipThresh = 1; // mm

function wetSpells(imgWS, listWS){
  // get previous image
  var prevWS = ee.Image(ee.List(listWS).get(-1));
  // find areas gt precipitation threshold (gt==0, lt==1) 
  var wet = imgWS.select('precipitation').gt(precipThresh);
  // add previous day counter to today's counter
  var accumWS = prevWS.select('counter').add(wet).rename('counter');
  // create a result image for iteration
  // precip < thresh will equall the accumulation of counters
  // otherwise it will equal zero
  var outWS = imgWS.select('precipitation').addBands(
        imgWS.select('counter').where(wet.eq(1),accumWS)
      ).uint8();
  return ee.List(listWS).add(outWS);
}

function drySpells(imgDS, listDS){
  // get previous image
  var prevDS = ee.Image(ee.List(listDS).get(-1));
  // find areas gt precipitation threshold (gt==0, lt==1) 
  var dry = imgDS.select('precipitation').lt(precipThresh);
  // add previous day counter to today's counter
  var accumDS = prevDS.select('counter').add(dry).rename('counter');
  // create a result image for iteration
  // precip < thresh will equall the accumulation of counters
  // otherwise it will equal zero
  var outDS = imgDS.select('precipitation').addBands(
        imgDS.select('counter').where(dry.eq(1),accumDS)
      ).uint8();
  return ee.List(listDS).add(outDS);
}

// Create first image for iteration
var first = ee.List([ee.Image(dataset.first())]);


// apply wet spell iteration function
var maxWetSpell = ee.ImageCollection.fromImages(
    dataset.iterate(wetSpells,first)
).max(); // get the max value

var minWetSpell = ee.ImageCollection.fromImages(
    dataset.iterate(wetSpells,first)
).min(); // get the min value

var meanWetSpell = ee.ImageCollection.fromImages(
    dataset.iterate(wetSpells,first)
).mean(); // get the mean value


// apply dry spell iteration function
var maxDrySpell = ee.ImageCollection.fromImages(
    dataset.iterate(drySpells,first)
).max(); // get the max value

var minDrySpell = ee.ImageCollection.fromImages(
    dataset.iterate(drySpells,first)
).min(); // get the min value

var meanDrySpell = ee.ImageCollection.fromImages(
    dataset.iterate(drySpells,first)
).mean(); // get the mean value


// Define an SLD style of discrete intervals to apply to the image.
var wetSpellsSLD =
  '<RasterSymbolizer>' +
    '<ColorMap  type="intervals" extended="false" >' +
      '<ColorMapEntry color="#cccccc" quantity="0" label="No Rain"/>' +
      '<ColorMapEntry color="#ffffcc" quantity="5" label="1-5" />' +
      '<ColorMapEntry color="#c6e8b3" quantity="10" label="6-10" />' +
      '<ColorMapEntry color="#7eccba" quantity="20" label="11-20" />' +
      '<ColorMapEntry color="#41b7c4" quantity="30" label="21-30" />' +
      '<ColorMapEntry color="#2c80b8" quantity="60" label="31-60" />' +
      '<ColorMapEntry color="#253494" quantity="1000" label=">61" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';


// Define an SLD style of discrete intervals to apply to the image.
var drySpellsSLD =
  '<RasterSymbolizer>' +
    '<ColorMap  type="intervals" extended="false" >' +
      '<ColorMapEntry color="#cccccc" quantity="0" label="No Drought"/>' +
      '<ColorMapEntry color="#ffe5d9" quantity="5" label="1-5" />' +
      '<ColorMapEntry color="#fcbba2" quantity="10" label="6-10" />' +
      '<ColorMapEntry color="#fc9172" quantity="20" label="11-20" />' +
      '<ColorMapEntry color="#fa6949" quantity="30" label="21-30" />' +
      '<ColorMapEntry color="#de2c26" quantity="60" label="31-60" />' +
      '<ColorMapEntry color="#a60e13" quantity="1000" label=">61" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';  

// Display results
Map.addLayer(meanWetSpell.select('counter').sldStyle(wetSpellsSLD).clip(bbox_Indonesia), {},'Avg Wet Spells', false);
Map.addLayer(minWetSpell.select('counter').sldStyle(wetSpellsSLD).clip(bbox_Indonesia), {},'Min Wet Spells', false);
Map.addLayer(maxWetSpell.select('counter').sldStyle(wetSpellsSLD).clip(bbox_Indonesia), {},'Max Wet Spells', true);
Map.addLayer(meanDrySpell.select('counter').sldStyle(drySpellsSLD).clip(bbox_Indonesia), {},'Avg Dry Spells', false);
Map.addLayer(minDrySpell.select('counter').sldStyle(drySpellsSLD).clip(bbox_Indonesia), {},'Min Dry Spells', false);
Map.addLayer(maxDrySpell.select('counter').sldStyle(drySpellsSLD).clip(bbox_Indonesia), {},'Max Dry Spells', true);


// Export the result to Google Drive
Export.image.toDrive({
  image:maxDrySpell,
  description:'MaxDrySpell_07_July',
  folder:'GEE',
  scale:maxDrySpell.projection().nominalScale(),
  region: bbox_Indonesia,
  maxPixels:1e12
});


// Legend
// Set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
//  value: 'Dry-spells',
  value: 'Wet-spells',
  style: {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
// Palette with the colors
// var palette =['cccccc','ffe5d9','fcbba2','fc9172','fa6949','de2c26','a60e13']; // Dry
var palette =['cccccc','ffffcc','c6e8b3','7eccba','41b7c4','2c80b8','253494']; // Wet


// Name of the legend
// var names = ['No Drought','1 - 5 days','6 - 10 days','11 - 20 days','21 - 30 days','31 - 60 days','> 60 days'];
var names = ['No Rain','1 - 5 days','6 - 10 days','11 - 20 days','21 - 30 days','31 - 60 days','> 60 days'];

// Add color and and names
for (var i = 0; i < 7; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 
// Add legend to map 
Map.add(legend);

// End of script
