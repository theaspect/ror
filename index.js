const svg = d3.selectAll("#map");
svg.append("image")
    .attr("xlink:href", "map-low.png")
    .attr("width", 1028)
    .attr("height", 770)
    .on("click", (data, i) => {
        setHash("id", "");
        update();
    });
function update() {
    console.log("Refresh");

    // Define the div for the tooltip
    var tooltip = d3.select("body").append("span")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const points = svg.selectAll("g").data(markers);
    const g = points.enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${d.x},${d.y})`);
    points.exit().remove();

    // Passive visited marker
    g.filter(data => data.visited)
        .append("circle")
        .attr("r", (d, i) => 18)
        .attr("class", "visited");
    g.filter(data => data.visited).append("circle")
        .attr("r", (d, i) => 12)
        .attr("class", "visited");
    // Normal circle
    g.append("circle")
        .attr("class", "normal")
        .attr("r", (d, i) => 15)
        .classed("friendly", (d, i) => d.friendly)
        .on("click", (data, i) => {
            if (data) {
                console.log("click", i, data);
                setHash("id", i);
                d3.event.stopPropagation();
            }
        })
        .on("dblclick", (data, i) => {
            if (data) {
                console.log("doubleclick", i, data);
                setVisited(i);
                d3.event.stopPropagation();
            }
        })
        .on("mouseover", (data, i) => {
            console.log(i, data)
            d3.select(d3.event.target.parentNode).classed("hover", true)
            // Tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
                tooltip.html(getTitle(data))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY) + "px");
        })
        .on("mouseout", (data, i) => {
            d3.select(d3.event.target.parentNode).classed("hover", false);
            // Tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", 0);
        });

    // Location Name
    g.append("text")
        .attr("dy", -16)
        .attr("text-anchor", "middle")
        .attr("class", "name")
        .text((d, i) => `#${d.id} ${d.name}`);

    // Ok/Fail mark
    g.append("text")
        .attr("dy", 11)
        .attr("text-anchor", "middle")
        .attr("class", "mark");

    svg.selectAll("g").select("text.mark")
        .classed("ok", (d, i) => getVisited(i) === 1)
        .classed("fail", (d, i) => getVisited(i) === 2)
        .text((d, i) => ["", "✓", "✗"][getVisited(i)]);

    // Resource amount
    g.append("text")
        .attr("dy", -16)
        .attr("text-anchor", "middle")
        .attr("class", "amount");

    g.append("text")
        .attr("dy", 16)
        .attr("text-anchor", "middle")
        .attr("class", "id")
        .text((d, i) => i);
}

function getTitle(data) {
    data.contain
    return ` \
        <strong>#${data.id} ${data.name}</strong> \
        <p>${formatContain(data)}</p>
        <p>${formatComment(data)}</p>
    `
}

function clearSelection() {
    svg.selectAll("g").classed("filtered", false);
    svg.selectAll("g").classed("contain", false);
    document.getElementById("contents").style.display = 'none';
}

function filterTerrain(value) {
    clearSelection();
    if (!value) { return; }

    if (value && value.startsWith("attitude")) {
        svg.selectAll("g").filter(data => (data.friendly || false) === (value === "attitude-friendly")).classed("filtered", true);
    } else if (value && value.startsWith("misc")) {
        svg.selectAll("g").filter(data => data.visited === true).classed("filtered", true);
    } else {
        svg.selectAll("g").filter(data => data.type === value).classed("filtered", true);
    }
}
function filterId(value) {
    clearSelection();
    svg.selectAll("g").filter(data => `${data.id}` === value).classed("filtered", true);
}
function filterSearch(value) {
    clearSelection();
    // Empty search
    if (value) {
        svg.selectAll("g").filter(data => fullTextSearch(data, value)).classed("filtered", true);
    }
}
function filterContain(value) {
    clearSelection();
    // Empty search
    if (value) {
        const scale = d3.scaleLinear()
            .domain(d3.extent(markers, (i) => (i.contain && i.contain[value]) ? i.contain[value] : null))
            .range([0.5, 2]);
        svg.selectAll("g").filter(data => data.contain && data.contain[value])
            .classed("contain", true)
            // Set items amount
            .select("text.amount")
            .text((d, i) => d.contain[value])
            .attr("font-size", (d, i) => `${scale(d.contain[value])}em`);
    }
}

function setVisited(i) {
    try {
        let mode;
        if (localStorage[i]) {
            mode = parseInt(localStorage[i]);
        } else {
            mode = 0;
        }
        localStorage[i] = (mode + 1) % 3;
        update();
    } catch (e) {
        console.log("Local storage disabled");
    }
}

function getVisited(i) {
    try {
        if (localStorage[i]) {
            return parseInt(localStorage[i]);
        } else {
            return 0;
        }
    } catch (e) {
        console.log("Local storage disabled");
        return 0;
    }
}

function fullTextSearch(data, value) {
    if (value) {
        return String(data.id).indexOf(value) != -1
            || data.name.toLowerCase().indexOf(value.toLowerCase()) != -1
            || (data.comment ? data.comment.toLowerCase() : "").indexOf(value.toLowerCase()) != -1
            || (data.contain && data.contain['foe-bosses'] ? data.contain['foe-bosses'].toLowerCase() : "")
                    .indexOf(value.toLowerCase()) != -1;
    } else {
        return false;
    }
}
function updateFilter(item, value) {
    ['terrain', 'search', 'contain'].forEach(e => {
        if (e === item) {
            document.getElementById(e).value = value;
        } else {
            document.getElementById(e).value = ""
        }
    });
}

function onHashChange() {
    console.log(location.hash);
    setInfo();
    const { filter, value } = getHash();
    switch (filter) {
        case '#terrain':
            updateFilter('terrain', value);
            filterTerrain(value);
            break;
        case '#id':
            updateFilter('id', value);
            filterId(value);
            setInfo(markers[value]);
            break;
        case "#search":
            updateFilter('search', value);
            filterSearch(value);
            break;
        case "#contain":
            updateFilter('contain', value);
            filterContain(value);
            break;
        case "#contents":
            document.getElementById("contents").style.display = 'block';
            break;
        default:
            console.log(`Unknown filter ${filter}`);
    }
}
function getLink(_, id) {
    return `<a href="#id/${id}" onmouseenter="highlightLink(${id}, true)" onmouseleave="highlightLink(${id}, false)">#${markers[id].id} ${markers[id].name}</a>`
}
function highlightLink(id, enter) {
    svg.selectAll("g").data(markers).filter(data => data.id == id).classed("highlight", enter);
}

function setHash(filter, value) {
    location.hash = `${filter}/${value}`;
}

function getHash() {
    if (location.hash) {
        const [filter, value] = location.hash.split("/");
        return { filter: filter, value: value };
    } else {
        return { filter: "", value: "" };
    }
}
function formatContain(marker) {
    var text = "";
    if (marker && marker.contain) {
        Object.keys(marker.contain)
            .forEach((key) => {
                if (marker.contain[key]) {
                    text += `<div>&emsp;<strong>${key.replace(/-/g, " ")}</strong> ${marker.contain[key]}</div>`
                }
            })
    }
    return text;
}
function formatComment(marker) {
    if (marker && marker.comment) {
        return marker.comment.replace(/#(\d+)/g, getLink);
    } else {
        return "";
    }
}
function setInfo(marker) {
    if (marker) {
        document.getElementById('info-location').innerHTML = `<a href="#id/${marker.id}">#${marker.id} ${marker.name}</a>`;
        document.getElementById('info-type').innerHTML = marker.type;
        document.getElementById('info-contain').innerHTML = formatContain(marker);
        document.getElementById('info-comment').innerHTML = formatComment(marker);
    } else {
        document.getElementById('info-location').innerHTML = "";
        document.getElementById('info-type').innerHTML = "";
        document.getElementById('info-contain').innerHTML = ""
        document.getElementById('info-comment').innerHTML = "";
    }
}
function totalFoes(data) {
    const getCount = x => typeof x === "number" ? x : x.split(/,\s*/).length;
    data.forEach((item, i, arr) => {
        if (item.contain) {
            item.contain['foe-total'] = Object.keys(item.contain).reduce((acc, key) => acc + (key.startsWith('foe-') ? getCount(item.contain[key]) : 0), 0)
        }
    })
}
function fillContents(data) {
    const contents = document.getElementById("contents");
    data.forEach((item, id) => {
        const a = document.createElement("a");
        a.innerText = `#${id} ${item.name}`;
        a.setAttribute('href', `#id/${id}`);
        contents.appendChild(a);
        contents.appendChild(document.createElement("br"));
    });
}
function postInit(data) {
    totalFoes(data)
    update();
    onHashChange();
    fillContents(data);
}

// Sort and enumerate
// JSON.stringify(markers.sort((a,b) => (a.y*1028+a.x)-(b.y*1028+b.x)).map((e,i) => {e.id=i; return e}), null, "  ")
// All runes ᚾᛎUᛈᛞ ᛟᚩᛊᛗᛖᛏᚫ

// Dev note
// Compress: gzip -9c db.json > db.json.gz
// Server: python -m SimpleHTTPServer 8000
let markers = [];
fetch(new Request('db.json.gz'))
    .then(function(response) {
        return response.arrayBuffer();
    })
    .then(function(binData) {
        markers = JSON.parse(pako.inflate(binData,{ to: 'string' }));
        postInit(markers);
    });