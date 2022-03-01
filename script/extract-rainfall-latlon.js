////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Script to extract rainfall from IMERG (30min) or GSMaP (hourly), based on coordinate and convert it into CSV file. 
//
// Application: Extract 30-minute rainfall in the last 10-days before landslide occurs in certain point. The data
// will use to develop a model or rainfall threshold  for extreme rainfall that could trigger a landslide.
//
// Benny Istanto, Earth Observation and Climate Analyst
// Vulnerability Analysis and Mapping (VAM) unit, WFP Indonesia | Email: benny.istanto@wfp.org
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Define a point of interest as a landslide location.
var POI = ee.Geometry.Point(107.474886, -7.113524); // Adjust the coordinate - Tenjolaya - Bandung, 23 Feb 2010
Map.centerObject(POI, 9);

// Date when landslide occurs
var lsevent = new Date('2010-02-23'); // Adjust date period with landslide event
var start = new Date(lsevent.getTime() - 10*24*60*60*1000); // 10-days before
var end = new Date(lsevent.getTime() + 1*24*60*60*1000); // 1-day after
print(start);
print(end);


// Choose precip data you want to use: IMERG or GSMaP
//***************************************************

// Import NASA GPM IMERG 30 minute data and calculate accumulation for 10days.
var imerg = ee.ImageCollection('NASA/GPM_L3/IMERG_V06');
var precipHH = imerg.filterBounds(POI).filterDate(start, end).select('precipitationCal');
var precip = precipHH.select('precipitationCal').sum();

// // Import JAXA GSMaP hourly data and calculate accumulation for 10days.
// var gsmap = ee.ImageCollection("JAXA/GPM_L3/GSMaP/v6/operational");
// var precipHH = gsmap.filterBounds(POI).filterDate(start, end).select('hourlyPrecipRate');
// var precip = precipHH.select('hourlyPrecipRate').sum();


// Change the layer in line 49 and 69
//***************************************************

// Create a function that takes an image, calculates the mean over a geometry and returns the value and the corresponding date as a feature.
// Timeseries data
var timeSeries = precipHH.map(function (image) {
  var precipdate1 = image.date().format('yyyy-MM-dd hh:mm');
  var value = image
    .clip(POI)
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      scale: 30
    }).get('precipitationCal'); //Change based on data, IMERG: 'precipitationCal' GSMaP: 'hourlyPrecipRate'
  return ee.Feature(null, {value: value, date: precipdate1});
});

// Accumulation data
// Based on input from Daniel Wiell via GIS StackExchange
// https://gis.stackexchange.com/questions/360611/extract-time-series-rainfall-from-multiple-point-with-date-information/
var days = ee.Date(end).difference(ee.Date(start), 'days');
var dayOffsets = ee.List.sequence(1, days);
var accumulation = dayOffsets.map(
  function (dayOffset) {
    var endDate = ee.Date(start).advance(ee.Number(dayOffset), 'days');
    var image = precipHH.filterDate(start, endDate).sum();
    var date = endDate.advance(-1, 'days').format('yyyy-MM-dd');
    var value = image
      .clip(POI)
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: POI,
        scale: 30
      }).get('precipitationCal'); //Change based on data, IMERG: 'precipitationCal' GSMaP: 'hourlyPrecipRate'
    return ee.Feature(null, {value: value, date: date});
  });


// Create a graph of the time-series.
var graphTS = ui.Chart.feature.byFeature(timeSeries,'date', ['value']);
print(graphTS.setChartType("LineChart")
           .setOptions({title: 'Rainfall time-series',
                        vAxis: {title: 'Rainfall estimates (mm)'},
                        hAxis: {title: 'Date'}}));

// Create a graph of the accumulation.
var graphAcc = ui.Chart.feature.byFeature(accumulation,'date', ['value']);
print(graphAcc.setChartType("LineChart")
           .setOptions({title: 'Rainfall accumulation',
                        vAxis: {title: 'Rainfall estimates (mm)'},
                        hAxis: {title: 'Date'}}));


// Rainfall vis parameter
var palette = [
  '000096','0064ff', '00b4ff', '33db80', '9beb4a',
  'ffeb00', 'ffb300', 'ff6400', 'eb1e00', 'af0000'
];
var precipVis = {min: 0.0, max: 1000.0, palette: palette, opacity:0.5};


// Add layer into canvas
Map.addLayer(precip, precipVis, "10-days rainfall", false);
Map.addLayer(POI, {color: "#ff0000"}, "Landlside location", true);


// Export the result to Google Drive as a CSV.
Export.table.toDrive({
  collection: timeSeries,
  description:'LS_69421',
  folder:'GEE',
  selectors: 'date, value', 
  fileFormat: 'CSV'
});


// End of script
