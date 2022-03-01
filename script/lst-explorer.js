/*
 * MODIS LST Explorer
 *
 * Set of script to:
 * - Visualise daily MODIS Land Surface Temperature (LST),
 *   Terra, Aqua and combined
 * - See visual differences between applying QC Bitmask and original data
 * 
 * Contact: Benny Istanto. Climate Geographer - GOST/DECAT/DECDG, The World Bank
 * If you found a mistake, send me an email to bistanto@worldbank.org
 * 
 * Changelog:
 * 2022-02-15 first draft, focus on Terra
 * 2022-02-16 Aqua is here
 * 2022-02-17 Combined Terra and Aqua looks great
 *
 * ------------------------------------------------------------------------------
 */


/* 
 * VISUALIZATIO AND STYLING
 */
 
// Center of the map
Map.setCenter(120, 0, 3);

// Create the application title bar.
Map.add(ui.Label(
    'MODIS LST Explorer', {fontWeight: 'bold', fontSize: '24px'}));
    
// Symbology
var LSTvis = {
  min: 0,
  max: 40,
  palette: [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003'
  ],
};
// Boundaries
var BNDvis = {fillColor: "#00000000", color: '646464', width: 0.5,};

// These are USDOS LSIB boundaries simplified for boundary visualization.
var bnd = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017");




/*
 * FUNCTIONs
 */
 
// Adopted from Gennadii Donchyts's code at GEE Developers Group
// https://groups.google.com/g/google-earth-engine-developers/c/ebrSLPCjZ8c/m/TiL2gtSnDgAJ
// Function to convert to Celcius for Day and Night Temperature
function toCelciusDay(image){
  var lst = image.select('LST_Day_1km').multiply(0.02).subtract(273.15);
  var overwrite = true;
  var result = image.addBands(lst, ['LST_Day_1km'], overwrite);
  return result; 
}

function toCelciusNight(image){
  var lst = image.select('LST_Night_1km').multiply(0.02).subtract(273.15);
  var overwrite = true;
  var result = image.addBands(lst, ['LST_Night_1km'], overwrite);
  return result; 
}

// QC Bitmask
//---
/*
 * Bits 0-1: Mandatory QA flags
 * 0: LST produced, good quality, not necessary to examine more detailed QA
 * 1: LST produced, other quality, recommend examination of more detailed QA
 * 2: LST not produced due to cloud effects
 * 3: LST not produced primarily due to reasons other than cloud
 * Bits 2-3: Data quality flag
 * 0: Good data quality
 * 1: Other quality data
 * 2: TBD
 * 3: TBD
 * Bits 4-5: Emissivity error flag
 * 0: Average emissivity error ≤ 0.01
 * 1: Average emissivity error ≤ 0.02
 * 2: Average emissivity error ≤ 0.04
 * 3: Average emissivity error > 0.04
 * Bits 6-7: LST error flag
 * 0: Average LST error ≤ 1K
 * 1: Average LST error ≤ 2K
 * 2: Average LST error ≤ 3K
 * 3: Average LST error > 3K
*/

// How to get good quality image
// Using bitwiseExtract function from Daniel Wiell
// Reference: https://gis.stackexchange.com/a/349401
// Example: A mask with "Good data quality" would be bitwiseExtract(image, 2, 3).eq(0)

/*
 * Utility to extract bitmask values. 
 * Look up the bit-ranges in the catalog. 
 * 
 * value - ee.Number of ee.Image to extract from.
 * fromBit - int or ee.Number with the first bit.
 * toBit - int or ee.Number with the last bit (inclusive). 
 *         Defaults to fromBit.
 */
function bitwiseExtract(value, fromBit, toBit) {
  if (toBit === undefined)
    toBit = fromBit;
  var maskSize = ee.Number(1).add(toBit).subtract(fromBit);
  var mask = ee.Number(1).leftShift(maskSize).subtract(1);
  return value.rightShift(fromBit).bitwiseAnd(mask);
}

// Applying the QC to Day LST
var QC_Day_mask = function(image2) {
  var qaD = image2.select('QC_Day');
  var mandatoryFlagsD = bitwiseExtract(qaD, 0, 1); 
  var qualityFlagsD = bitwiseExtract(qaD, 2, 3);
  var maskD = mandatoryFlagsD.eq(0) // Mandatory QA flags
    .and(qualityFlagsD.eq(0)); // Data quality flag
  return image2.updateMask(maskD);
};
// Applying the QC to Night LST
var QC_Night_mask = function(image3) {
  var qaN = image3.select('QC_Night');
  var mandatoryFlagsN = bitwiseExtract(qaN, 0, 1); 
  var qualityFlagsN = bitwiseExtract(qaN, 2, 3);
  var maskN = mandatoryFlagsN.eq(0) // Mandatory QA flags
    .and(qualityFlagsN.eq(0)); // Data quality flag
  return image3.updateMask(maskN);
};




/*
 * DATE AND DATA
 */
 
// Strip time off current date/time
// As MODIS data is not real time available at GEE, sometimes has a lag up to 10 days
// So for first data to be loaded into map will be 10 days before
var firstload = ee.Date(new Date().toISOString().split('T')[0]).advance(-10, 'day');
print(firstload);


// Daily MODIS LST Dataset Availability:
// Terra - https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MOD11A1
// Aqua - https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MYD11A1

// Import MODIS
var MOD11 = ee.ImageCollection('MODIS/006/MOD11A1'); // Terra
var MYD11 = ee.ImageCollection('MODIS/006/MYD11A1'); // Aqua
// I will use MXD as code for combined Terra and Aqua

// First date available to access via slider
var start_period = ee.Date('2002-07-04'); // First MOD/MYD 11A1 data 24 Feb 2000, 4 Jul 2002




/*
 * INITIAL PROCESS WHEN MAP LOADED
 */

// Bring in MODIS data. Select LST and pre-processed Quality Control Band
// MOD LST Day
var mod11a1_day = MOD11.select(['LST_Day_1km','QC_Day']).map(toCelciusDay).filterDate(firstload, firstload.advance(1, 'day'));
// MOD LST Night
var mod11a1_night = MOD11.select(['LST_Night_1km','QC_Night']).map(toCelciusNight).filterDate(firstload, firstload.advance(1, 'day'));
// MYD LST Day
var myd11a1_day = MYD11.select(['LST_Day_1km','QC_Day']).map(toCelciusDay).filterDate(firstload, firstload.advance(1, 'day'));
// MYD LST Night
var myd11a1_night = MYD11.select(['LST_Night_1km','QC_Night']).map(toCelciusNight).filterDate(firstload, firstload.advance(1, 'day'));


// Removed bad pixel
// Mask the less than Good images from the collection of images
// MOD LST Day only with good pixel
var mod11a1_day_QC = mod11a1_day.map(QC_Day_mask);
// MOD LST Night only with good pixel
var mod11a1_night_QC = mod11a1_night.map(QC_Night_mask);
// MYD LST Day only with good pixel
var myd11a1_day_QC = myd11a1_day.map(QC_Day_mask);
// MYD LST Night only with good pixel
var myd11a1_night_QC = myd11a1_night.map(QC_Night_mask);


// Combined day and night
// Merge two image collection
var mod11a1_combine = mod11a1_day.combine(mod11a1_night);
// Merge two image collection (cleaned day and night)
var mod11a1_cleaned_combine = mod11a1_day_QC.combine(mod11a1_night_QC);
// Merge two image collection
var myd11a1_combine = myd11a1_day.combine(myd11a1_night);
// Merge two image collection (cleaned day and night)
var myd11a1_cleaned_combine = myd11a1_day_QC.combine(myd11a1_night_QC);


// Combined Terra and Aqua
// LST Day
var mxd11a1_day_combine = mod11a1_day.combine(myd11a1_day);
// LST Night
var mxd11a1_night_combine = mod11a1_night.combine(myd11a1_night);
// LST Day cleaned
var mxd11a1_day_cleaned_combine = mod11a1_day_QC.combine(myd11a1_day_QC);
// LST Night cleaned
var mxd11a1_night_cleaned_combine = mod11a1_night_QC.combine(myd11a1_night_QC);


// Inspired from ArcGIS Cell Statistics handling the NO DATA
// only cells that have a value in the input value raster will be used
// in determining the output value for that cell. 
// NoData cells in the value raster will be ignored in the statistic calculation.
// Thanks to Ridwan Mulyadi for the expression

// MOD LST Mean
var mod11a1_mean = mod11a1_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_1km').unmask(-1000),
      'B': image.select('LST_Night_1km').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// MOD LST Mean only with good pixel
var mod11a1_mean_QC = mod11a1_cleaned_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_1km').unmask(-1000),
      'B': image.select('LST_Night_1km').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// MYD LST Mean
var myd11a1_mean = myd11a1_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_1km').unmask(-1000),
      'B': image.select('LST_Night_1km').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// MYD LST Mean only with good pixel
var myd11a1_mean_QC = myd11a1_cleaned_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_1km').unmask(-1000),
      'B': image.select('LST_Night_1km').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);


// TerraAqua LST Day
var mxd11a1_day = mxd11a1_day_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_1km').unmask(-1000),
      'B': image.select('LST_Day_1km_1').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Day_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// TerraAqua LST Day only with good pixel
var mxd11a1_day_cleaned = mxd11a1_day_cleaned_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_1km').unmask(-1000),
      'B': image.select('LST_Day_1km_1').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Day_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// TerraAqua LST Night
var mxd11a1_night = mxd11a1_night_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Night_1km').unmask(-1000),
      'B': image.select('LST_Night_1km_1').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Night_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// TerraAqua LST Night only with good pixel
var mxd11a1_night_cleaned = mxd11a1_night_cleaned_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Night_1km').unmask(-1000),
      'B': image.select('LST_Night_1km_1').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_Night_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);


// Combined Terra and Aqua for both Mean
// LST Mean
var mxd11a1_mean_combine = mxd11a1_day.combine(mxd11a1_night);
// LST Mean cleaned
var mxd11a1_mean_cleaned_combine = mxd11a1_day_cleaned.combine(mxd11a1_night_cleaned);


// TerraAqua LST Mean
var mxd11a1_mean = mxd11a1_mean_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_mean_1km').unmask(-1000),
      'B': image.select('LST_Night_mean_1km').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);
// TerraAqua LST Mean only with good pixel
var mxd11a1_mean_cleaned = mxd11a1_mean_cleaned_combine.map(
  function (image) {
    var img_Mean_src = image.expression(
      '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
      'A': image.select('LST_Day_mean_1km').unmask(-1000),
      'B': image.select('LST_Night_mean_1km').unmask(-1000)
      }
    );
    var img_Mean = img_Mean_src.rename('LST_mean_1km').mask(img_Mean_src.gt(-1000));
    image = image.addBands([img_Mean]);
    var time = image.get('system:time_start');
    return image.set('system:time_start', time);
  }
);




/*
 * ADD LAYER TO MAP 
 */
 
// ui Map Layer
// Load the image into map using standard symbology 
// Terra
var map_mod11a1_day = ui.Map.Layer(mod11a1_day.select('LST_Day_1km'), LSTvis,'Terra - LST Day', false);
var map_mod11a1_day_QC = ui.Map.Layer(mod11a1_day_QC.select('LST_Day_1km'), LSTvis,'Terra - LST Day (QC applied)', false);
var map_mod11a1_night = ui.Map.Layer(mod11a1_night.select('LST_Night_1km'), LSTvis,'Terra - LST Night', false);
var map_mod11a1_night_QC = ui.Map.Layer(mod11a1_night_QC.select('LST_Night_1km'), LSTvis,'Terra - LST Night (QC applied)', false);
var map_mod11a1_mean = ui.Map.Layer(mod11a1_mean.select('LST_Daily_mean_1km'), LSTvis,'Terra - LST Mean', false);
var map_mod11a1_mean_QC = ui.Map.Layer(mod11a1_mean_QC.select('LST_Daily_mean_1km'), LSTvis,'Terra - LST Mean (QC applied)', false);
// Aqua
var map_myd11a1_day = ui.Map.Layer(myd11a1_day.select('LST_Day_1km'), LSTvis,'Aqua - LST Day', false);
var map_myd11a1_day_QC = ui.Map.Layer(myd11a1_day_QC.select('LST_Day_1km'), LSTvis,'Aqua - LST Day (QC applied)', false);
var map_myd11a1_night = ui.Map.Layer(myd11a1_night.select('LST_Night_1km'), LSTvis,'Aqua - LST Night', false);
var map_myd11a1_night_QC = ui.Map.Layer(myd11a1_night_QC.select('LST_Night_1km'), LSTvis,'Aqua - LST Night (QC applied)', false);
var map_myd11a1_mean = ui.Map.Layer(myd11a1_mean.select('LST_Daily_mean_1km'), LSTvis,'Aqua - LST Mean', false);
var map_myd11a1_mean_QC = ui.Map.Layer(myd11a1_mean_QC.select('LST_Daily_mean_1km'), LSTvis,'Aqua - LST Mean (QC applied)', false);
// MODIS Combined
var map_mxd11a1_day = ui.Map.Layer(mxd11a1_day.select('LST_Day_mean_1km'), LSTvis,'Combined - LST Day', false);
var map_mxd11a1_day_QC = ui.Map.Layer(mxd11a1_day_cleaned.select('LST_Day_mean_1km'), LSTvis,'Combined - LST Day (QC applied)', false);
var map_mxd11a1_night = ui.Map.Layer(mxd11a1_night.select('LST_Night_mean_1km'), LSTvis,'Combined - LST Night', false);
var map_mxd11a1_night_QC = ui.Map.Layer(mxd11a1_night_cleaned.select('LST_Night_mean_1km'), LSTvis,'Combined - LST Night (QC applied)', false);
var map_mxd11a1_mean = ui.Map.Layer(mxd11a1_mean.select('LST_mean_1km'), LSTvis,'Combined - LST Mean', false);
var map_mxd11a1_mean_QC = ui.Map.Layer(mxd11a1_mean_cleaned.select('LST_mean_1km'), LSTvis,'Combined - LST Mean (QC applied)', false);
// Boundary
var bndLine = ui.Map.Layer(bnd.style({fillColor: "#00000000", color: '646464', width: 0.5}));

// Reset all layers
Map.layers().reset([
  map_mod11a1_day,map_mod11a1_night,map_mod11a1_day_QC,map_mod11a1_night_QC,map_mod11a1_mean,map_mod11a1_mean_QC,
  map_myd11a1_day,map_myd11a1_night,map_myd11a1_day_QC,map_myd11a1_night_QC,map_myd11a1_mean,map_myd11a1_mean_QC,
  map_mxd11a1_day,map_mxd11a1_night,map_mxd11a1_day_QC,map_mxd11a1_night_QC,map_mxd11a1_mean,map_mxd11a1_mean_QC,
  bndLine
  ]);




/* 
 * DATE SLIDER CONFIGURATION
 */

// Start and End
var startDate = start_period.getInfo();
var endDate = firstload.getInfo();

// Slider function
var slider = ui.DateSlider({
  start: startDate.value, 
  end: endDate.value, 
  period: 1, // Daily
  style: {width: '400px', padding: '10px', position: 'bottom-right'},
  onChange: renderDateRange
});



// Render date range function
function renderDateRange(dateRange) {
  // Bring in MODIS data. Select LST and pre-processed Quality Control Band
  // MOD LST Day
  var mod11a1_day = MOD11.select(['LST_Day_1km','QC_Day']).map(toCelciusDay).filterDate(dateRange.start(), dateRange.end().advance(1, 'day'));
  // MOD LST Night
  var mod11a1_night = MOD11.select(['LST_Night_1km','QC_Night']).map(toCelciusNight).filterDate(dateRange.start(), dateRange.end().advance(1, 'day'));
  // MYD LST Day
  var myd11a1_day = MYD11.select(['LST_Day_1km','QC_Day']).map(toCelciusDay).filterDate(dateRange.start(), dateRange.end().advance(1, 'day'));
  // MYD LST Night
  var myd11a1_night = MYD11.select(['LST_Night_1km','QC_Night']).map(toCelciusNight).filterDate(dateRange.start(), dateRange.end().advance(1, 'day'));
  
  // Removed bad pixel
  // Mask the less than Good images from the collection of images
  // MOD LST Day only with good pixel
  var mod11a1_day_QC = mod11a1_day.map(QC_Day_mask);
  // MOD LST Night only with good pixel
  var mod11a1_night_QC = mod11a1_night.map(QC_Night_mask);
  // MYD LST Day only with good pixel
  var myd11a1_day_QC = myd11a1_day.map(QC_Day_mask);
  // MYD LST Night only with good pixel
  var myd11a1_night_QC = myd11a1_night.map(QC_Night_mask);
  
  // Combined day and night
  // Merge two image collection
  var mod11a1_combine = mod11a1_day.combine(mod11a1_night);
  // Merge two image collection (cleaned day and night)
  var mod11a1_cleaned_combine = mod11a1_day_QC.combine(mod11a1_night_QC);
  // Merge two image collection
  var myd11a1_combine = myd11a1_day.combine(myd11a1_night);
  // Merge two image collection (cleaned day and night)
  var myd11a1_cleaned_combine = myd11a1_day_QC.combine(myd11a1_night_QC);
  
  // Combined Terra and Aqua
  // LST Day
  var mxd11a1_day_combine = mod11a1_day.combine(myd11a1_day);
  // LST Night
  var mxd11a1_night_combine = mod11a1_night.combine(myd11a1_night);
  // LST Day cleaned
  var mxd11a1_day_cleaned_combine = mod11a1_day_QC.combine(myd11a1_day_QC);
  // LST Night cleaned
  var mxd11a1_night_cleaned_combine = mod11a1_night_QC.combine(myd11a1_night_QC);


  // Inspired from ArcGIS Cell Statistics handling the NO DATA
  // only cells that have a value in the input value raster will be used
  // in determining the output value for that cell. 
  // NoData cells in the value raster will be ignored in the statistic calculation.
  // Thanks to Ridwan Mulyadi for the expression
  
  // MOD LST Mean
  var mod11a1_mean = mod11a1_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_1km').unmask(-1000),
        'B': image.select('LST_Night_1km').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // MOD LST Mean only with good pixel
  var mod11a1_mean_QC = mod11a1_cleaned_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_1km').unmask(-1000),
        'B': image.select('LST_Night_1km').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // MYD LST Mean
  var myd11a1_mean = myd11a1_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_1km').unmask(-1000),
        'B': image.select('LST_Night_1km').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // MYD LST Mean only with good pixel
  var myd11a1_mean_QC = myd11a1_cleaned_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_1km').unmask(-1000),
        'B': image.select('LST_Night_1km').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Daily_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  
  // TerraAqua LST Day
  var mxd11a1_day = mxd11a1_day_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_1km').unmask(-1000),
        'B': image.select('LST_Day_1km_1').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Day_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // TerraAqua LST Day only with good pixel
  var mxd11a1_day_cleaned = mxd11a1_day_cleaned_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_1km').unmask(-1000),
        'B': image.select('LST_Day_1km_1').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Day_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // TerraAqua LST Night
  var mxd11a1_night = mxd11a1_night_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Night_1km').unmask(-1000),
        'B': image.select('LST_Night_1km_1').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Night_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // TerraAqua LST Night only with good pixel
  var mxd11a1_night_cleaned = mxd11a1_night_cleaned_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Night_1km').unmask(-1000),
        'B': image.select('LST_Night_1km_1').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_Night_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  
  
  // Combined Terra and Aqua for both Mean
  // LST Mean
  var mxd11a1_mean_combine = mxd11a1_day.combine(mxd11a1_night);
  // LST Mean cleaned
  var mxd11a1_mean_cleaned_combine = mxd11a1_day_cleaned.combine(mxd11a1_night_cleaned);
  
  
  // TerraAqua LST Mean
  var mxd11a1_mean = mxd11a1_mean_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_mean_1km').unmask(-1000),
        'B': image.select('LST_Night_mean_1km').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  // TerraAqua LST Mean only with good pixel
  var mxd11a1_mean_cleaned = mxd11a1_mean_cleaned_combine.map(
    function (image) {
      var img_Mean_src = image.expression(
        '!(A>-999 || B>-999) ? -1000:((A > -999 ? A:0) + (B > -999 ? B:0)) / ((A > -999 ? 1:0) + (B > -999 ? 1:0))', {
        'A': image.select('LST_Day_mean_1km').unmask(-1000),
        'B': image.select('LST_Night_mean_1km').unmask(-1000)
        }
      );
      var img_Mean = img_Mean_src.rename('LST_mean_1km').mask(img_Mean_src.gt(-1000));
      image = image.addBands([img_Mean]);
      var time = image.get('system:time_start');
      return image.set('system:time_start', time);
    }
  );
  
  
  // ui Map Layer
  // Load the image into map using standard symbology
  // Terra
  var map_mod11a1_day = ui.Map.Layer(mod11a1_day.select('LST_Day_1km'), LSTvis,'Terra - LST Day', false);
  var map_mod11a1_day_QC = ui.Map.Layer(mod11a1_day_QC.select('LST_Day_1km'), LSTvis,'Terra - LST Day (QC applied)', false);
  var map_mod11a1_night = ui.Map.Layer(mod11a1_night.select('LST_Night_1km'), LSTvis,'Terra - LST Night', false);
  var map_mod11a1_night_QC = ui.Map.Layer(mod11a1_night_QC.select('LST_Night_1km'), LSTvis,'Terra - LST Night (QC applied)', false);
  var map_mod11a1_mean = ui.Map.Layer(mod11a1_mean.select('LST_Daily_mean_1km'), LSTvis,'Terra - LST Mean', false);
  var map_mod11a1_mean_QC = ui.Map.Layer(mod11a1_mean_QC.select('LST_Daily_mean_1km'), LSTvis,'Terra - LST Mean (QC applied)', false);
  // Aqua
  var map_myd11a1_day = ui.Map.Layer(myd11a1_day.select('LST_Day_1km'), LSTvis,'Aqua - LST Day', false);
  var map_myd11a1_day_QC = ui.Map.Layer(myd11a1_day_QC.select('LST_Day_1km'), LSTvis,'Aqua - LST Day (QC applied)', false);
  var map_myd11a1_night = ui.Map.Layer(myd11a1_night.select('LST_Night_1km'), LSTvis,'Aqua - LST Night', false);
  var map_myd11a1_night_QC = ui.Map.Layer(myd11a1_night_QC.select('LST_Night_1km'), LSTvis,'Aqua - LST Night (QC applied)', false);
  var map_myd11a1_mean = ui.Map.Layer(myd11a1_mean.select('LST_Daily_mean_1km'), LSTvis,'Aqua - LST Mean', false);
  var map_myd11a1_mean_QC = ui.Map.Layer(myd11a1_mean_QC.select('LST_Daily_mean_1km'), LSTvis,'Aqua - LST Mean (QC applied)', false);
  // MODIS Combined
  var map_mxd11a1_day = ui.Map.Layer(mxd11a1_day.select('LST_Day_mean_1km'), LSTvis,'Combined - LST Day', false);
  var map_mxd11a1_day_QC = ui.Map.Layer(mxd11a1_day_cleaned.select('LST_Day_mean_1km'), LSTvis,'Combined - LST Day (QC applied)', false);
  var map_mxd11a1_night = ui.Map.Layer(mxd11a1_night.select('LST_Night_mean_1km'), LSTvis,'Combined - LST Night', false);
  var map_mxd11a1_night_QC = ui.Map.Layer(mxd11a1_night_cleaned.select('LST_Night_mean_1km'), LSTvis,'Combined - LST Night (QC applied)', false);
  var map_mxd11a1_mean = ui.Map.Layer(mxd11a1_mean.select('LST_mean_1km'), LSTvis,'Combined - LST Mean', false);
  var map_mxd11a1_mean_QC = ui.Map.Layer(mxd11a1_mean_cleaned.select('LST_mean_1km'), LSTvis,'Combined - LST Mean (QC applied)', false);
  // Boundary
  var bndLine = ui.Map.Layer(bnd.style({fillColor: "#00000000", color: '646464', width: 0.5}));
  
  // Reset all layers
  Map.layers().reset([
    map_mod11a1_day,map_mod11a1_night,map_mod11a1_day_QC,map_mod11a1_night_QC,map_mod11a1_mean,map_mod11a1_mean_QC,
    map_myd11a1_day,map_myd11a1_night,map_myd11a1_day_QC,map_myd11a1_night_QC,map_myd11a1_mean,map_myd11a1_mean_QC,
    map_mxd11a1_day,map_mxd11a1_night,map_mxd11a1_day_QC,map_mxd11a1_night_QC,map_mxd11a1_mean,map_mxd11a1_mean_QC,
    bndLine
    ]);
}




/* 
 * DATA DOWNLOAD
 */

// Add download button to panel
var download = ui.Button({
  label: 'Downloads the data',
  style: {position: 'top-center', color: 'black'},
  onClick: function() {
      
      // As the download request probably takes some time, we need to warn the user, 
      // so they not repeating click the download button
      alert("If you see this message, the download request is started! Please go to Tasks, wait until the download list appear. Click RUN for each data you want to download");
      
      // Downloading data
      // Export the result to Google Drive
      var dt = ee.Date(slider.getValue()[0]);
      
      // MODIS LST Day
      Export.image.toDrive({
        image:mxd11a1_day.select('LST_Day_mean_1km'),
        description:'MXD11A1_TerraAqua_LST_Day_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // MODIS LST Night
      Export.image.toDrive({
        image:mxd11a1_night.select('LST_Night_mean_1km'),
        description:'MXD11A1_TerraAqua_LST_Night_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // MODIS LST Day cleaned
      Export.image.toDrive({
        image:mxd11a1_day_QC.select('LST_Day_mean_1km'),
        description:'MXD11A1_TerraAqua_LST_Day_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // MODIS LST Night cleaned
      Export.image.toDrive({
        image:mxd11a1_night_QC.select('LST_Night_mean_1km'),
        description:'MXD11A1_TerraAqua_LST_Night_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // MODIS LST Mean
      Export.image.toDrive({
        image:mxd11a1_mean.select('LST_mean_1km'),
        description:'MXD11A1_TerraAqua_LST_Mean_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // MODIS LST Mean cleaned
      Export.image.toDrive({
        image:mxd11a1_mean_QC.select('LST_mean_1km'),
        description:'MXD11A1_TerraAqua_LST_Mean_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Terra LST Day
      Export.image.toDrive({
        image:mod11a1_day.select('LST_Day_1km'),
        description:'MOD11A1_LST_Day_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Terra LST Night
      Export.image.toDrive({
        image:mod11a1_night.select('LST_Night_1km'),
        description:'MOD11A1_LST_Night_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Terra LST Day cleaned
      Export.image.toDrive({
        image:mod11a1_day_QC.select('LST_Day_1km'),
        description:'MOD11A1_LST_Day_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Terra LST Night cleaned
      Export.image.toDrive({
        image:mod11a1_night_QC.select('LST_Night_1km'),
        description:'MOD11A1_LST_Night_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Terra LST Mean
      Export.image.toDrive({
        image:mod11a1_mean.select('LST_Daily_mean_1km'),
        description:'MOD11A1_LST_Mean_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Terra LST Mean cleaned
      Export.image.toDrive({
        image:mod11a1_mean_QC.select('LST_Daily_mean_1km'),
        description:'MOD11A1_LST_Mean_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Aqua LST Day
      Export.image.toDrive({
        image:myd11a1_day.select('LST_Day_1km'),
        description:'MYD11A1_LST_Day_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Aqua LST Night
      Export.image.toDrive({
        image:myd11a1_night.select('LST_Night_1km'),
        description:'MYD11A1_LST_Night_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Aqua LST Day cleaned
      Export.image.toDrive({
        image:myd11a1_day_QC.select('LST_Day_1km'),
        description:'MYD11A1_LST_Day_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Aqua LST Night cleaned
      Export.image.toDrive({
        image:myd11a1_night_QC.select('LST_Night_1km'),
        description:'MYD11A1_LST_Night_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Aqua LST Mean
      Export.image.toDrive({
        image:myd11a1_mean.select('LST_Daily_mean_1km'),
        description:'MYD11A1_LST_Mean_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      // Aqua LST Mean cleaned
      Export.image.toDrive({
        image:myd11a1_mean_QC.select('LST_Daily_mean_1km'),
        description:'MYD11A1_LST_Mean_cleaned_' + dt.format('yyyy-MM-dd').getInfo(),
        folder:'GEE',
        scale:1000,
        maxPixels:1e12
      });
      
      print('Data Downloaded!', dt);
  }
});

// Add the button to the map and the panel to root.
Map.add(download);



/*
 * LEGEND PANEL
 */

// A color bar widget. Makes a horizontal color bar to display the given color palette.
function ColorBar(palette) {
  return ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '100x5',
      format: 'png',
      min: 0,
      max: 1,
      palette: palette,
    },
    style: {stretch: 'horizontal', margin: '0px 8px'},
  });
}

// Returns our labeled legend, with a color bar and three labels representing
// the minimum, middle, and maximum values.
function makeLegend() {
  var labelPanel = ui.Panel(
      [
        ui.Label('<0', {margin: '4px 8px'}),
        ui.Label('20',{margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label('>40', {margin: '4px 8px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
  return ui.Panel([ColorBar(LSTvis.palette), labelPanel]);
}

// Styling for the legend title. 
var LEGEND_TITLE_STYLE = {
  fontSize: '20px',
  fontWeight: 'bold',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '4px',
};

// Styling for the legend footnotes.
var LEGEND_FOOTNOTE_STYLE = {
  fontSize: '12px',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '4px',
};

// Assemble the legend panel.
Map.add(ui.Panel(
    [
      ui.Label('Global Land Surface Temperature', LEGEND_TITLE_STYLE), makeLegend(),
      ui.Label('(degree Celcius in 1km resolution per pixel)', LEGEND_FOOTNOTE_STYLE),
      ui.Label('Source: MODIS Terra/Aqua MXD11A1.006', LEGEND_FOOTNOTE_STYLE)
    ],
    ui.Panel.Layout.flow('vertical'),
    {width: '400px', position: 'bottom-left'}));

// Add to ui
Map.add(slider);
// End of script