window.mapConfig = {

    center: [-73.94, 40.71],
    zoom: 10.5,


    // ========================================================
    // LEGEND / LAYER CONTROLS
    // ========================================================

    controls: {

        title: "Layers",

        items: [

            {
                label: "Private Ownership",
                type: "category",
                layer: "pocket_parks",
                field: "Ownership",
                value: "Private",

                symbol: {
                    type: "circle",
                    color: "#ed5151"
                }
            },

            {
                label: "Public Ownership",
                type: "category",
                layer: "pocket_parks",
                field: "Ownership",
                value: "Public",

                symbol: {
                    type: "circle",
                    color: "#149ece"
                }
            },

            {
                label: "Community Gardens",
                type: "layer",
                layer: "community_gardens",

                symbol: {
                    type: "circle",
                    color: "#4bba18"
                }
            }

        ]
    },


    // ========================================================
    // MAP LAYERS
    // ========================================================

    layers: [


        // ====================================================
        // 1. POCKET PARKS
        // ====================================================

        {
            id: "pocket_parks",
            sourceId: "pocket_parks",

            name: "Pocket Parks",

            file: "./data/pocket_parks.geojson",

            type: "circle",
            interactive: true,


            // ------------------------------------------------
            // SYMBOLOGY
            // ------------------------------------------------

            style: {

                color: [
                    "case",

                    [
                        "==",
                        ["get", "Ownership"],
                        "Private"
                    ],
                    "#ed5151",

                    [
                        "==",
                        ["get", "Ownership"],
                        "Public"
                    ],
                    "#149ece",

                    "#cccccc"
                ],

                radius: 5
            },


            // ------------------------------------------------
            // POPUP
            // ------------------------------------------------

            popup: {

                titleField: "Park_Name",

                intro: [
                    { field: "Ownership_" },
                    { text: " " },
                    { field: "Use_Subcat" },
                    { text: " on " },
                    { field: "Address" },
                    { text: "." }
                ],

                fields: [

                    {
                        field: "Year",
                        label: "Year Opened"
                    },

                    {
                        field: "Size__Sq_F",
                        label: "Size in Square Feet"
                    },

                    {
                        field: "Use_",
                        label: "Use"
                    },

                    {
                        field: "dataSource",
                        label: "Data Source"
                    },

                    {
                        field: "Links",
                        label: "Description (where available)"
                    }

                ]
            }
        },


        // ====================================================
        // 2. COMMUNITY GARDENS
        // ====================================================

        {
            id: "community_gardens",

            name: "Community Gardens",

            file: "./data/community_gardens.geojson",

            type: "circle",
            interactive: true,


            // ------------------------------------------------
            // SYMBOLOGY
            // ------------------------------------------------

            style: {

                color: "#4bba18",

                radius: 5
            },


            // ------------------------------------------------
            // POPUP
            // ------------------------------------------------

            popup: {

                titleField: "gardenname",

                intro: [
                    { text: "Community garden located on " },
                    { field: "crossstree" },
                    { text: ". Public access hours vary by garden. For more information, see https://www.nycgovparks.org/greenthumb/" }
                ],

                fields: [

                    {
                        field: "address",
                        label: "Address"
                    },

                    {
                        field: "juris",
                        label: "Ownership"
                    },

                    {
                        field: "status",
                        label: "Activity Status"
                    },

                    {
                        field: "DataSource",
                        label: "Data Source"
                    }

                ]
            }
        }

    ]

};