//SHARED MAPLIBRE MAP ENGINE
//Reads each map's settings from config.js

const config = window.mapConfig;

if(!config) {
    throw new Error(
        "No mapConfig found. Make sure sonfig.js loads before map.js"
    );
}

//1. CREATE MAP

const map = new maplibregl.Map({
    container: "map",

    //Temporary MapLibre basemap that can be changed.
    style: "https://demotiles.maplibre.org/style.json",

    center: config.center || [-73.99, 40.75],
    zoom: config.zoom || 12
});

//2. ADD NAVIGATION CONTROLS

map.addControl(
    new maplibregl.NavigationControl(),
    "top-right"
);

//3. ADD MAP LAYERS AFTER BASEMAP LOADS

map.on("load", () => {
    config.layers.forEach((layerConfig) => {
        const sourceId = 
            ${layerConfig.sourceId || layerConfig.id}_source`;

        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: "geojson",
                data: layerConfig.file
            });
        }
        
        if (layerConfig.type === "fill") {
            map.addLayer({
                id: layerConfig.id,
                type: "fill",
                source: sourceId,

                paint: {
                    "fill-color": layerConfig.style.color,
                    "fill-opacity": layerConfig.style.opacity
               } 
            });
        }

        else if (layerConfig.type === "line") {
            map.addLayer({
                id: layerConfig.id,
                type: "line",
                source: sourceId,

                paint: {
                    "line-color": layerConfig.style.color,
                    "line-width": layerConfig.style.width,
                    "line-dasharray": layerConfig.style.dasharray
                }
            });
        }

        else if (layerConfig.type === "circle") {
            map.addLayer({
                id: layerConfig.id,
                type: "circle",
                source: sourceId,

                paint: {
                    "circle-color": layerConfig.style.color,
                    "circle-radius": layerConfig.style.radius
                }
            });
        }

        else if (layerConfig.type === "symbol") {
            map.addLayer({
                id: layerConfig.id,
                type: "symbol",
                source: "sourceId,

                layout: {
                    "text-field": layerConfig.style.textField,
                    "text-size": layerConfig.style.textSize,
                    "text-anchor": "center",
                    "text-allow-overlap": true
                },

                paint: {
                    "text-color": layerConfig.style.textColor
                }
            });
        }

        if (layerConfig.interactive) {
            map.on("mousecenter", layerConfig.id, () => {
                map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave"), layerConfig.id, () => {
                map.getCanvas().style.cursor = "";
            });
        }
    });

});
