//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 760,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([1.82, 38.75])
        .rotate([79.18, 0, 0])
        .parallels([0.00, 25.00])
        .scale(10000.00)
        .translate([width / 2, height / 2]);
    
    var path = d3.geoPath()
        .projection(projection);
    
    //Example 2.6 line 1...create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule

    //Example 2.6 line 5...create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
        
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];    
    promises.push(d3.csv("data/Lab2Data_MD_CountyDemographics.csv")); //load attributes from csv    
    promises.push(d3.json("data/States.topojson")); //load background spatial data    
    promises.push(d3.json("data/MDCounties.topojson")); //load choropleth spatial data    
    Promise.all(promises).then(callback);

    function callback(data){

        var csvData = data[0];
            states = data[1];    
            maryland = data[2];

        console.log(csvData);
        console.log(states);
        console.log(maryland);

        //translate europe TopoJSON
        var USstates = topojson.feature(states, states.objects.States),
            marylandCounties = topojson.feature(maryland, maryland.objects.MDCounties).features;

        //examine the results
        console.log(USstates);
        console.log(marylandCounties);

        //add Europe countries to map
        var allStates = map.append("path")
            .datum(USstates)
            .attr("class", "states")
            .attr("d", path);

        //add France regions to map
        var allCounties = map.selectAll(".regions")
            .data(marylandCounties)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.COUNTYFP;
            })
            .attr("d", path);    
    };
}