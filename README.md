# MAS MAPS
Repository for public MAS maps

## Maps

### Elmhurst & Jackson Heights Cultural Asset Map
- **Folder:** `maps/cultural-asset-map/`
- **Live URL:** https://masplanning.github.io/mas-maps/maps/cultural-asset-map/
- **Data:** `maps/cultural-asset-map/data/`
  - `cultural-assets.geojson`: 46 neighborhood places named by residents at a Livable Neighborhoods Program workshop (fields: Name, Category, Type, Walks, WalkCount)
  - `walk-1.geojson` … `walk-5.geojson`: the five walking tour routes (shown as Walks A–E)
  - `ibx-corridor.geojson`, `ibx-stations.geojson`: Interborough Express (IBX) line and stations
- **Description:** Interactive asset map for Elmhurst and Jackson Heights, Queens. Assets are grouped by Asset-Based Community Development (ABCD) category; visitors can filter by walk or category, search the asset list, and open info cards. Includes a side panel (bottom sheet on phones).
- **Editing:** panel text and walk names are in `content.js`; map styling and settings are in `config.js`. The MAS logo comes from the shared `images/` folder.

## Shared files
- `shared/js/map.js`, `shared/css/style.css`: map engine and styles used by every map
- `images/`: MAS logo files (SVG + PNG; BY = black/yellow for light backgrounds, WY = white/yellow for dark backgrounds)
