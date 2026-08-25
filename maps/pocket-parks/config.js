window.mapConfig = {

    center: [-73.94, 40.71],
    zoom: 9.5,

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
                color: "#ed5151",
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
                color: "#149ece",
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

    layers: [

        // 1. POCKET PARKS
        {
            id: "pocket_parks",
            sourceId: "pocket_parks",
            name: "Pocket Parks",
            file: "./data/pocket_parks.geojson",
            type: "circle",
            interactive: true,

            style: {
                color: [
                    "case",
                    ["==", ["get", "Ownership"], "Private"],
                    "#ed5151",

                    ["==", ["get", "Ownership"], "Public"],
                    "#149ece",

                    "#cccccc"
                ],

                radius: 6
            },

            popup: {
                titleField: "Park_Name",

                intro: [
                    { field: "Ownership Subcategory " }, 
                    { field: "Use Subcategory " }, 
                    { text: "on " }, 
                    { field: "Address" }, 

                ]

                fields: [
                    {
                        field: "Year Opened",
                        label: "Year Opened"
                    },
                    {
                        field: "Size in Square Feet",
                        label: "Size in Square Feet"
                    },
                    {
                        field: "Use",
                        label: "Use"
                    },
                    {
                        field: "Data Source",
                        label: "Data Source"
                    },
                    {
                        field: "Links",
                        label: "Description (where available)"
                    },
                ]
            }
 
        },

        // 2. COMMUNITY GARDENS
        {
            id: "community_gardens",
            name: "Community Gardens",
            file: "./data/community_gardens.geojson",
            type: "circle",
            interactive: true,

            style: {
                color: "#4bba18",
                radius: 6
            },

            popup: {
                titleField: "gardenname",
                
                intro: [
                    { text: "Community garden located on " }, 
                    { field: "crosstree " }, 
                    { text: "Public access hours vary by garden. For more information, see https://www.nycgovparks.org/greenthumb/" }, 

                ]
                
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
                        field: "Data Source",
                        label: "Data Source"
                    },
                    
                ]
            }
        },


    ]
};
