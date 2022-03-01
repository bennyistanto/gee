///////////////////////////////////////////////////////////////////////////////////////////////////
// Download GFS rainfall forecast hour-by-hour from NOAA GFS
//
// Benny Istanto | Earth Observation and Climate Analyst | benny.istanto@wfp.org
// Vulnerability Analysis and Mapping (VAM) unit, UN World Food Programme - Indonesia
///////////////////////////////////////////////////////////////////////////////////////////////////


// INITIALISATION AND SYMBOLOGY
// Center of the map
Map.setCenter(117.7, -2.5, 5);

// Standard Symbology
var visRainForecast = {min: 1, max: 100, palette: [
    'cccccc','f9f3d5','dce2a8','a8c58d','77a87d','ace8f8',
    '4cafd9','1d5ede','001bc0','9131f1','e983f3','f6c7ec'
  ]};


// Set the date and time of data
// GFS forecast is initialized 4 times a day (at 00, 06, 12, 18 hours GMT) so you get 4 forecasts per day 
var date = '2021-04-04' // Set your date with format 'YYYY-MM-DD', example '2021-04-04'
var time = 18 // You can fill the time with 00,06,12 or 18
var dt = ee.Date(date + 'T' + time.toString() + ':00:00');
print(dt)



// Access GFS data hour-by-hour
// HOUR 1
var img1 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    // Value 1 represent hour 1 from the start of time, you can change this value to 2,3,12,24,or 120
    .filter(ee.Filter.inList('forecast_hours', [1])) 
    .sum();

Map.addLayer(img1,visRainForecast,'GFS hour1', false);

// HOUR 2
var img2 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [2]))
    .sum();

Map.addLayer(img2,visRainForecast,'GFS hour2', false);

// HOUR 3
var img3 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [3]))
    .sum();

Map.addLayer(img3,visRainForecast,'GFS hour3', false);

// HOUR 4
var img4 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [4]))
    .sum();

Map.addLayer(img4,visRainForecast,'GFS hour4', false);

// HOUR 5
var img5 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [5]))
    .sum();

Map.addLayer(img5,visRainForecast,'GFS hour5', false);

// HOUR 6
var img6 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [6]))
    .sum();

Map.addLayer(img6,visRainForecast,'GFS hour6', false);

// HOUR 7
var img7 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [7]))
    .sum();

Map.addLayer(img7,visRainForecast,'GFS hour7', false);

// HOUR 8
var img8 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [8]))
    .sum();

Map.addLayer(img8,visRainForecast,'GFS hour8', false);

// HOUR 9
var img9 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [9]))
    .sum();

Map.addLayer(img9,visRainForecast,'GFS hour9', false);

// HOUR 10
var img10 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [10]))
    .sum();

Map.addLayer(img10,visRainForecast,'GFS hour10', false);

// HOUR 11
var img11 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [11]))
    .sum();

Map.addLayer(img11,visRainForecast,'GFS hour11', false);

// HOUR 12
var img12 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [12]))
    .sum();

Map.addLayer(img12,visRainForecast,'GFS hour12', false);

// HOUR 13
var img13 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [13]))
    .sum();

Map.addLayer(img13,visRainForecast,'GFS hour13', false);

// HOUR 14
var img14 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [14]))
    .sum();

Map.addLayer(img14,visRainForecast,'GFS hour14', false);

// HOUR 15
var img15 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [15]))
    .sum();

Map.addLayer(img15,visRainForecast,'GFS hour15', false);

// HOUR 16
var img16 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [16]))
    .sum();

Map.addLayer(img16,visRainForecast,'GFS hour16', false);

// HOUR 17
var img17 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [17]))
    .sum();

Map.addLayer(img17,visRainForecast,'GFS hour17', false);

// HOUR 18
var img18 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [18]))
    .sum();

Map.addLayer(img18,visRainForecast,'GFS hour18', false);

// HOUR 19
var img19 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [19]))
    .sum();

Map.addLayer(img19,visRainForecast,'GFS hour19', false);

// HOUR 20
var img20 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [20]))
    .sum();

Map.addLayer(img20,visRainForecast,'GFS hour20', false);

// HOUR 21
var img21 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [21]))
    .sum();

Map.addLayer(img21,visRainForecast,'GFS hour21', false);

// HOUR 22
var img22 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [22]))
    .sum();

Map.addLayer(img22,visRainForecast,'GFS hour22', false);

// HOUR 23
var img23 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [23]))
    .sum();

Map.addLayer(img23,visRainForecast,'GFS hour23', false);

// HOUR 24
var img24 = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [24]))
    .sum();

Map.addLayer(img24,visRainForecast,'GFS hour24', false);



/////////////////////////////
// Access GFS data for 1-day
var img24hv1_draft = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [6,12,18,24]))
    .sum();

// Masked rainfall less than 0.01
var img24hv1 = img24hv1_draft.updateMask(img24hv1_draft.gt(0.01));
Map.addLayer(img24hv1,visRainForecast,'GFS 1-day v1', true);


// Access GFS data for 2-day
var img48hv1_draft = ee.ImageCollection('NOAA/GFS0P25')
    .select('total_precipitation_surface')
    .filterDate(dt, dt.advance(6,'hour'))
    .filter(ee.Filter.inList('forecast_hours', [6,12,18,24,30,36,42,48]))
    .sum();

// Masked rainfall less than 0.01
var img48hv1 = img48hv1_draft.updateMask(img48hv1_draft.gt(0.01));
Map.addLayer(img48hv1,visRainForecast,'GFS 2-days v1', true);


//Mosaic into single image for 6,12,18,24
var imghh_bands = img6
  .addBands(img12)
  .addBands(img18)
  .addBands(img24);

var img24hv2_draft = imghh_bands.expression(
    'R1+R2+R3+R4', {
      'R1': imghh_bands.select('total_precipitation_surface'),
      'R2': imghh_bands.select('total_precipitation_surface_1'),
      'R3': imghh_bands.select('total_precipitation_surface_2'),
      'R4': imghh_bands.select('total_precipitation_surface_3')
    }
).float();

// Masked rainfall less than 0.01
var img24hv2 = img24hv2_draft.updateMask(img24hv2_draft.gt(0.01));    
Map.addLayer(img24hv2,visRainForecast,'GFS 1-day v2', true);





////////////////////////////////
// Panel for legend
// Set position of panel
var legend = ui.Panel({
  style: {
  position: 'bottom-right',
  padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'GFS Rainfall Forecast',
  style: {
  fontWeight: 'bold',
  fontSize: '18px',
  margin: '0 0 4px 0',
  padding: '0'
  }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
////////////////////////////////
// Legend using standard symbology
// Create the legend image
var lon = ee.Image.pixelLonLat().select('latitude');
var gradient = lon.multiply((visRainForecast.max-visRainForecast.min)/100.0).add(visRainForecast.min);
var legendImage = gradient.visualize(visRainForecast);
 
// Create text on top of legend
var panel = ui.Panel({
  widgets: [
    ui.Label(visRainForecast['max'])
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
 
// Create text on bottom of legend
var panel = ui.Panel({
  widgets: [
    ui.Label(visRainForecast['min'])
    ],
  });
 
legend.add(panel);

Map.add(legend);


////////////////////////////////
// 
// Subset for downloading data
var rectangle_RBB = ee.Geometry.Rectangle(60, -80, 180, 80);
var bbox_RBB = ee.Feature(rectangle_RBB).geometry();


// Export the result to Google Drive
Export.image.toDrive({
  image:img24hv1,
  description:'1-day_gfs_rainfall_forecast',
  folder:'GEE_GFS',
  scale:5600,
  region:bbox_RBB,
  maxPixels:1e12
});

// End of script
