function zoomFiltering(divId) {
    var width = 550, height=400, maxR=20;

    var svg = d3.select(divId)
                .append('svg')
                .attr('width', width)
                .attr('height', height)

    // create 15 circles
    var circles = [];
    for (var i = 0; i < 15; i++)
        circles.push({'x': 1+Math.floor(Math.random() * width),
                'y': 1+Math.floor(Math.random() * height),
                'r': 1+Math.floor(Math.random() * maxR)});

    svg.selectAll('circle')
        .data(circles)
        .enter()
        .append('circle')
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; })
        .attr('r', function(d) { return d.r; })
}
