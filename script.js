function zoomFiltering(divId) {
    var width = 550, height=400, maxR=20;

    var svg = d3.select(divId)
                .append('svg')
                .attr('width', width)
                .attr('height', height)

    svg = svg.append('g')
    .attr('transform',
            'translate(20,20)');

    var text = "This is a sentence that we will sequence";
    console.log('text', text);

    var gOrigSentence = svg.append('g');
    var letterWidth = 12;
    var letterHeight = 24;
    var minReadLength = 3;
    var maxReadLength = 5;

    gOrigSentence.selectAll('.text')
        .data(text)
        .enter()
        .append('text')
        .attr('x', function(d,i) { return i * letterWidth })
        .attr('y', 20)
        .text(function(d) { return d; });
    
    //duplicate our sequence
    var numDuplicates = 3;

    var duration = 100;

    for (var j = 1; j < numDuplicates + 1; j++) {
        var gDuplicate = d3.select(gOrigSentence.node().cloneNode(true));

        svg.node().appendChild(gDuplicate.node());

        gDuplicate
            .transition()
            .duration(duration)
            .attr('transform', `translate(0,${30 * j})`)
            .on('end', function() { mutateSequences(this); });
    }

    function mutateSequences(x) {
        var alphabet = 'abcdefghijklmnopqrstuvwxyz';
        var gDuplicateHere = d3.select(x);

        // mutate the copy
        var numToMutate = 2;
        for (var i = 0; i < numToMutate; i++) {
            var nodeToMutate = gDuplicateHere.select('text:nth-child(' + Math.floor(Math.random() * text.length) + ')');
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


            console.log('nodeToMutate:', nodeToMutate);
        }
    }

    var brokenUp = false;

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function breakUpSequences() {
        if (brokenUp)
            return;

        svg.selectAll('g')
            .transition()
            .duration(duration)
            .each(function(d,j) {
                let gNode = d3.select(this);
                let letterNodes = gNode.selectAll('text').nodes()
                console.log('gNode:', gNode, letterNodes);

                if (j == 0)
                    return;

                var i = 0;
                // partition the sequences into reads
                while (i < text.length) {
                    let nextI = Math.min(text.length, i + getRandomInt(minReadLength,maxReadLength));
                    let currentTexts = letterNodes.slice(i, nextI);

                    let read = currentTexts.map((x) => x.innerHTML).join("");
                    console.log('read:', read);

                    var gChunk = svg.append('g')
                        .attr('class', 'read')
                        .attr('transform', `translate(${d3.select(currentTexts[0]).attr('x')},${j*30})`);

                    let initialX = d3.select(currentTexts[0]).attr('x');

                    for (let k = 0; k < currentTexts.length; k++) {
                        currentTexts[k].parentNode.removeChild(currentTexts[k]); 
                        gChunk.node().appendChild(currentTexts[k]);

                        // add a rectangle to show where the text is located
                        gChunk.append('rect')
                            .attr('width', currentTexts.length * letterWidth)
                            .attr('height', 18)
                            .attr('y', 6)
                            .attr('x', -2)
                            .style('stroke', 'grey')
                            .style('stroke-width', '1px')
                            .style('fill', 'transparent')

                        d3.select(currentTexts[k]).attr('x', d3.select(currentTexts[k]).attr('x') 
                                - initialX);
                    }

                    i = nextI;
                }
            })
            .style('opacity', 0.8)
            //.remove();

        /*
        d3.selectAll('.read')
        .transition()
        .each(function(d) {
            d3.select(this).attr('transform', `translate(${Math.random() * width}, ${Math.random() * height})`)
        })
        */

        brokenUp = true;

        shuffleReads();
    }

    function shuffleReads() {
        var N = d3.selectAll('.read').size();
        let positions = Array.apply(null, {length: N}).map(Number.call, Number);
        shuffle(positions);

        let interColSpace = 10;
        let numCols = Math.floor(width / (interColSpace + letterWidth * maxReadLength));
        let numRows = Math.ceil(N / numCols);

        console.log('positions', positions);
        console.log('numRows:', numRows, 'numCols:', numCols);

        let marginTop = 30;
        let marginLeft = 10;

        d3.selectAll('.read')
          .each(function(d,i) {
              let rowPos = Math.floor(positions[i] / numCols);
              let colPos = positions[i] - (rowPos * numCols);

              d3.select(this)
                  .transition()
                  .duration(duration)
                  .attr('transform',
                          `translate(${marginLeft + colPos * maxReadLength * letterWidth + (colPos - 1) * interColSpace},
                                     ${rowPos * letterHeight + marginTop})`)
          });

        alignReads();
    }

    function alignReads() {
        d3.selectAll('.read')
            .each(function(d,i) {
                let readNodes = d3.select(this).selectAll('text').nodes()
                let readText = readNodes.map(x => x.innerHTML).join('');

                console.log('readText:', readNodes, readText);
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
