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

function zoomFiltering(divId, refSeq, seqSeq) {
    var width = 800, height=800, maxR=20;

    d3.select(divId)
    .selectAll('svg')
    .remove();

    var svg = d3.select(divId)
                .append('svg')
                .attr('width', width)
                .attr('height', height)

    svg = svg.append('g')
    .attr('transform',
            'translate(20,20)');

    //console.log("seqSeq", seqSeq);
    var reads = [];

    let coverage = 5;
    let numReads = seqSeq.length * coverage;
    var letterWidth = 12;
    var letterHeight = 24;
    var minReadLength = 3;
    var maxReadLength = 6;

    for (let i = 0; i < numReads; i++) {
        let startI = getRandomInt(0, seqSeq.length - minReadLength);
        let nextI = startI + getRandomInt(minReadLength,maxReadLength);

        let read = seqSeq.slice(startI, nextI);
        let mappedRead = mapRead(read, refSeq);

        reads.push(mappedRead);
    }

    var gRef = svg.append('g')
    .classed('ref', true)

    gRef.selectAll('text')
    .data(refSeq)
    .enter()
    .append('text')
    .attr('x', (d,i) => i * letterWidth)
    .attr('y', 0)
    .text((d) => d);

    var gReads = svg.selectAll('.read')
    .data(reads)
    .enter()
    .append('g')
    .classed('read', true)

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

    alignReads(refSeq);
    return;

    

    var text = refSeq;
    //var text = "This is a longer sentence that we can sequence how we like";

    var gOrigSentence = svg.append('g');

    gOrigSentence.selectAll('.text')
        .data(text)
        .enter()
        .append('text')
        .attr('x', function(d,i) { return i * letterWidth })
        .attr('y', 20)
        .text(function(d) { return d; });
    
    //duplicate our sequence
    var numDuplicates = 400;

    var duration = 400;

    for (var j = 1; j < numDuplicates + 1; j++) {
        var gDuplicate = d3.select(gOrigSentence.node().cloneNode(true));

        svg.node().appendChild(gDuplicate.node());

        gDuplicate
            .transition()
            .duration(duration)
            .attr('transform', `translate(0,${30 * j})`)
            //.on('end', function() { mutateSequences(this); });

        var numToMutate = 2;
        //var alphabet = 'abcdefghijklmnopqrstuvwxyz';
        var alphabet = 'ACGT';
        for (var i = 0; i < numToMutate; i++) {
            var nodeToMutate = gDuplicate.select('text:nth-child(' + Math.floor(Math.random() * text.length) + ')');
            nodeToMutate.transition()
                .duration(duration)
                .style('fill', 'red')
                .on('end', function() {
                    d3.select(this)    
                    .text(alphabet[Math.floor(Math.random() * alphabet.length)]);

                    breakUpSequences();
                });

                /*
            nodeToMutate.transition()
                .duration(duration)
                .text(alphabet[Math.floor(Math.random() * alphabet.length)]);
                */
        }
    }

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }

    let marginLeft = 10;
    let interColSpace = 10;
    var aligned = false;

    function alignReads(text) {
        if (aligned)
            return;

        aligned = true;

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
                //console.log('d:', d);

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
