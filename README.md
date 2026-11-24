# Tiny House of Big Obsessions

An explorable miniature dollhouse rendered entirely with **Gaussian splats** that are generated in code: no scans, models or textures. It runs in the browser on desktop and mobile using WebGL2.

Six rooms, each its own little world:

| Floor | Room | Theme |
|---|---|---|
| Top | The Reading Nook | Books |
| Top | The Picture Palace | Film |
| Middle | The Reunion Lounge | The Real Housewives |
| Middle | The Villa Terrace | Love Island |
| Ground | The Curd Cellar | Wisconsin cheese |
| Ground | Clandestino | The Chinatown bar at 35 Canal St |

## Run it

Open `index.html` in a browser. It's a single self-contained file. The only outside requests are for Google Fonts.

## Controls

**Whole house:** drag to orbit, pinch or scroll to zoom, then tap a room or use the bottom menu to go inside.

**Inside a room** (first person, enclosed by four walls):
- Drag to look around in every direction.
- Tap or click the floor to walk there. On desktop you can also use WASD to walk and the arrow keys to turn.
- Pinch or scroll to zoom.
- Leave with the bottom menu, the "Whole house" button or Esc. Keys 1–6 jump straight to a room.

## Rendering

- **High-detail rooms:** when you step inside a room, the renderer switches to a separate, denser splat set built just for that room in a background worker (on phones only the two most recent rooms are kept in memory). It adds bump-mapped materials (embossed tin, recessed mortar, plank grooves, wood ribs), soft shadows from the bar and furniture, light bouncing between surfaces, contact shadows and small handmade imperfections.
- **Post-processing:** bloom on the lamps, a miniature-style tilt-shift depth of field, filmic tone mapping with a warm grade, a vignette and film grain.

## How it works

- `src/gen.js` builds the world procedurally. Small primitives (quads, boxes, cylinders, spheres, lines, rings and triangles) emit anisotropic 3D Gaussians, and their colours come from baked per-room point lights and ambient occlusion. Animated splats (flames, candles, dust, smoke, bubbles, water) are tagged with flag bits. Each room's "fourth wall" is tagged with its room id and only drawn while the camera is inside that room.
- `src/main.js` is a custom WebGL2 splat renderer. Splats are packed into an `RGBA32UI` texture (position, flags, half-float covariance, RGBA8 colour). Each one is projected to a 2D ellipse in the vertex shader, depth-sorted in a Web Worker with a 16-bit counting sort, and drawn front to back with "under" blending. Resolution adapts to frame rate, and phones get fewer splats (about 210k, against about 330k on desktop).
- `src/page.html` contains the UI shell.

## Build

```sh
python3 build.py   # inlines src/gen.js + src/main.js into index.html
```
