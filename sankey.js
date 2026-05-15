const getNodesByField = (data, f) => {
    return [...new Set(data.map(book => book[f]))].map(value => {
        return {
            name: value,
            count: data.filter(book => book[f] === value).length
        }
    });
};

const nodeSortByCountRev = (a, b) => b.count - a.count;

const buildGraphFiction = (data, rootNode) => {
    let nodes = [...new Set(data.filter(book => book.fiction && book.cat1 !== "Other").map(book => book.cat1))].map(value => {
        return {
            name: value,
            count: data.filter(book => book.cat1 === value).length
        }
    }).toSorted(nodeSortByCountRev);

    let links = nodes.map(node => {
        return {
            source: rootNode,
            target: node.name,
            value: node.count
        }
    });

    console.log(nodes);

    return {
        nodes: [
            ...nodes,
        ],
        links: [
            ...links,
        ]
    };
}

const buildGraphCat1 = (data, rootNode) => {
    let nodes = [...new Set(data.filter(book => book.cat1 === rootNode && book.cat2 !== "Other").map(book => book.cat2))].map(value => {
        return {
            name: value,
            count: data.filter(book => book.cat2 === value).length
        }
    }).toSorted(nodeSortByCountRev);

    let links = nodes.map(node => {
        return {
            source: rootNode,
            target: node.name,
            value: node.count
        }
    });

    return { nodes: nodes.toSorted(nodeSortByCountRev), links };
}

const buildGraphNonFiction = (data, rootNode) => {
    let nodes = [...new Set(data.filter(book => !book.fiction && book.cat1 !== "Other").map(book => book.cat1))].map(value => {
        return {
            name: value,
            count: data.filter(book => book.cat1 === value).length
        }
    }).toSorted(nodeSortByCountRev);

    let links = nodes.map(node => {
        return {
            source: rootNode,
            target: node.name,
            value: node.count
        }
    });

    let subGraphs = nodes.flatMap(node => buildGraphCat1(data, node.name));

    return {
        nodes: [
            ...nodes,
            ...subGraphs.flatMap(g => g.nodes)
        ],
        links: [
            ...links,
            ...subGraphs.flatMap(g => g.links)
        ]
    };
}

const buildGraph = (data) => {
    let rootNode = {
        name: 'Total',
        count: data.length
    };

    let nodesFiction = [
        { name: 'Non-fiction', count: data.filter(book => !book.fiction).length },
        { name: 'Fiction', count: data.filter(book => book.fiction).length },
    ];

    let graphFiction = buildGraphFiction(data, 'Fiction');
    let graphNonFiction = buildGraphNonFiction(data, 'Non-fiction');

    return {
        nodes: [
            rootNode,
            ...nodesFiction,
            ...graphNonFiction.nodes,
            ...graphFiction.nodes,
        ],
        links: [
            ...graphNonFiction.links,
            ...graphFiction.links,
            ...nodesFiction.map(n => {
                return {
                    source: rootNode.name,
                    target: n.name,
                    value: n.count
                }
            })
        ]
    }
};

const buildSankey = (parent, data) => {
    let linkColor = 'target';

    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 10, bottom: 10, left: 10 };
    var width = 1000 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select(parent).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");


    // Constructs and configures a Sankey generator.
    const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeAlign(d3.sankeyLeft) // d3.sankeyLeft, etc.
        .nodeWidth(15)
        .nodeSort(null)
        .nodePadding(20)
        .extent([[1, 5], [width - 1, height - 5]]);

    const {nodes, links} = sankey({
        nodes: data.nodes.map(d => Object.assign({}, d)),
        links: data.links.map(d => Object.assign({}, d))
    });

    // add in the nodes
    var node = svg.append("g")
        .selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
        .call(d3.drag()
            .subject(function (d) { return d; })
            .on("start", function () { this.parentNode.appendChild(this); }));

    // Defines a color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Creates the rects that represent the nodes.
    const rect = svg.append("g")
        .attr("stroke", "#000")
        .selectAll()
        .data(nodes)
        .enter().append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.category));

    // Creates the paths that represent the links.
    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
        .selectAll()
        .data(links)
        .enter().append("g")
        .style("mix-blend-mode", "multiply");

    // Creates a gradient, if necessary, for the source-target color option.
    if (linkColor === "source-target") {
        const gradient = link.append("linearGradient")
            .attr("id", d => (d.uid = DOM.uid("link")).id)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", d => d.source.x1)
            .attr("x2", d => d.target.x0);
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d => color(d.source.category));
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d => color(d.target.category));
    }

    link.append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", linkColor === "source-target" ? (d) => d.uid
            : linkColor === "source" ? (d) => color(d.source.name)
            : linkColor === "target" ? (d) => color(d.target.name)
            : linkColor)
        .attr("stroke-width", d => Math.max(1, d.width));

    // link.append("title")
    //     .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)} TWh`);

    // Adds labels on the nodes.
    svg.append("g")
        .selectAll()
        .data(nodes)
        .enter().append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => `${d.name}: ${d.count}`);

    return svg.node();
};

const draw = (ref) => {
    // load the data
    d3.json("./data.json", function (error, data) {
        let graph = buildGraph(data);
        buildSankey(ref, graph);
    });

};

export default {
    draw
};
