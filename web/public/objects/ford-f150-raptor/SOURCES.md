# Sources

## 3D model
- File supplied by the user: `ford-f150-raptor.zip` (unzipped into `src/`).
- Contents: `source/Ford Raptor.glb` plus loose copies of the packed textures in `src/textures/`.
- The GLB `asset` block records only `generator: "Khronos glTF Blender I/O v4.0.44"` and `version: "2.0"`. There is no `asset.extras`, `copyright`, author, title or licence field anywhere in the file.
- The source and licence are therefore **unknown**. This pack is for the user's personal use only; do not redistribute the model or a packaged derivative without a licence from the rights holder.
- Material names (`vehicle_generic_tyrewallblack`, `vehicle_generic_smallspecmap__PAINT_1_`, `MAATE_WhelenDominator`, etc.) suggest a game-vehicle conversion with a roof light bar.
- The imported GLB is already in metres. Measured size: length 6.113 m, width 2.553 m, height 2.258 m (the extra height is the roof light bar). A production F-150 Raptor SuperCrew is about 5.9 m long and 2.0 m tall without a bar, so the scale is consistent with a dressed truck. All four tyres sit on the floor.

## Lighting
- Poly Haven `studio_small_09` 2K HDRI, CC0: https://polyhaven.com/a/studio_small_09
  Downloaded as `hdri/studio_small_09_2k.hdr`.
- Additional rectangular area softboxes and highlight strips (not part of the HDRI).

## Facts for future hover labels (not applied to this sample frame)
- Ford F-150 Raptor (aftermarket / game-style loadout with a Whelen Dominator-style roof light bar)
- High-ride chassis, wide fender flares, all-terrain tyres
- Ford oval badge, black grille, bed and cabin glass


## v2 additions (not in the source GLB)
- Body paint retinted to a deep Ford Race / Rapid Red with a tight automotive clear coat. The original Mix-node colour was a dark orange-brown.
- Wheel faces that were baked into the tyre meshes, plus the PAINT_2 beadlock rings, were reassigned to a machined-silver metal. Tyres stay black rubber.
- The raised FORD letters on the front grille (two front-most islands of Object_31.001) and the four-letter tailgate badge (Object_379.001) were split off and given a glossy silver-chrome material.
- An off-road platform roof rack was modelled in the scene (not part of the source GLB): a 1.30 m × 1.34 m satin-black powder-coated aluminium flat platform with 9 slats, side/front/rear rails, a subframe and six pad feet sitting on the cab roof, behind the existing windshield light bar and ahead of the rear cab bar. Checked at multiple turntable angles before keeping it.
- Camera moved to a nearly eye-level front three-quarter (Supra-pack style): 1.63° elevation, 60 mm lens, yaw 145°, fitted so the union of all 144 turntable frames keeps a ≥5% margin.

## v3–v5 edits (not in the source GLB)
- The roof rack added in v2 was removed (user request).
- The grille letters F and D were in a separate mesh with a black material. The D (and the sloped bar end caps beside F and D) read as a block, so the D was rebuilt as a clean extruded D (straight stem, rounded right side, open counter, chamfered edges) and the caps were made matte black.
- The front skid plate (Object_44) was narrowed 15 % and set back 6 cm. Its lower side wings and ribs, and the matching under-plate in the bumper mesh (Object_48), were deleted, because they stuck out below the bumper corners like a loose blade.
- The rear window (Object_372) was a warped two-layer mesh (up to 22 mm out of plane). It was projected onto a best-fit plane.

## Hover-label facts
- Ford Motor Company, 2019 F-150 Raptor technical specifications: 3.5L EcoBoost High Output V6 (450 hp @ 5,000 rpm, 510 lb-ft @ 3,500 rpm), 10-speed automatic, Torque-On-Demand 4x4; FOX Racing Shox front and rear (electronically controlled, continuously variable compression damping); independent double-wishbone coil-over front suspension; 315/70 R17 BFGoodrich All-Terrain T/A KO2 tyres on 17-inch cast aluminium wheels; quad-beam LED headlamps; high-strength steel frame with aluminium cabin and bed; SuperCab or SuperCrew body; SuperCrew 146 in wheelbase, 231.9 in length, 36 gal tank; 96.8 in overall width:
  https://media.ford.com/content/dam/fordmedia/North%20America/US/product/2019/f-150/2019-ford-raptor-tech-specs.pdf
- Ford Motor Company, 2019 F-150 order guide: FOX Racing Shox with Live Valve technology standard on Raptor; 3.5L EcoBoost High Output standard on Raptor:
  https://media.ford.com/content/dam/fordmedia/North%20America/US/product/2019/f-150/2019-F-150-Order-Guide.pdf
- Not taken from the spec sheet: the FORD grille styling and the skid plate. Those labels describe what is visible on the model. The 5.5 ft SuperCrew bed length comes from general Raptor knowledge and was not confirmed against a fetched page.
