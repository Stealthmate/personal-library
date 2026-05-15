const getNodesByField = (data, f) => {
    return [...new Set(data.map(book => book[f]))].map(value => {
        return {
            name: value,
            count: data.filter(book => book[f] === value).length
        }
    });
};

const buildGraph = (data) => {
    let node_root = {
        name: 'Total',
        count: data.length
    };
    let nodes_cat1 = getNodesByField(data, 'cat1');
    let nodes_cat2 = getNodesByField(data, 'cat2').filter(node => node.name !== 'Other');

    let links_root_to_cat1 = nodes_cat1.map(cat1 => {
        return {
            source: node_root.name,
            target: cat1.name,
            value: cat1.count
        };
    });

    let links_cat1_to_cat2 = nodes_cat1.flatMap(node_cat1 => {
        return nodes_cat2.map(node_cat2 => {
            let value = data.filter(book => {
                return (book.cat1 == node_cat1.name)
                    && (book.cat2 == node_cat2.name);
            }).length;
            return {
                source: node_cat1.name,
                target: node_cat2.name,
                value
            }
        }).filter(link => link.value > 0);
    });

    return {
        nodes: [node_root, ...nodes_cat1.toSorted((a, b) => b.count - a.count), ...nodes_cat2.toSorted((a, b) => b.count - a.count)],
        links: [
            ...links_root_to_cat1,
            ...links_cat1_to_cat2
        ]
    };
};

const buildSankey = (parent, data) => {
    let linkColor = 'target';

    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 10, bottom: 10, left: 10 };
    var width = 1000 - margin.left - margin.right;
    var height = 400 - margin.top - margin.bottom;

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
        .nodePadding(10)
        .extent([[1, 5], [width - 1, height - 5]]);

    const {nodes, links} = sankey({
        nodes: data.nodes.map(d => Object.assign({}, d)),
        links: data.links.map(d => Object.assign({}, d))
    });
    console.log(nodes);

    // add in the nodes
    var node = svg.append("g")
        .selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) { console.log(d); return "translate(" + d.x0 + "," + d.y0 + ")"; })
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
