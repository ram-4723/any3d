# Credits and licences: Mount Everest 3D frames

Keep these credit lines on the Mount Everest page (licence condition).

## Elevation (3D terrain shape)
Copernicus DEM GLO-30, tiles Copernicus_DSM_COG_10_N27_00_E086_00_DEM, N27_E087, N28_E086, N28_E087,
downloaded 27 Oct 2026 from the AWS Open Data bucket https://copernicus-dem-30m.s3.amazonaws.com/
Required notice for adapted/modified data (Article 6(b) of the Copernicus WorldDEM-30 licence; free incl. commercial use):
"produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved"
Also required in the site's licence/legal notice (Article 6(c)):
"The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30"
Licence: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf
Dataset page: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM (DOI 10.5270/ESA-c5d3d65)
Note: GLO-30 is a surface model smoothed at 30 m; its highest cell here is 8,736 m, so the model summit is ~110 m lower than the official 8,848.86 m. Labels use the official heights.

## Satellite colour
"Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)"
Layer: s2cloudless_3857 (2016 edition), WMTS https://tiles.maps.eox.at, zoom 14 (~9 m/px)
Licence: CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ (commercial use OK with credit).
Not used: the 2017+ editions (e.g. 2025) are CC BY-NC-SA 4.0, non-commercial only.

## Changes made
Elevation resampled to a 22 km round diorama centred on the summit (27.5 m grid), vertical scale x1.45 (documented
exaggeration, for visual effect), cut flat at 4,300 m. Surface look is stylised / partly procedural: satellite colour
is kept mainly in the low valleys; snow, ochre rock strata, a "Yellow Band" (~8,150-8,500 m), glacier crevasse
streaks, moraine, ridge detail, valley haze, low clouds and the summit plume are artistic procedural effects,
not measured data. Golden-hour lighting, studio plinth and camera are original. Camp 1-3 pin positions are
approximate estimates; North Base Camp lies ~7.5 km beyond the model edge (shown as an edge marker).
