//begin script when window loads
//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = ["Total Population, 2018", "Total Population, 2010", "Total Population, 2000", "Population Change, 2000-2010", "Population Density per Square Mile", "Median Age", "Per Capita Personal Income ($ Dollars)", "Median Household Income ($ Dollars)", "Total Personal Income ($ Thousands)"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    console.log (attrArray)

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.5,
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
            .scale(9000.00)
            .translate([width / 2, height / 2]);
        
        var path = d3.geoPath()
            .projection(projection);
        

            
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
                
            setGraticule(map, path);

            //translate europe TopoJSON
            var USstates = topojson.feature(states, states.objects.States),
                marylandCounties = topojson.feature(maryland, maryland.objects.MDCounties).features;
            
                //add Europe countries to map
            var allStates = map.append("path")
                .datum(USstates)
                .attr("class", "states")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            marylandCounties = joinData(marylandCounties, csvData);
            
            //create the color scale
			var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(marylandCounties, map, path, colorScale);

            //add coordinated visualization to the map
			setChart(csvData, colorScale);

            //examine the results
            //console.log(USstates);
            //console.log(marylandCounties);
        };
    
    function setGraticule(map, path) {

		//graticule generator
		var graticule = d3.geoGraticule()
			.step([1, 1]); //place graticule lines every 5 degrees of longitude and latitude

		//create graticule background
		var gratBackground = map.append("path")
			.datum(graticule.outline()) //bind graticule background
			.attr("class", "gratBackground") //assign class for styling
			.attr("d", path) //project graticule

		//create graticule lines
		var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
			.data(graticule.lines()) //bind graticule lines to each element to be created
			.enter() //create an element for each datum
			.append("path") //append each element to the svg as a path element
			.attr("class", "gratLines") //assign class for styling
			.attr("d", path); //project graticule lines
	};

    function joinData(marylandCounties, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i]; //the current region
            var csvKey = csvCounty.ALAND; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < marylandCounties.length; a++) {

                var geojsonProps = marylandCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.ALAND; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        console.log(marylandCounties);
        return marylandCounties;
    };  

    function setEnumerationUnits(marylandCounties, map, path, colorScale) {
		//draw front layer
		var counties = map.selectAll(".regions")
			.data(marylandCounties)
			.enter()
			.append("path")
			.attr("class", function (d) {
				return "regions " + d.properties.ALAND;
			})
			.attr("d", path)
			.style("fill", function (d) {
				var value = d.properties[expressed];
				if (value) {
					return colorScale(d.properties[expressed]);
				} else {
					return "#ccc";
				}
			});
	};
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#ffffd4",
            "#fed98e",
            "#fe9929",
            "#d95f0e",
            "#993404",
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 45,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 1100000]);

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.ALAND;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });
        
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 80)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " in each county");

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };
}})(); //last line of main.js
