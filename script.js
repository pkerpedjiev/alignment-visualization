function calculateCoverage(mappedReads, refLength) {
    /**
     * Calculate the read coverage over a reference sequence
     *
     * Parameters
     * ----------
     *
     *  mappedReads : [{read: string, mappedPos: int, mismatches: [int, ...]}]
     *      The combined output of many mapRead calls
     *
     *  refLength : int
     *      The length of the reference sequence
     *
     * Returns
     * -------
     *
     *  An array of coverage values
     *
     */

    let coverage = new Array(refLength).fill(0);

    for (let read of mappedReads) {
        for (let i = read.mapPos; i < read.mapPos + read.read.length; i++)
            coverage[i] += 1;
    }

    return coverage;
}

function mapRead(read, refSeq, maxMismatches) {
    /**
     * Map a read to a reference sequence
     *
     * Parameters
     * ----------
     *
     *  read: string
     *      A short read (a few characters long)
     *
     *  refSeq: string
     *      The reference sequence to map to
     *
     *  maxMismatches: string (optional)
     *      The maximum number of mismatches to allow
     *
     * Returns
     * -------
     *
     *  {read: string, mapPos: int, mismatches: [int, int...]}:
     *      The position where the read maps along with the list
     *      of locations where there's a mismatch
     */

    // the number of mismatches at each location
    let positionMismatches = [];

    for (let i = 0; i < refSeq.length - read.length + 1; i++) {
        let positionMismatch = [i,[]];

        for (let j = 0; j < read.length; j++) {
            if ( refSeq[i + j] != read[j]) {
                // add a mismatch to this position
                positionMismatch[1].push(j);

                // too many mismatches
                if (maxMismatches && positionMismatch[1].length > maxMismatches)
                    continue;
            }
        }

        positionMismatches.push(positionMismatch);
    }

    positionMismatches.sort((a,b) => {
        // a[1] and b[1] are the lists of mismatch positions

        if (b[1].length == a[1].length) {
            // equal number of mismatches, sort randomly
            /*
            if (a[1] < 2)
                console.log('equal', a[0], b[0], "mismatches:", a[1], b[1]);
            */
            return -.5 + Math.random()
        } else {
            return a[1].length - b[1].length;
        }
    });


    if (positionMismatches.length)
        return { read: read,
                 mapPos: positionMismatches[0][0],
                 mismatches: positionMismatches[0][1] }
    else
        // we couldn't map the read with less than the
        // specified number of mismatches
        return { read: read, mapPos: -1, mismatches: [] };
}

function drawCoverageProfile(gProfile, height, coverageProfile, letterScale) {
    /*
     * Draw a coverage profile within the given element
     *
     * Parameters
     * ----------
     *
     *  gProfile : A d3 'g' element
     *      The g element to draw the profile into
     *
     *  height: int
     *      The height of the coverage profile
     *
     *  coverageProfile : [int, ...]
     *      An array of coverage values
     *
     *  letterScale : d3.scale
     *      A scale that will position the coverage rectangle for each 
     *      letter
     *
     * Return
     * ------
     *
     *  nothing
     */
    let valueScale = d3.scaleLinear()
    .domain([0, d3.max(coverageProfile)])
    .range([height, 0]);

    let coverageRects = gProfile.selectAll('.coverage-rect')
    .data(coverageProfile)

    coverageRects.enter()
    .append('rect')
    .classed('coverage-rect', true)
    .merge(coverageRects)
    
    .attr('x', (d,i) => letterScale(i))
    .attr('y', valueScale)
    .attr('width', () => letterScale(1) - letterScale(0))
    .attr('height', (d) => height - valueScale(d))

}

function zoomFiltering(divId, refSeq, seqSeq) {
    var width = 550, height=550;

    d3.select(divId)
    .selectAll('svg')
    .remove();

    var svg = d3.select(divId)
                .append('svg')
                .attr('width', width)
                .attr('height', height)

    svg.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .classed('underlay', true)

    gMain = svg.append('g')
    .attr('transform',
            'translate(0,0)');

    //console.log("seqSeq", seqSeq);
    var reads = [];

    let coverage = 50;
    var minReadLength = 3;
    var maxReadLength = 7;
    console.log('seqSeq.length:', seqSeq.length);
    let numReads = Math.ceil(seqSeq.length * coverage / ((minReadLength + maxReadLength) / 2));
    var letterWidth = 12;
    var letterHeight = 24;

    console.log('numReads:', numReads);

    for (let i = 0; i < numReads; i++) {
        let startI = getRandomInt(0, seqSeq.length - minReadLength);
        let nextI = startI + getRandomInt(minReadLength,maxReadLength);

        let read = seqSeq.slice(startI, nextI);
        let mappedRead = mapRead(read, refSeq);

        reads.push(mappedRead);
    }

    let coverageArray = calculateCoverage(reads, refSeq.length);
    console.log("Average coverage:", coverageArray.reduce((a,b) => a + b, 0) / seqSeq.length);

    let coverageProfileHeight = 20;
    let interMargin = 5;

    var gCoverageProfile = gMain.append('g')
    var letterScale = d3.scaleLinear().domain([0, refSeq.length-1])
                      .range([0, (refSeq.length-1) * letterWidth]);

    drawCoverageProfile(gCoverageProfile, coverageProfileHeight, 
                        coverageArray, letterScale);

    var gAlignment = gMain.append('g');

    let gRefTranslate = coverageProfileHeight;
    var gRef = gAlignment.append('g')
    .classed('ref', true)
    .attr('transform', `translate(0,${gRefTranslate})`);



    gRef.append('rect')
                .attr('width', refSeq.length * letterWidth)
                .attr('height', d3.max(coverageArray) * letterHeight + 20)
                .style('fill', 'grey')
                .style('opacity', 0.5)

    gRef.selectAll('text')
    .data(refSeq)
    .enter()
    .append('text')
    .attr('x', (d,i) => i * letterWidth)
    .attr('y', letterHeight / 2)
    .classed('reference-seq', true)
    .text((d) => d);

    var gAllReads = gAlignment.append('g')
    .attr('transform', `translate(0,${gRefTranslate + 10})`);

    var gReads = gAllReads.selectAll('.read')
    .data(reads)
    .enter()
    .append('g')
    .classed('read', true)
    .attr('transform', 'translate(0,4)');

    var rectReads = gReads
    .append('rect')
    .attr('width', (d) => d.read.length * letterWidth)
    .attr('height', 18)
    .attr('y', 6)
    .attr('x', -2)
    .style('stroke', 'grey')
    .style('stroke-width', '1px')
    .style('fill', 'transparent');

    var textReads = gReads
    .each(function(d) {
        // have to append individual texts for each letter so that 
        // we can color according to mismatches
        for (let i = 0; i < d.read.length; i++) {
            d3.select(this)
            .append('text')
            .text(d.read[i])
            .attr('x', i * letterWidth)
            .attr('y', 20)
        }
    })

    let zoom = d3.zoom()
    .on('zoom', zoomed);

    alignReads(refSeq);

    let minX = 0, minY = 0, 
        maxX = refSeq.length * letterWidth, 
        maxY = d3.max(coverageArray) * letterHeight + 20;

    let availableHeight = height - gRefTranslate;

    let x = (minX + maxX) / 2, y = (minY + maxY) / 2,
        dx = maxX - minX, dy = maxY - minX;
    let scale = 1.0 / Math.max(dx / width, dy / availableHeight),
          translate = [width / 2 - scale * x, 
              (1 - scale) * gRefTranslate];


    /*
      gAlignment.transition()
        .duration(2000)
        .style("stroke-width", 1.5 / scale + "px")
        .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    */

    let boundsTranslate = [0,0];
    let boundsScale = 1;

    let minWorldX, maxWorldX, minWorldY, maxWorldY;

    zoom.translateExtent([[-10, -10], 
                         [width+10, height+10]]);   

                         /*
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity
                     .translate(translate[0], translate[1])
                     .scale(scale))
                     .on('end', () => {
                         console.log('minX:', minX, 'maxX:', maxX, 'minY', minY, 'maxY', maxY);

                        let newXScale = d3.zoomIdentity
                        .translate(translate[0], translate[1])
                        .scale(scale).rescaleX(letterScale);

                        boundsTranslate = [translate[0], translate[1]];
                        boundsScale = scale;

                        minWorldY = translate[1];
                        maxWorldY = d3.max(coverageArray) * scale + translate[1];

                        minWorldX = newXScale.invert(0);
                        maxWorldX = newXScale.invert(width);

                        console.log([minWorldX, minWorldY], 
                                             [maxWorldX, maxWorldY]);

                        zoom.translateExtent([[minWorldX, minWorldY], 
                                             [maxWorldX, maxWorldY]]);   
                     });
                     */
    svg.call(zoom);

    let prevTransform = d3.zoomIdentity;

    function zoomed() {
        let referenceOffset = gRefTranslate;
        let t = d3.event.transform;

        newXScale = t.rescaleX(letterScale);
        console.log('t:', t);

        gAlignment
        //.attr('transform', `translate(${t.x},${(1 - t.k)*referenceOffset})scale(${t.k})`);
        .attr('transform', t);

        drawCoverageProfile(gCoverageProfile, coverageProfileHeight, coverageArray,
                            newXScale);
    }

    return;

    var duration = 400;

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function alignReads(text) {
        let marginTop = 0;
        let occupied = [new Array(text.length).fill(0)];

        d3.selectAll('.read')
            .sort(function(a,b) {
                if (a.mapPos == b.mapPos)
                    return +b.read.length - +a.read.length;
                else
                    return +a.mapPos - +b.mapPos;
            })
            .each(function(d,_) {
                let readNodes = d3.select(this).selectAll('text').nodes()
                let readText = readNodes.map(x => x.innerHTML).join('');

                // what is the uppermost free position for this read?
                let rowToPlaceReadIn = null;

                for (let i = 0; i < occupied.length; i++) {
                    let slicedPoss = occupied[i].slice(d.mapPos, d.mapPos + readText.length);
                    let s = slicedPoss.reduce((a,b) => a + b, 0);

                    if (s == 0) {
                        rowToPlaceReadIn = occupied[i];
                        yPos = i;
                        break;
                    }
                }

                if (!rowToPlaceReadIn) {
                    // all existing rows are full, create a new one
                    rowToPlaceReadIn = new Array(text.length).fill(0);
                    yPos = occupied.length;
                    occupied.push(rowToPlaceReadIn);
                }

                for (let j = d.mapPos; j < d.mapPos + readText.length; j++) {
                    rowToPlaceReadIn[j] = 1;
                }

                d3.select(this)
                .selectAll('text')
                .each(function(t, ti) {
                    if (readText[ti] != text[d.mapPos + ti]) {
                        d3.select(this)
                        .attr('fill', 'red');
                    }
                });

                d3.select(this)
                    .transition()
                    .duration(duration)
                    .attr('transform',
                          `translate(${d.mapPos * letterWidth},
                                     ${yPos * letterHeight + marginTop})`)

            });
    }

    /**
     * Shuffles array in place. ES6 version
     * @param {Array} a items The array containing the items.
     */
    function shuffle(a) {
        for (let i = a.length; i; i--) {
            let j = Math.floor(Math.random() * i);
            [a[i - 1], a[j]] = [a[j], a[i - 1]];
        }
    }

    // 
}
