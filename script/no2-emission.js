/*
 * Set of script to:
 * - Extract S5P data and get the NO2 
 * - Calculate total emission of NO2 within a polygon
 * 
 * NOTES: There are 2 source data in EE Catalog
 * 1. Sentinel-5P OFFL NO2: Offline Nitrogen Dioxide
 *    https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_NO2
 * 2. Sentinel-5P NRTI NO2: Near Real-Time Nitrogen Dioxide
 *    https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_NRTI_L3_NO2
 * 
 * Changelog:
 * 2022-12-18 first draft
 */


// Define geographic domain and time range.
//---
// // Bounding box for Metro Manila and surrounding areas
// var bbox_MM = ee.Geometry.Rectangle(120.7155, 14.2076, 121.3856, 14.989); 

// National Capital Region boundary
// Admin1 polygon downloaded from HDX, extracted the NCR using QGIS, upload as assets
var NCR = ee.FeatureCollection("users/bennyistanto/datasets/shp/bnd/phl_bnd_adm1_ncr_a");

Map.centerObject(NCR, 11);
// Period
var startDate = '2020-01-01'; // 2018-06-28 first date of COPERNICUS/S5P/OFFL/L3_NO2
var endDate = '2020-12-31'; // 2022-01-08 last date of COPERNICUS/S5P/OFFL/L3_NO2 (as of 19 Jan 2022)
var year = new Date(startDate).getFullYear();


// Cloud mask for pixels with less than 5% cloud cover
var cloudMask = function(image) {
      return image.updateMask(image.select('cloud_fraction').lt(0.05));
    };


// Sentinel-5P OFFL NO2: Offline Nitrogen Dioxide
//---
// https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_OFFL_L3_NO2
// Bring in S5P data, select the variable and free cloud
var collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
  .select('tropospheric_NO2_column_number_density','cloud_fraction') // tropospheric vertical column of NO2
  .map(cloudMask) // Map the cloud masking functions over NO2 data
  .filterDate(ee.Date(startDate),ee.Date(endDate)); 


// Check resolution
var pixel = collection.first().projection().nominalScale();
print("Spatial resolution", pixel);


// Get free cloud data
var L3_NO2 = collection.select('tropospheric_NO2_column_number_density');

// CONVERSION FACTOR
// tropospheric vertical column NO2 available in mol/m^2 unit
// to get μmol, multiply with 1e6
var mol_to_μmol = L3_NO2.map(function (image) {
  return image.multiply(1e6);
});

var NCR_NO2_μmol = ee.Image(mol_to_μmol.mean().clip(NCR));


// SYMBOLOGY
var NO2vis = {
  min: 0,
  max: 140,
  palette: ['FFFFFF', 'FCD9C9', 'FA876B', 'D6282A', '660210'] // Color from https://maps.s5p-pal.com
};


// Add NO2 layer to the map
Map.addLayer(NCR_NO2_μmol, NO2vis, 'S5P N02 mean (μmol/m^2)');


// Calculating whole emission area, m2 
var emission_area = ee.Image.pixelArea().reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: NCR,
  scale: pixel,
  maxPixels: 1e13
});

var NCR_area = emission_area.values().getInfo()[0];
print("National Capital Region area", NCR_area);

// tropospheric vertical column NO2 available in mol/m^2 unit
// One mol of NO2 is 46.0055 g (reference https://www.convertunits.com/molarmass/NO2)
// mol to ton, you need to multiply with 0.000046 
var mol_to_ton = L3_NO2.map(function (image) {
  return image.multiply(0.000046);
});

var NCR_NO2_ton = ee.Image(mol_to_ton.mean().clip(NCR));


// Reduce the region. The region parameter is the Feature geometry.
var mean_NO2_emission = NCR_NO2_ton.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: NCR,
  scale: pixel,
  maxPixels: 1e9
});

// The result is an emision in ton/m2.
var total_emission = mean_NO2_emission.values().getInfo()[0];
print ("ton/m2", total_emission);

var total = ee.Number(total_emission).multiply(NCR_area);
print("total emission (ton) of NO2 for National Capital Region", total);



// Export the image, specifying scale and region.
Export.image.toDrive({
  image:NCR_NO2_μmol,
  description:'NCR_NO2_μmol_' + year, 
  folder:'GEE',
  scale:1113.2,
  maxPixels:1e13,
  region:NCR
});



// LEGEND PANEL
//---
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
        // Label for NO2 legend
        ui.Label('0', {margin: '4px 8px'}),
        ui.Label('70',{margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label('140', {margin: '4px 8px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
  // NO2 color
  return ui.Panel([ColorBar(NO2vis.palette), labelPanel]);
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
  fontSize: '10px',
  stretch: 'horizontal',
  textAlign: 'center',
  margin: '4px',
};

// Assemble the legend panel.
Map.add(ui.Panel(
    [
      // Legend title for NO2
      ui.Label('Offline Nitrogen Dioxide', LEGEND_TITLE_STYLE), makeLegend(),
      ui.Label('(μmol/m^2 in 1113.2 meters resolution per pixel)', LEGEND_FOOTNOTE_STYLE),
      ui.Label('Source: European Union/ESA/Copernicus', LEGEND_FOOTNOTE_STYLE)
    ],
    ui.Panel.Layout.flow('vertical'),
    {width: '400px', position: 'bottom-left'}));
// End of script