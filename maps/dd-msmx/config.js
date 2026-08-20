window.mapConfig = {
    center: [-73.95, 40.72],
    zoom: 10,

    layers: [
        //1. GARMENT CENTER
        {
            id: "cris_Building_District_Garment_Center",
            name: "Garment Center",
            file: "./data/cris_Building_District_Garment_Center.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: "#008c87",
                opacity: 0.24
            }
        },

         //2. QUADRANT BOUNDARIES
         {
            id: "msmx_quandrants",
            name: "MSMX Quadrants",
            file: "./data/msmx_quadrants.geojson",
            type: "line",
            interactive: false,

            style: {
                color: "#e40e62",
                width: 3,
                dasharray: [2, 2]
            }
        },

        //3. OPEN SPACE
        {
            id: "msmx_os",
            name: "Open Space",
            file: "./data/msmx_os.geojson",
            type: "fill",
            interactive: false,

            style: {
                color: "#4f712b",
                opacity: 0.35
            }
        },

        //4. DEVELOPMENT SITES
        {
            id: "msmx_sites",
            sourceId: "msmx_sites",
            name: "Development Sites",
            file: "./data/msmx_sites.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: [
                    "match",
                    ["get", "devType"],

                    "Projected", "#ca562c",
                    "Potential", "#3d5941",

                    "cccccc"
                ],

                opacity: 0.85
            }
        },

        //5. POINTS OF INTEREST
        {
            id: "msmx_poi",
            name: "Points of Interest",
            file: "./data/msmx_poi.geojson",
            type: "circle",
            interactive: true,

            style: {
                color: "#000000",
                radius: 10
            }
        },

        //6. SITE NUMBER LABELS
        {
            id: "msmx_sites_labels",
            sourceId: "msmx_sites",
            name: "Site Numbers",
            file: "./data/msmx_sites.geojson",
            type: "symbol",
            interactive: false,

            style: {
                textField: ["get", "Site_No_"],
                textColor: "#000000",
                textSize: 14
            }
        }

    ]
};