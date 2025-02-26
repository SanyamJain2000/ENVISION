const _ = window._;
let originalData = [];
const margin = { top: 10, right: 10, bottom: 10, left: 10 },
    outerWidth = document.getElementById("treemap").clientWidth - margin.left - margin.right,
    outerHeight = document.getElementById("treemap").clientHeight - margin.top - margin.bottom;
let selectedOutcome = null;

let isCountryFilterActive = false;
let currentCountry = null;
let toggleCountryFilterBtn;
let countryFilterMessage;

let groupedData = [];
let totalReports = 0;
let minDate, maxDate;
let selectedStartDate, selectedEndDate;
let currentEnlargedElement = null;
let currentReports = [];
let reactionColorScale;
let indicationColorScale;
let beatingProducts = [];

let isToggled = false;

const timelineBar = d3.select('#timeline-bar');
let weeklyReportCounts = [];
let densitySvg;
let timelineWidthGlobal = 0;

let selectedCountryForFilter = null;

let sankeyState = {
    expandedNode: null
};

let sankeyZoom = d3.zoom()
  .filter(function(event) {
    if (event.type === 'wheel') return false;
    return true;
  })
  .on("zoom", (event) => {
  });

let sankeyPaginationState = {
    indications: {
        currentPage: 0,
        pageSize: 10,
        totalPages: 0,
    },
    reactions: {
        currentPage: 0,
        pageSize: 10,
        totalPages: 0,
    },
    reports: {
        currentPage: 0,
        pageSize: 10,
        totalPages: 0,
    }
};

let currentProductData = null;
const svg = d3.select("#treemap")
    .append("svg")
    .attr("width", outerWidth + margin.left + margin.right)
    .attr("height", outerHeight + margin.top + margin.bottom)
    .style("border", "2px solid black")
    .attr("class", "world-svg");

const zoomGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    const zoom = d3.zoom()
    .filter(function(event) { 
        return true;
    })
    .scaleExtent([0.5, 12])
    .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
    });

d3.select("#treemap svg").call(zoom);


svg.call(zoom);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const outcomeColors = {
    "Death": "#ff8c8c",
    "Life-Threatening": "#ffb675",
    "Disabling": "#fff1aa",
    "Hospitalization": "#e1fa7b",
    "Congenital Anomali": "#d6a5c9",
    "Not Serious": "#beecb2",
    "Other": "#c7e4fd"
};

function createGradient(id, color) {
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", id)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.color(color).brighter(1));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.color(color).darker(1));
}

Object.keys(outcomeColors).forEach(outcome => {
    createGradient(outcome + "-gradient", outcomeColors[outcome]);
});

const reportSlider = document.getElementById("report-slider");
const reportCount = document.getElementById("report-count");

reportSlider.addEventListener("input", function () {
    const value = parseInt(reportSlider.value, 10);
    reportCount.textContent = `${value} reports`;
    updateTreemap();
});

const searchBar = document.getElementById('search-bar');
searchBar.setAttribute('autocomplete', 'off');

let circularFilters = {
    Weight: { min: 1, max: 200 },
    Age: { min: 1, max: 100 },
    Sex: { male: true, female: true }
  };
  
  const gap = 2 * Math.PI / 180;
  const extraGap = 0.05;
  
  const segments = [
    {
      name: 'Weight',
      startAngle: (0 + gap) + extraGap,
      endAngle: (Math.PI - gap) - extraGap,
      color: '#8D8B45',
      range: [1, 200]
    },
    {
      name: 'Age',
      startAngle: (Math.PI + gap) + extraGap,
      endAngle: ((2 * Math.PI) - gap) - extraGap,
      color: '#5AAE5D',
      range: [1, 100]
    }
  ];
  
  const circularSliderSVG = d3.select("#circular-slider")
    .attr("width", 300)
    .attr("height", 300)
    .attr("viewBox", "0 0 300 300")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(88, 130)`);
  
  circularSliderSVG.append("text")
    .attr("class", "age-text")
    .attr("x", 0)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("fill", "#333")
    .text("");
  
  circularSliderSVG.append("text")
    .attr("class", "weight-text")
    .attr("x", 0)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("fill", "#333")
    .text("");
  
  const sliderRadius = 65;
  const sliderThickness = 20;
  const minHandleDistance = 5;
  
  function createSegmentGradient(id, color) {
    const defs = circularSliderSVG.append("defs");
    const gradient = defs.append("radialGradient")
      .attr("id", id)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
  
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", d3.color(color).brighter(0.8));
  
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", d3.color(color).darker(0.8));
  }
  
  segments.forEach(segment => {
    const gradientId = `gradient-${segment.name}`;
    createSegmentGradient(gradientId, segment.color);
  
    circularSliderSVG.append("path")
      .attr("class", "circular-slider-track")
      .attr("d", d3.arc()
        .innerRadius(sliderRadius)
        .outerRadius(sliderRadius + sliderThickness)
        .startAngle(segment.startAngle - 55)
        .endAngle(segment.endAngle - 55)()
      )
      .attr("fill", `url(#${gradientId})`)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.3)
      .style("cursor", "pointer")
      .on("mouseover", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 1)
          .attr("stroke", "#888");
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 0.3)
          .attr("stroke", "#ccc");
      });
  
    segment.selectionArc = circularSliderSVG.append("path")
      .attr("class", "circular-slider-selection")
      .attr("fill", `url(#gradient-${segment.name})`)
      .style("opacity", 0.9);
    updateSelectionArc(segment);
  });
  
  segments.forEach(segment => {
    addHandle(segment, 'min');
    addHandle(segment, 'max');
  });
  
  function addHandle(segment, type) {
    const initialValue = type === 'min'
      ? segment.range[0]
      : segment.range[1];
  
    const angle = scaleValueToAngle(initialValue, segment);

    const x = sliderRadius * Math.cos(angle);
    const y = sliderRadius * Math.sin(angle);
  
    const handle = circularSliderSVG.append("circle")
      .attr("class", `circular-slider-handle ${segment.name.toLowerCase()}-${type}`)
      .attr("r", 9)
      .attr("cx", x)
      .attr("cy", y)
      .attr("fill", "#f0f0f0")
      .attr("stroke", d3.color(segment.color).darker(1.5))
      .attr("stroke-width", 2)
      .style("cursor", "grab")
      .on("mouseover", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", "#fff")
          .attr("r", 12);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", "#f0f0f0")
          .attr("r", 9);
      })
      .call(d3.drag()
        .on("start", function() {
          d3.select(this).style("cursor", "grabbing");
        })
        .on("drag", function(event) {
          handleDrag(event, segment, type, this);
        })
        .on("end", function() {
          d3.select(this).style("cursor", "grab");
        })
      );
  
    handle.append("title").text(
      type === 'min'
        ? `${segment.name} Min`
        : `${segment.name} Max`
    );
  }
  
  function scaleValueToAngle(value, segment) {
    const ratio = (value - segment.range[0]) / (segment.range[1] - segment.range[0]);
    return segment.startAngle + ratio * (segment.endAngle - segment.startAngle);
  }
  
  function angleToValue(angle, segment) {
    const ratio = (angle - segment.startAngle) / (segment.endAngle - segment.startAngle);
    return Math.round(ratio * (segment.range[1] - segment.range[0]) + segment.range[0]);
  }
  
  function handleDrag(event, segment, type, handle) {
    const mouse = d3.pointer(event, circularSliderSVG.node());
    let angle = Math.atan2(mouse[1], mouse[0]);
  
    if (angle < 0) angle += 2 * Math.PI;
    if (angle < segment.startAngle) angle = segment.startAngle;
    if (angle > segment.endAngle) angle = segment.endAngle;
  
    const newValue = angleToValue(angle, segment);
  
    if (type === 'min') {
      circularFilters[segment.name].min = Math.min(
        newValue,
        circularFilters[segment.name].max - minHandleDistance
      );
    } else {
      circularFilters[segment.name].max = Math.max(
        newValue,
        circularFilters[segment.name].min + minHandleDistance
      );
    }
  
    updateHandlePosition(handle, segment, type);
    updateSelectionArc(segment);
    updateFilterDisplays();
    updateTreemap();
  }
  
  function updateHandlePosition(handle, segment, type) {
    const value = circularFilters[segment.name][type];
    const angle = scaleValueToAngle(value, segment);
    const x = sliderRadius * Math.cos(angle);
    const y = sliderRadius * Math.sin(angle);
  
    d3.select(handle)
      .attr("cx", x)
      .attr("cy", y);
  }
  
  function updateSelectionArc(segment) {
    const startVal = circularFilters[segment.name].min;
    const endVal = circularFilters[segment.name].max;
  
    const startAngle = scaleValueToAngle(startVal, segment);
    const endAngle = scaleValueToAngle(endVal, segment);
  
    segment.selectionArc
      .attr("d", d3.arc()
        .innerRadius(sliderRadius)
        .outerRadius(sliderRadius + sliderThickness)
        .startAngle(startAngle - 55)
        .endAngle(endAngle - 55)()
      );
  }
  
  function updateFilterDisplays() {
    d3.select(".age-text")
      .text(`${circularFilters.Age.min} - ${circularFilters.Age.max} yrs`);
  
    d3.select(".weight-text")
      .text(`${circularFilters.Weight.min} - ${circularFilters.Weight.max} kg`);
  }  

circularFilters.Sex.male = true;
circularFilters.Sex.female = true;

const maleButtonGroup = circularSliderSVG.append("g")
  .attr("class", "male-button-group")
  .attr("transform", `translate(0, 25)`);

const maleRect = maleButtonGroup.append("rect")
  .attr("x", -54)
  .attr("y", -32)
  .attr("width", 50)
  .attr("height", 26)
  .attr("rx", 13)
  .attr("ry", 13)
  .attr("fill", circularFilters.Sex.male ? "#8FCFFF" : "#fff")
  .attr("stroke", circularFilters.Sex.male ? "#64A8E3" : "#ccc") 
  .attr("stroke-width", 2)
  .style("cursor", "pointer")
  .on("click", function() {
    circularFilters.Sex.male = !circularFilters.Sex.male;
    updateSexButtons();
    updateTreemap();
  })
  .on("mouseover", function() {
    d3.select(this)
      .transition()
      .duration(150)
      .attr("fill", circularFilters.Sex.male ? "#76B8FF" : "#f7f7f7");
  })
  .on("mouseout", function() {
    d3.select(this)
      .transition()
      .duration(150)
      .attr("fill", circularFilters.Sex.male ? "#8FCFFF" : "#fff");
  });

maleButtonGroup.append("text")
  .attr("x", -29)
  .attr("y", -16)
  .attr("font-size", "10px")
  .attr("font-weight", 550)
  .attr("text-anchor", "middle")
  .attr("fill", "#333")
  .style("cursor", "pointer")
  .text("MALE")
  .on("click", function() {
    circularFilters.Sex.male = !circularFilters.Sex.male;
    updateSexButtons();
    updateTreemap();
  });

const femaleButtonGroup = circularSliderSVG.append("g")
  .attr("class", "female-button-group")
  .attr("transform", `translate(60, 25)`);

const femaleRect = femaleButtonGroup.append("rect")
  .attr("x", -59)
  .attr("y", -32)
  .attr("width", 55)
  .attr("height", 26)
  .attr("rx", 13)
  .attr("ry", 13)
  .attr("fill", circularFilters.Sex.female ? "#FFB6C1" : "#fff")
  .attr("stroke", circularFilters.Sex.female ? "#FF889A" : "#ccc")
  .attr("stroke-width", 2)
  .style("cursor", "pointer")
  .on("click", function() {
    circularFilters.Sex.female = !circularFilters.Sex.female;
    updateSexButtons();
    updateTreemap();
  })
  .on("mouseover", function() {
    d3.select(this)
      .transition()
      .duration(150)
      .attr("fill", circularFilters.Sex.female ? "#FFA7B4" : "#f7f7f7");
  })
  .on("mouseout", function() {
    d3.select(this)
      .transition()
      .duration(150)
      .attr("fill", circularFilters.Sex.female ? "#FFB6C1" : "#fff");
  });

femaleButtonGroup.append("text")
  .attr("x", -32)
  .attr("y", -16)
  .attr("font-size", "10px")
  .attr("font-weight", 550)
  .attr("text-anchor", "middle")
  .attr("fill", "#333")
  .style("cursor", "pointer")
  .text("FEMALE")
  .on("click", function() {
    circularFilters.Sex.female = !circularFilters.Sex.female;
    updateSexButtons();
    updateTreemap();
  });

function updateSexButtons() {
  maleRect
    .transition()
    .duration(150)
    .attr("fill", circularFilters.Sex.male ? "#8FCFFF" : "#fff")
    .attr("stroke", circularFilters.Sex.male ? "#64A8E3" : "#ccc");

  femaleRect
    .transition()
    .duration(150)
    .attr("fill", circularFilters.Sex.female ? "#FFB6C1" : "#fff")
    .attr("stroke", circularFilters.Sex.female ? "#FF889A" : "#ccc");
}

function addHandle(segment, type) {
    const initialValue = type === 'min' ? segment.range[0] : segment.range[1];
    const angle = scaleValueToAngle(initialValue, segment);
    const x = sliderRadius * Math.cos(angle);
    const y = sliderRadius * Math.sin(angle);

    const handle = circularSliderSVG.append("circle")
        .attr("class", `circular-slider-handle ${segment.name.toLowerCase()}-${type}`)
        .attr("r", 8)
        .attr("cx", x)
        .attr("cy", y)
        .attr("fill", "#fff")
        .attr("stroke", segment.color)
        .attr("stroke-width", 2)
        .on("mouseover", function() { d3.select(this).attr("fill", "#f0f0f0"); })
        .on("mouseout", function() { d3.select(this).attr("fill", "#fff"); })
        .call(d3.drag()
            .on("drag", function(event) { handleDrag(event, segment, type, this); })
        );

    handle.append("title")
        .text(type === 'min' ? `${segment.name} Min` : `${segment.name} Max`);
}

function handleDrag(event, segment, type, handle) {
    const mouse = d3.pointer(event, circularSliderSVG.node());
    let angle = Math.atan2(mouse[1], mouse[0]);

    if (angle < 0) angle += 2 * Math.PI;

    if (angle < segment.startAngle) angle = segment.startAngle;
    if (angle > segment.endAngle) angle = segment.endAngle;

    const newValue = angleToValue(angle, segment);

    if (type === 'min') {
        circularFilters[segment.name].min = Math.min(newValue, circularFilters[segment.name].max - minHandleDistance);
    } else {
        circularFilters[segment.name].max = Math.max(newValue, circularFilters[segment.name].min + minHandleDistance);
    }

    updateHandlePosition(handle, segment, type);
    updateSelectionArc(segment);
    updateFilterDisplays();
    updateTreemap();
}

function handleSexDrag(event, segment, type, handle) {
    const mouse = d3.pointer(event, circularSliderSVG.node());
    let angle = Math.atan2(mouse[1], mouse[0]);

    if (angle < 0) angle += 2 * Math.PI;
    if (angle < segment.startAngle) angle = segment.startAngle;
    if (angle > segment.endAngle) angle = segment.endAngle;

    const midpointAngle = (segment.startAngle + segment.endAngle) / 2;
    const distanceFromStart = Math.abs(angle - segment.startAngle);
    const distanceFromEnd = Math.abs(angle - segment.endAngle);

    let isSelected = false;
    if (type === 'male') {
        isSelected = distanceFromStart < distanceFromEnd;
        circularFilters.Sex.male = isSelected;
    } else if (type === 'female') {
        isSelected = distanceFromEnd < distanceFromStart;
        circularFilters.Sex.female = isSelected;
    }

    d3.select(handle)
        .attr("fill", circularFilters.Sex[type] ? (type === 'male' ? "#ffd1d1" : "#d1d1ff") : "#fff");

    const x = sliderRadius * Math.cos(angle);
    const y = sliderRadius * Math.sin(angle);
    d3.select(handle)
        .attr("cx", x)
        .attr("cy", y);

    updateSelectionArc(segment);
    updateFilterDisplays();
    updateTreemap();
}

function updateHandlePosition(handle, segment, type) {
    const value = circularFilters[segment.name][type];
    const angle = scaleValueToAngle(value, segment);
    const x = sliderRadius * Math.cos(angle);
    const y = sliderRadius * Math.sin(angle);

    d3.select(handle)
        .attr("cx", x)
        .attr("cy", y);
}

function updateSelectionArc(segment) {
    if (segment.name === 'Sex') {
        const deltaAngle = 0.1;

        let pathD = '';

        if (circularFilters.Sex.male) {
            pathD += d3.arc()
                .innerRadius(sliderRadius)
                .outerRadius(sliderRadius + sliderThickness)
                .startAngle(segment.startAngle)
                .endAngle(segment.startAngle + deltaAngle)();
        }

        if (circularFilters.Sex.female) {
            pathD += d3.arc()
                .innerRadius(sliderRadius)
                .outerRadius(sliderRadius + sliderThickness)
                .startAngle(segment.endAngle - deltaAngle)
                .endAngle(segment.endAngle)();
        }

        segment.selectionArc.attr("d", pathD);
    } else {
        const startValue = circularFilters[segment.name].min;
        const endValue = circularFilters[segment.name].max;

        const startAngle = scaleValueToAngle(startValue, segment);
        const endAngle = scaleValueToAngle(endValue, segment);

        segment.selectionArc.attr("d", d3.arc()
            .innerRadius(sliderRadius)
            .outerRadius(sliderRadius + sliderThickness)
            .startAngle(startAngle)
            .endAngle(endAngle)()
        ).attr("fill", `url(#gradient-${segment.name})`);
    }
}

function scaleValueToAngle(value, segment) {
    const ratio = (value - segment.range[0]) / (segment.range[1] - segment.range[0]);
    return segment.startAngle + ratio * (segment.endAngle - segment.startAngle);
}

function angleToValue(angle, segment) {
    const ratio = (angle - segment.startAngle) / (segment.endAngle - segment.startAngle);
    return Math.round(ratio * (segment.range[1] - segment.range[0]) + segment.range[0]);
}

function updateFilterDisplays() {
    d3.select(".age-text")
        .text(`${circularFilters.Age.min} - ${circularFilters.Age.max} yrs`);

    d3.select(".weight-text")
        .text(`${circularFilters.Weight.min} - ${circularFilters.Weight.max} kg`);
}

updateFilterDisplays();

function updateWeightDisplay() {
    weightValue.textContent = `${weightFilterMin} - ${weightFilterMax}`;
}

function splitBySemicolon(value) {
    return value ? value.split(";").map(v => v.trim()).filter(Boolean) : [];
}

function updateTreemap() {
    const selectedReports = parseInt(reportSlider.value, 10);
    const filteredData = filterDataByReportLimitAndDateRange(originalData, selectedReports, selectedStartDate, selectedEndDate);
    drawTreemap(filteredData);
}

function parseDateString(dateString) {
    if (!dateString || dateString.length < 8) return null;
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10);
    const day = parseInt(dateString.substring(6, 8), 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    
    date.setHours(0, 0, 0, 0);
    return date;
}

d3.csv("data.csv", function (d, i) {
    d.StartDate = parseDateString(d.StartDate);
    d.EndDate = parseDateString(d.EndDate);
    d.id = d.SafetyreportID;

    if (d.PatientSex === '1') {
        d.PatientSex = 'male';
    } else if (d.PatientSex === '2') {
        d.PatientSex = 'female';
    } else {
        d.PatientSex = 'unknown';
    }
    d.PatientAge = d.PatientAge || 'unknown';
    d.PatientWeight = d.PatientWeight || 'unknown';

    d.Outcome = d.Outcome.trim();
    if (!outcomeColors.hasOwnProperty(d.Outcome)) {
        d.Outcome = "Other";
    }
    d.ReportCountry = d.ReportCountry || 'Unknown Country';

    return d;
}).then(function (data) {

    originalData = data;
    const allStartDates = data.map(d => d.StartDate).filter(d => d != null);
    const allEndDates = data.map(d => d.EndDate).filter(d => d != null);
    minDate = d3.min(allStartDates);
    maxDate = d3.max(allEndDates);

    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);

    selectedStartDate = minDate;
    selectedEndDate = maxDate;

    groupedData = groupDataByCountryAndProduct(data);
    totalReports = data.length;

    initializeSlider(totalReports);
    initializeDateRangeSlider();
    drawLegend();
    updateTreemap();

    weeklyReportCounts = computeWeeklyReportCounts(originalData, minDate, maxDate);

    const densityColorScaleLocal = createColorScale(weeklyReportCounts);
    densityColorScale = densityColorScaleLocal;

    densitySvg = timelineBar.append("svg")
        .attr("width", "100%")
        .attr("height", "40")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        .style("pointer-events", "none");

    timelineWidthGlobal = timelineBar.node().getBoundingClientRect().width;

    drawDensityGradient(
        weeklyReportCounts,
        densityColorScale,
        densitySvg,
        timelineWidthGlobal,
        40
    );

    drawDensityGradientResponsive();

    window.addEventListener('resize', drawDensityGradientResponsive);

    function splitAndTrim(value) {
        return value ? value.split(";").map(v => v.trim()).filter(Boolean) : [];
    }

    const reactionCounts = {};
    originalData.forEach(report => {
        splitAndTrim(report.Reactions).forEach(reaction => {
            if (reaction) {
                reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
            }
        });
    });

    const indicationCounts = {};
    originalData.forEach(report => {
        splitAndTrim(report.DrugIndication).forEach(indication => {
            if (indication) {
                indicationCounts[indication] = (indicationCounts[indication] || 0) + 1;
            }
        });
    });

    window.totalReactionCounts = reactionCounts;
    window.totalIndicationCounts = indicationCounts;

    const reactionMaxCount = d3.max(Object.values(window.totalReactionCounts)) || 1;
const indicationMaxCount = d3.max(Object.values(window.totalIndicationCounts)) || 1;

    const maxAllowed = 200;

    const cappedReactionMax = Math.min(reactionMaxCount, maxAllowed);
    const cappedIndicationMax = Math.min(indicationMaxCount, maxAllowed);

    reactionColorScale = d3.scaleLinear()
        .domain([0, cappedReactionMax / 2, cappedReactionMax])
        .range(["#f9dede", "#ff9d9d", "#ff7d7d"])
        .clamp(true)
        .interpolate(d3.interpolateHcl);

    indicationColorScale = d3.scaleLinear()
        .domain([0, cappedIndicationMax / 2, cappedIndicationMax])
        .range(["#d3edd3", "#92c792", "#64c864"])
        .clamp(true)
        .interpolate(d3.interpolateHcl);

        document.getElementById('search-bar').addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            stopAllBeating();
        
            d3.selectAll(".product-outer").classed("highlight", false).classed("beating", false);
        
            const dropdown = d3.select("#search-dropdown");
        
            if (query) {
                let totalMatches = 0;
                let productMatches = 0;
                let countryMatches = 0;
                let reactionMatches = 0;
                let indicationMatches = 0;
                let genericNameMatches = 0;
                let brandNameMatches = 0;
        
                const matchedProducts = new Set();
                const matchedCountries = new Set();
                const matchedReactions = new Set();
                const matchedIndications = new Set();
                const matchedGenericNames = new Set();
                const matchedBrandNames = new Set();
        
                d3.selectAll(".product").each(function (d) {
                    const productName = d.data.key.toLowerCase();
                    const countryName = d.parent.data.key.toLowerCase();
        
                    let isMatch = false;
        
                    if (productName.includes(query)) {
                        matchedProducts.add(d.data.key);
                        isMatch = true;
                    }
        
                    if (countryName.includes(query)) {
                        matchedCountries.add(d.parent.data.key);
                        isMatch = true;
                    }
        
                    const genericNames = d.data.reports
                        .map(report => splitBySemicolon(report.GenericName))
                        .flat()
                        .map(name => name.toLowerCase());
        
                    genericNames.forEach(genericName => {
                        if (genericName.includes(query)) {
                            matchedGenericNames.add(genericName);
                            matchedProducts.add(d.data.key);
                        }
                    });
        
                    const brandNames = d.data.reports
                        .map(report => splitBySemicolon(report.BrandName))
                        .flat()
                        .map(name => name.toLowerCase());
        
                    brandNames.forEach(brandName => {
                        if (brandName.includes(query)) {
                            matchedBrandNames.add(brandName);
                            matchedProducts.add(d.data.key);
                        }
                    });
        
                    if (isMatch) {
                        const productRect = d3.select(this).select(".product-outer");
                        productRect.classed("highlight", true).classed("beating", true);
                    }
                });
        
                originalData.forEach(report => {
                    const reactions = splitBySemicolon(report.Reactions).map(r => r.toLowerCase());
                    reactions.forEach(reaction => {
                        if (reaction.includes(query)) {
                            matchedReactions.add(reaction);
                            matchedProducts.add(report.Medicinalproduct);
                        }
                    });
        
                    const indications = splitBySemicolon(report.DrugIndication).map(i => i.toLowerCase());
                    indications.forEach(indication => {
                        if (indication.includes(query)) {
                            matchedIndications.add(indication);
                            matchedProducts.add(report.Medicinalproduct);
                        }
                    });
                });
        
                productMatches = matchedProducts.size;
                countryMatches = matchedCountries.size;
                reactionMatches = matchedReactions.size;
                indicationMatches = matchedIndications.size;
                genericNameMatches = matchedGenericNames.size;
                brandNameMatches = matchedBrandNames.size;
                totalMatches = productMatches + countryMatches + reactionMatches + indicationMatches + genericNameMatches + brandNameMatches;
        
                matchedProducts.forEach(product => {
                    d3.selectAll(".product-outer")
                        .filter(function (d) { return d.data.key === product; })
                        .classed("beating", true);
                });
                updateFadedState();
        
                let dropdownContent = `<strong>${totalMatches} match${totalMatches !== 1 ? 'es' : ''} found</strong><br/>`;
        
                if (productMatches > 0) {
                    dropdownContent += `${productMatches} Medicinal Product${productMatches !== 1 ? 's' : ''}<br/>`;
                }
                if (countryMatches > 0) {
                    dropdownContent += `${countryMatches} ${countryMatches !== 1 ? 'Countries' : 'Country'}<br/>`;
                }
                if (reactionMatches > 0) {
                    dropdownContent += `${reactionMatches} Reaction${reactionMatches !== 1 ? 's' : ''}<br/>`;
                }
                if (indicationMatches > 0) {
                    dropdownContent += `${indicationMatches} Indication${indicationMatches !== 1 ? 's' : ''}<br/>`;
                }
                if (brandNameMatches > 0) {
                    dropdownContent += `${brandNameMatches} Brand Name${brandNameMatches !== 1 ? 's' : ''}<br/>`;
                }
        
                dropdown.html(dropdownContent)
                    .style("display", "block")
                    .style("background", "#fff")
                    .style("border", "1px solid #ccc")
                    .style("padding", "10px")
                    .style("position", "absolute")
                    .style("width", "160px")
                    .style("box-shadow", "0px 4px 8px rgba(0, 0, 0, 0.1)")
                    .style("z-index", "1000")
                    .style("top", (document.getElementById("search-bar").offsetTop + document.getElementById("search-bar").offsetHeight + 5) + "px")
                    .style("left", document.getElementById("search-bar").offsetLeft + "px");
            } else {
                d3.select("#search-dropdown").style("display", "none");
            }
        });
        

    document.addEventListener('click', function(event) {
        const searchBar = document.getElementById('search-bar');
        const dropdown = document.getElementById('search-dropdown');
        if (!searchBar.contains(event.target) && !dropdown.contains(event.target)) {
            d3.select("#search-dropdown").style("display", "none");
        }
    });
});

function filterDataByReportLimitAndDateRange(data, reportLimit, selectedStartDate, selectedEndDate) {

    const filteredReports = data.filter(report => {
        const reportEndDate = report.EndDate;
        const dateValid = (!reportEndDate || (reportEndDate >= selectedStartDate && reportEndDate <= selectedEndDate));

        if (!dateValid) return false;

        if (circularFilters.Age.min > 1 || circularFilters.Age.max < 100) {
            if (report.PatientAge === 'unknown') return false;
            const age = parseInt(report.PatientAge, 10);
            if (isNaN(age) || age < circularFilters.Age.min || age > circularFilters.Age.max) return false;
        }

        if (circularFilters.Weight.min > 1 || circularFilters.Weight.max < 200) {
            if (report.PatientWeight === 'unknown') return false;
            const weight = parseFloat(report.PatientWeight);
            if (isNaN(weight) || weight < circularFilters.Weight.min || weight > circularFilters.Weight.max) return false;
        }

        const sexFilter = circularFilters.Sex;
        const sexSelected = [];
        if (sexFilter.male) sexSelected.push('male');
        if (sexFilter.female) sexSelected.push('female');

        if (sexSelected.length === 0) {
        } else if (sexSelected.length === 2) {
        } else {
            if (report.PatientSex === 'unknown' || report.PatientSex !== sexSelected[0]) return false;
        }

        if (selectedOutcome) {
            if (report.Outcome !== selectedOutcome) {
                return false;
            }
        }        

        return true;
    });

    const limitedReports = filteredReports.slice(0, reportLimit);
    let groupedData = groupDataByCountryAndProduct(limitedReports);
    return groupedData;
}

function computeWeeklyReportCounts(data, minDate, maxDate) {
    const weeks = d3.timeMonday.range(minDate, d3.timeMonday.offset(maxDate, 1));

    const weekCounts = weeks.map(weekStart => {
        const weekEnd = d3.timeSunday.offset(weekStart, 1);
        const count = data.filter(report => {
            return report.EndDate && report.EndDate >= weekStart && report.EndDate < weekEnd;
        }).length;
        return { weekStart, count };
    });

    return weekCounts;
}

function createColorScale(weekCounts) {
    const maxCount = d3.max(weekCounts, d => d.count) || 1;
    
    const colorScale = d3.scaleLinear()
        .domain([0, maxCount / 2, maxCount])
        .range(["#e0f7fa", "#26c6da", "#01579b"])
        .interpolate(d3.interpolateHcl);

    return colorScale;
}

function drawDensityGradient(weekCounts, colorScale, svg, width, height) {
    svg.select("defs").remove();
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "density-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    const totalDuration = maxDate - minDate;

    weekCounts.forEach((d) => {
        const offset = ((d.weekStart - minDate) / totalDuration) * 100;
        gradient.append("stop")
            .attr("offset", `${offset}%`)
            .attr("stop-color", colorScale(d.count));
    });

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#density-gradient)");
}

function drawDensityGradientResponsive() {
    timelineWidthGlobal = timelineBar.node().getBoundingClientRect().width;
    const densityHeight = 18;

    densitySvg.attr("width", timelineWidthGlobal)
              .attr("height", densityHeight);

    drawDensityGradient(
        weeklyReportCounts,
        densityColorScale,
        densitySvg,
        timelineWidthGlobal,
        densityHeight
    );
}

function formatDate(date) {
    if (!(date instanceof Date)) return '';
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function initializeDateRangeSlider() {
    const leftHandle = document.createElement('div');
    const rightHandle = document.createElement('div');
    const selectedRange = document.createElement('div');
    const leftDateDisplay = document.createElement('div');
    const rightDateDisplay = document.createElement('div');

    leftHandle.id = 'left-handle';
    rightHandle.id = 'right-handle';
    selectedRange.id = 'selected-range';
    leftDateDisplay.id = 'left-date-display';
    rightDateDisplay.id = 'right-date-display';

    leftHandle.className = 'handle';
    rightHandle.className = 'handle';
    leftDateDisplay.className = 'date-display';
    rightDateDisplay.className = 'date-display';

    timelineBar.node().appendChild(selectedRange);
    timelineBar.node().appendChild(leftHandle);
    timelineBar.node().appendChild(rightHandle);
    timelineBar.node().appendChild(leftDateDisplay);
    timelineBar.node().appendChild(rightDateDisplay);

    leftHandle.setAttribute('title', 'Start Date Slider');
    rightHandle.setAttribute('title', 'End Date Slider');

    timelineWidthGlobal = timelineBar.node().getBoundingClientRect().width;

    leftHandle.style.left = '4px';
    rightHandle.style.left = `${timelineWidthGlobal - 6}px`;

    updateSelectedRange();

    let activeHandle = null;
    let startX = 0;
    let handleStartX = 0;

    leftHandle.addEventListener('mousedown', (e) => {
        activeHandle = leftHandle;
        startX = e.clientX;
        handleStartX = parseInt(leftHandle.style.left);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    rightHandle.addEventListener('mousedown', (e) => {
        activeHandle = rightHandle;
        startX = e.clientX;
        handleStartX = parseInt(rightHandle.style.left);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    document.getElementById('content-container').appendChild(leftDateDisplay);
    document.getElementById('content-container').appendChild(rightDateDisplay);

    function handleMouseMove(e) {
        if (!activeHandle) return;
        const deltaX = e.clientX - startX;
        let newLeft = handleStartX + deltaX;

        if (newLeft < 0) newLeft = 0;
        if (newLeft > timelineWidthGlobal - 16) newLeft = timelineWidthGlobal - 16;

        if (activeHandle === leftHandle) {
            const rightHandleLeft = parseInt(rightHandle.style.left);
            if (newLeft > rightHandleLeft - 16) {
                newLeft = rightHandleLeft - 16;
            }
        } else if (activeHandle === rightHandle) {
            const leftHandleLeft = parseInt(leftHandle.style.left);
            if (newLeft < leftHandleLeft + 16) {
                newLeft = leftHandleLeft + 16;
            }
        }

        activeHandle.style.left = `${newLeft}px`;

        updateSelectedRange();
    }

    function handleMouseUp(e) {
        activeHandle = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        updateTreemap();
    }

    function updateSelectedRange() {
        const leftHandleLeft = parseInt(leftHandle.style.left, 10);
        const rightHandleLeft = parseInt(rightHandle.style.left, 10);
    
        selectedStartDate = calculateDateFromX(leftHandleLeft + 8);
        selectedEndDate = calculateDateFromX(rightHandleLeft + 8);
    
        selectedStartDate.setHours(0, 0, 0, 0);
        selectedEndDate.setHours(0, 0, 0, 0);
    
        const rangeLeft = leftHandleLeft + 8;
        const rangeWidth = (rightHandleLeft + 8) - rangeLeft;
    
        selectedRange.style.left = `${rangeLeft}px`;
        selectedRange.style.width = `${rangeWidth}px`;
    
        leftDateDisplay.textContent = formatDate(selectedStartDate);
        rightDateDisplay.textContent = formatDate(selectedEndDate);
    
        const timelineBarRect = timelineBar.node().getBoundingClientRect();
    
        leftDateDisplay.style.position = 'absolute';
        leftDateDisplay.style.top = (timelineBarRect.bottom + 5) + 'px';
        leftDateDisplay.style.left = (timelineBarRect.left + leftHandleLeft) + 'px';
    
        rightDateDisplay.style.position = 'absolute';
        rightDateDisplay.style.top = (timelineBarRect.bottom + 5) + 'px';
        rightDateDisplay.style.left = (timelineBarRect.left + rightHandleLeft) + 'px';
    }    
    

    function calculateDateFromX(x) {
        const percentage = x / timelineWidthGlobal;
        const timeDiff = maxDate - minDate;
        const date = new Date(minDate.getTime() + percentage * timeDiff);
        date.setHours(0, 0, 0, 0);
        return date;
    }
}

function groupDataByCountryAndProduct(data) {
    return Array.from(d3.group(data, d => d.ReportCountry), ([key, values]) => ({
        key,
        values: Array.from(d3.group(values, d => d.Medicinalproduct), ([key, values]) => ({
            key,
            value: values.length,
            reports: values
        })).sort((a, b) => d3.descending(a.value, b.value))
    })).sort((a, b) => d3.ascending(a.key, b.key));
}

function initializeSlider(maxReports) {
    const roundedMaxReports = Math.ceil(maxReports / 100) * 100;

    const reportSlider = document.getElementById("report-slider");
    reportSlider.max = roundedMaxReports;
    reportSlider.value = roundedMaxReports;
    reportSlider.step = 100;
    document.getElementById("report-count").textContent = `${roundedMaxReports} reports`;

}

function drawTreemap(data) {
    zoomGroup.selectAll("*").remove();
    if (!data || data.length === 0) return;
    const root = d3.hierarchy({ key: "World", values: data }, d => d.values)
        .sum(d => d.value)
        .sort(function(a, b) {
            if (a.depth === b.depth && a.depth === 1) {
                return d3.ascending(a.data.key, b.data.key);
            } else if (a.depth === b.depth && a.depth === 2) {
                return d3.descending(a.value, b.data.key) || d3.ascending(a.data.key, b.data.key);
            } else {
                return 0;
            }
        });

    const countryPadding = 2;
    const productMargin = 3;
    const topPadding = 14;

    const treemap = d3.treemap()
        .size([outerWidth, outerHeight])
        .paddingOuter(countryPadding)
        .paddingInner(productMargin)
        .paddingTop(function(d) {
            if (d.depth === 1) {
                const height = d.y1 - d.y0;
                return Math.min(topPadding, height);
            } else {
                return 0;
            }
        })
        .tile(d3.treemapBinary);
    treemap(root);

    const countries = zoomGroup.selectAll(".country")
        .data(root.children)
        .enter()
        .append("g")
        .attr("class", "country")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    countries.append("rect")
        .attr("width", d => Math.floor(d.x1 - d.x0))
        .attr("height", d => Math.floor(d.y1 - d.y0))
        .attr("fill", "#ffffff")
        .attr("stroke", "#000000")
        .attr("stroke-width", 0.2)
        .style("cursor","pointer")
        .on("mouseover", function() { d3.select(this).attr("fill", "#f0f0f0"); })
        .on("mouseout", function() { d3.select(this).attr("fill", "#fff"); })
        .on("click", function(event, d) {
            if (selectedCountryForFilter === d.data.key) {
                selectedCountryForFilter = null;
                const selectedReports = parseInt(reportSlider.value, 10);
                const filteredData = filterDataByReportLimitAndDateRange(originalData, selectedReports, selectedStartDate, selectedEndDate);
                drawTreemap(filteredData);
            } else {
                selectedCountryForFilter = d.data.key;
                const filteredData = originalData.filter(r => r.ReportCountry === selectedCountryForFilter);
                const selectedReports = parseInt(reportSlider.value, 10);
                const grouped = groupDataByCountryAndProduct(filteredData.slice(0, selectedReports));
                drawTreemap(grouped);
            }
        })
        .append("title")
        .text(function(d) { return d.data.key; });

    countries.append("text")
        .attr("x", function(d) {
            return (d.x1 - d.x0) / 2;
        })
        .attr("y", function(d) {
            const height = d.y1 - d.y0;
            const paddingTop = Math.min(topPadding, height * 0.05);
            return Math.max(paddingTop / 50, 6);
        })
        .attr("dy", "0.35em")
        .text(function(d) {
            const width = d.x1 - d.x0;
            const approxCharWidth = 4;
            const maxChars = Math.floor(width / approxCharWidth);
            let text = d.data.key;
            if (text.length > maxChars) {
                text = text.slice(0, maxChars - 3) + '...';
            }
            return text;
        })
        .attr("font-size", function(d) {
            const width = d.x1 - d.x0;
            let fontSize = Math.min((width / d.data.key.length) * 1.5, 8);
            fontSize = Math.max(fontSize, 5);
            return fontSize + "px";
        })
        .attr("text-anchor", "middle")
        .style("cursor","pointer")
        .on("click", function(event, d) {
            if (selectedCountryForFilter === d.data.key) {
                selectedCountryForFilter = null;
                const selectedReports = parseInt(reportSlider.value, 10);
                const filteredData = filterDataByReportLimitAndDateRange(originalData, selectedReports, selectedStartDate, selectedEndDate);
                drawTreemap(filteredData);
            } else {
                selectedCountryForFilter = d.data.key;
                const filteredData = originalData.filter(r => r.ReportCountry === selectedCountryForFilter);
                const selectedReports = parseInt(reportSlider.value, 10);
                const grouped = groupDataByCountryAndProduct(filteredData.slice(0, selectedReports));
                drawTreemap(grouped);
            }
        })
        .append("title")
        .text(function(d) { return d.data.key; });

    const products = countries.selectAll(".product")
        .data(d => d.children)
        .enter()
        .append("g")
        .attr("class", "product")
        .attr("transform", d => `translate(${d.x0 - d.parent.x0},${d.y0 - d.parent.y0})`)
        .on("click", function(event, d) {
            try {
                stopAllBeating();
                triggerBeatingForProduct([d.data.key]);                
                updateFadedState();
                if (d.data.reports && d.data.reports.length > 0) {
                    const firstReport = d.data.reports[0];
                    currentCountry = firstReport.ReportCountry || 'Unknown Country';
                } else {
                    currentCountry = 'Unknown Country';
                }
                showProductInfo(d.data);
            } catch (error) {
                console.error("Error in treemap click handler:", error);
            }
        });

    products.append("rect")
        .datum(d => d)
        .attr("class", "product-outer")
        .attr("width", d => Math.floor(d.x1 - d.x0))
        .attr("height", d => Math.floor(d.y1 - d.y0))
        .attr("fill", "#ffffff")
        .attr("stroke", "#000000")
        .attr("stroke-width", 0)
        .style("cursor","pointer");

    products.each(function(d) {
        const productG = d3.select(this);
        const productHeight = d.y1 - d.y0;
        const productWidth = d.x1 - d.x0;
        const numReports = d.data.reports.length;
        if (numReports > 0) {
            const maxReportsToShow = numReports;
            const reportHeight = productHeight / maxReportsToShow;
            d.data.reports.slice(0, maxReportsToShow).forEach((report, i) => {
                productG.append("rect")
                    .attr("class", "report-rect")
                    .attr("x", 0)
                    .attr("y", i * reportHeight)
                    .attr("width", productWidth)
                    .attr("height", reportHeight)
                    .attr("fill", outcomeColors[report.Outcome] || "#ccc")
                    .attr("stroke", outcomeColors[report.Outcome] || "#ccc")
                    .attr("stroke-width", 2)
                    .style("cursor","pointer")
                    .on("mouseover", function (event) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 1);
                        tooltip.html(`Med Prd: ${d.data.key}`)
                            .style("left", `${event.pageX + 5}px`)
                            .style("top", `${event.pageY - 28}px`);
                    })
                    .on("mouseout", function () {
                        tooltip.transition().duration(500).style("opacity", 0);
                    });
            });
        }

        const allBrandNames = new Set();
        d.data.reports.forEach(report => {
            splitBySemicolon(report.BrandName).forEach(name => allBrandNames.add(name));
        });
        const dotGroup = productG.append("g").attr("class", "dot-group");
        const dotSize = Math.min(productHeight, productWidth) / 10;
        const centerX = productWidth / 2;
        const centerY = productHeight / 2;
        let angle = 0;
        let radius = dotSize * 2.5;

        const placeDotsRadially = (names, color) => {
            names.forEach((name, i) => {
                if (name) {
                    const nextX = centerX + radius * Math.cos(angle);
                    const nextY = centerY + radius * Math.sin(angle);
                    if (nextX - dotSize > 0 && nextX + dotSize < productWidth &&
                        nextY - dotSize > 0 && nextY + dotSize < productHeight) {
                        dotGroup.append("circle")
                            .attr("cx", nextX)
                            .attr("cy", nextY)
                            .attr("r", dotSize)
                            .style("fill", color)
                            .style("cursor","pointer")
                            .on("mouseover", (event) => {
                                tooltip.transition()
                                    .duration(200)
                                    .style("opacity", 1);
                                tooltip.html(`${name}`)
                                    .style("left", `${event.pageX + 5}px`)
                                    .style("top", `${event.pageY - 28}px`);
                            })
                            .on("mouseout", () => {
                                tooltip.transition().duration(500).style("opacity", 0);
                            });
                        angle += Math.PI / 2;
                        if (angle >= Math.PI * 2) {
                            angle = 0;
                            radius += dotSize * 2.5;
                        }
                    }
                }
            });
        };
        placeDotsRadially(Array.from(allBrandNames), "blue");
    });
}


function drawLegend() {
    d3.select("#legend-container").selectAll("*").remove();

    const legendSvg = d3.select("#legend-container")
        .append("svg")
        .attr("width", outerWidth + margin.left + margin.right)
        .attr("height", 35)
        .style("margin-bottom", "0px");

    const legendGroup = legendSvg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${outerWidth / 4}, 20)`);

    legendGroup.append("circle")
        .attr("cx", -75)
        .attr("cy", 0)
        .attr("r", 10)
        .attr("fill", "blue");

    legendGroup.append("text")
        .attr("x", -60)
        .attr("y", 5)
        .text("Brand Names")
        .style("font-size", "12px")
        .attr("text-anchor", "start");

    const outcomeLegendGroup = legendGroup.append("g")
        .attr("class", "outcome-legend")
        .attr("transform", `translate(90, 0)`);

    const legendItems = outcomeLegendGroup.selectAll(".legend-item")
        .data(Object.keys(outcomeColors))
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 135}, 0)`)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            if (selectedOutcome === d) {
                selectedOutcome = null;
            } else {
                selectedOutcome = d;
            }
            updateTreemap();
            drawLegend();
        });

    legendItems.append("rect")
        .attr("x", 0)
        .attr("y", -10)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => outcomeColors[d])
        .attr("stroke", d => (selectedOutcome === d ? "#000" : "none"))
        .attr("stroke-width", d => (selectedOutcome === d ? 2 : 0));

    legendItems.append("text")
        .attr("x", 25)
        .attr("y", 5)
        .text(d => d)
        .style("font-size", "12px")
        .attr("text-anchor", "start");
}


function stopAllBeating() {
    d3.selectAll(".beating").classed("beating", false);
    updateFadedState();
}

function triggerBeatingForProduct(products) {
    stopAllBeating();
    const normalizedProducts = products.map(p => p.trim().toLowerCase());

    d3.selectAll(".product-outer").filter(function (d) {
        const productKey = d.data.key.trim().toLowerCase();
        return normalizedProducts.includes(productKey);
    }).classed("beating", true);

    updateFadedState();
}

function showProductInfo(productData) {
    currentProductData = productData;
    d3.select("#sankey-container").html("");

    let reportsToUse;

    if (isCountryFilterActive) {
        reportsToUse = productData.reports;
        countryFilterMessage.textContent = `${currentCountry}`;
        toggleCountryFilterBtn.textContent = 'Global Data';
    } else {
        const targetProductName = productData.key.trim().toLowerCase();
        reportsToUse = originalData.filter(report =>
            report.Medicinalproduct.trim().toLowerCase() === targetProductName
        );
        countryFilterMessage.textContent = '';
        toggleCountryFilterBtn.textContent = 'Country Specific';
    }

    window.currentReportsToUse = reportsToUse;

    const indicationCounts = {};
    const reactionCounts = {};

    if (reportsToUse && reportsToUse.length > 0) {
        reportsToUse.forEach(report => {
            splitBySemicolon(report.DrugIndication).forEach(indication => {
                if (indication) {
                    const normalizedIndication = indication.trim();
                    indicationCounts[normalizedIndication] = (indicationCounts[normalizedIndication] || 0) + 1;
                }
            });
            splitBySemicolon(report.Reactions).forEach(reaction => {
                if (reaction) {
                    const normalizedReaction = reaction.trim();
                    reactionCounts[normalizedReaction] = (reactionCounts[normalizedReaction] || 0) + 1;
                }
            });
        });
    }

    const allIndications = Object.keys(indicationCounts).sort();
    const allReactions = Object.keys(reactionCounts).sort();

    const nodes = [
        ...allIndications.map(name => ({ id: `ind_${name}`, name, type: 'indication' })),
        { id: `prod_${productData.key}`, name: productData.key, type: 'product', clickedOnce: false },
        ...allReactions.map(name => ({ id: `reac_${name}`, name, type: 'reaction' })),
    ];

    const links = [
        ...allIndications.map(name => ({
            source: `ind_${name}`,
            target: `prod_${productData.key}`,
            value: indicationCounts[name],
            originalValue: indicationCounts[name],
        })),
        ...allReactions.map(name => ({
            source: `prod_${productData.key}`,
            target: `reac_${name}`,
            value: reactionCounts[name],
            originalValue: reactionCounts[name],
        })),
    ];

    const productNode = nodes.find(n => n.type === 'product');
    productNode.indicationCount = allIndications.length;
    productNode.reactionCount = allReactions.length;

    drawSankeyDiagram(nodes, links);
}


const internalMargin = { left: 10, right: 100 };

function drawSankeyDiagram(nodesData, linksData) {
    const sankeyContainer = document.getElementById("sankey-container");
    const sankeyWidth = window.innerWidth * 0.88;
    const sankeyHeight = Math.max(40000, sankeyContainer.clientHeight || 80000);
  
    const sankeySvg = d3.select("#sankey-container")
        .append("svg")
        .attr("width", sankeyWidth)
        .attr("height", sankeyHeight)
        .append("g");
  
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(20)
        .extent([[internalMargin.left, 1], [sankeyWidth - internalMargin.right, sankeyHeight - 6]])
        .nodeAlign(d3.sankeyCenter)
        .nodeSort(null);
  
    let graph = {
        nodes: nodesData.map(d => Object.assign({}, d)),
        links: linksData.map(d => Object.assign({}, d))
    };
  
    drawSankeyGraph(graph);

    function drawSankeyGraph(graph) {
        sankeySvg.selectAll("*").remove();
        const idToNode = new Map(graph.nodes.map(d => [d.id, d]));
        graph.links.forEach(link => {
            link.source = idToNode.get(link.source.id || link.source);
            link.target = idToNode.get(link.target.id || link.target);
        });
        assignNodeLayers(graph.nodes);
        adjustLayers(graph.nodes, sankeyWidth);
        const nodeWidth = 20;
        const minNodeHeight = 20;
        const maxNodeHeight = 800;
        const nodePadding = 15;
        const numberOfNodes = graph.nodes.length;
        let sankeyHeight = numberOfNodes * (minNodeHeight + nodePadding) + 80;
        const sankey = d3.sankey()
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding)
            .extent([[internalMargin.left, 1], [sankeyWidth - internalMargin.right, sankeyHeight - 1]])
            .nodeAlign(d3.sankeyCenter)
            .nodeSort(null);
        sankey(graph);
        let nodeHeights = graph.nodes.map(d => d.y1 - d.y0);
        let minActualNodeHeight = d3.min(nodeHeights);
        let maxActualNodeHeight = d3.max(nodeHeights);
        let valueScalingFactor = 1;
        if (minActualNodeHeight < minNodeHeight) {
            const minHeightScalingFactor = minNodeHeight / minActualNodeHeight;
            valueScalingFactor = Math.max(valueScalingFactor, minHeightScalingFactor);
        }
        if (maxActualNodeHeight > maxNodeHeight) {
            const maxHeightScalingFactor = maxNodeHeight / maxActualNodeHeight;
            valueScalingFactor = Math.min(valueScalingFactor, maxHeightScalingFactor);
        }
        if (valueScalingFactor !== 1) {
            graph.links.forEach(link => { link.value *= valueScalingFactor; });
            graph.nodes.forEach(node => { node.value = 0; });
            graph.links.forEach(link => {
                link.source.value += link.value;
                link.target.value += link.value;
            });
            sankey(graph);
            nodeHeights = graph.nodes.map(d => d.y1 - d.y0);
            minActualNodeHeight = d3.min(nodeHeights);
            maxActualNodeHeight = d3.max(nodeHeights);
        }
        if (minActualNodeHeight < minNodeHeight) {
            const heightScalingFactor = minNodeHeight / minActualNodeHeight;
            sankeyHeight *= heightScalingFactor;
            sankey.extent([[internalMargin.left, 1], [sankeyWidth - internalMargin.right, sankeyHeight - 1]]);
            sankey(graph);
        }
        sankeySvg.attr("height", sankeyHeight);
        const diagramWidth = d3.max(graph.nodes, d => d.x1) - d3.min(graph.nodes, d => d.x0);
        const diagramGroup = sankeySvg.append("g")
            .attr("transform", `translate(${(sankeyWidth - (d3.max(graph.nodes, d => d.x1) - d3.min(graph.nodes, d => d.x0))) / 2},0)`);
        drawSankeyElements(diagramGroup, graph);
        drawSankeyElements(diagramGroup, graph);
        if (isToggled) {
            diagramGroup.attr("transform", diagramGroup.attr("transform") + " scale(0.5)");
            sankeyZoom.scaleExtent([0.5, 0.5]);
        } else {
            const currentTransform = diagramGroup.attr("transform");
            diagramGroup.attr("transform", currentTransform.replace(" scale(0.5)", ""));
            sankeyZoom.scaleExtent([0.5, 12]);
        }
        d3.select("#sankey-container svg").call(sankeyZoom);
    }    
    
    
    function assignNodeLayers(nodes) {
        nodes.forEach(node => {
            if (node.type === "report_detail") {
                if (node.associatedType === "indication") {
                    node.layer = 0;
                } else if (node.associatedType === "reaction") {
                    node.layer = 4;
                }
            } else if (node.type === "indication") {
                node.layer = 1;
            } else if (node.type === "product") {
                node.layer = 2;
            } else if (node.type === "reaction") {
                node.layer = 3;
            }
        });
    }

    function adjustLayers(nodes, sankeyWidth) {
        const totalLayers = 5;
        const maxLayerWidth = 200;
        const layerWidth = Math.min((sankeyWidth - 40) / totalLayers, maxLayerWidth);
    
        const centerX = sankeyWidth / 2 - 20 / 2;
    
        nodes.forEach(node => {
            node.x0 = centerX + (node.layer - 2) * layerWidth;
            node.x1 = node.x0 + 20;
        });
    }
    
    function toggleNodeExpansion(nodeData, graph) {
        if (nodeData.clickedOnce) {
            collapseNode(nodeData, graph);
            nodeData.clickedOnce = false;
        } else {
            graph.nodes.forEach(n => {
                if (n.type === "indication" || n.type === "reaction") {
                    n.clickedOnce = false;
                }
            });
            expandNode(nodeData, graph);
            nodeData.clickedOnce = true;
        }
    }

    function expandNode(nodeData, graph) {
        sankeyState.expandedNode = nodeData.id;
    
        const reports = getReportsByNode(nodeData);
    
        reports.forEach(report => {
            const reportId = report.SafetyreportID;
    
            const reportDetailNode = {
                id: `detail_${reportId}`,
                name: `${reportId}`,
                type: 'report_detail',
                associatedType: nodeData.type,
                reportId: reportId,
                report: report
            };
    
            if (!graph.nodes.find(n => n.id === reportDetailNode.id)) {
                graph.nodes.push(reportDetailNode);
            }
    
            if (nodeData.type === "indication") {
                graph.links.push({
                    source: reportDetailNode.id,
                    target: nodeData.id,
                    value: 1,
                    report: report
                });
            } else if (nodeData.type === "reaction") {
                graph.links.push({
                    source: nodeData.id,
                    target: reportDetailNode.id,
                    value: 1,
                    report: report
                });
            }
        });
    
        graph.nodes = Array.from(new Map(graph.nodes.map(node => [node.id, node])).values());
    
        const linkSet = new Set();
        graph.links = graph.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const key = `${sourceId}->${targetId}`;
            if (linkSet.has(key)) {
                return false;
            } else {
                linkSet.add(key);
                return true;
            }
        });
    
        drawSankeyGraph(graph);
    }       
    
    function collapseNode(nodeData, graph) {
        sankeyState.expandedNode = null;

        graph.nodes = graph.nodes.filter(node => 
            !node.id.startsWith('detail_')
        );

        graph.links = graph.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return !(sourceId.startsWith('detail_') || targetId.startsWith('detail_'));
        });

        drawSankeyGraph(graph);
    }

    function drawSankeyElements(diagramGroup, graph) {
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const link = diagramGroup.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => {
            if ((d.source.type === "report_detail" && (d.target.type === "indication" || d.target.type === "reaction")) ||
                ((d.source.type === "indication" || d.source.type === "reaction") && d.target.type === "report_detail")) {
                const report = d.source.type === "report_detail" ? d.source.report : d.target.report;
                const outcome = report.Outcome;
                return outcomeColors[outcome] || "#87ceeb";
            } else if (d.source.type === "indication" || d.target.type === "indication") {
                const indicationName = d.source.type === "indication" ? d.source.name : d.target.name;
                const count = window.totalIndicationCounts[indicationName] || 0;
                return indicationColorScale(count);
            } else if (d.source.type === "reaction" || d.target.type === "reaction") {
                const reactionName = d.source.type === "reaction" ? d.source.name : d.target.name;
                const count = window.totalReactionCounts[reactionName] || 0;
                return reactionColorScale(count);
            } else {
                return "#888";
            }
        })
        
        .attr("stroke-width", d => d.width)
        .attr("opacity", 0.8)
        .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            const reportCount = d.originalValue;
            tooltip.html(`${reportCount} report${reportCount !== 1 ? 's' : ''}`)
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function () {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    const defs = diagramGroup.append("defs");

    defs.selectAll("path.link-label-path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("class", "link-label-path")
        .attr("id", d => `link-label-path-${d.source.id}-${d.target.id}`)
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", "none");

    const linkLabels = diagramGroup.append("g")
        .attr("class", "link-labels")
        .selectAll("text.link-label")
        .data(graph.links)
        .enter()
        .append("text")
        .attr("class", "link-label")
        .attr("dy", "0.35em")
        .attr("fill", "#000")
        .attr("pointer-events", "none")
        .style("font-size", d => {
            const minFont = 8;
            const maxFont = 12;
            let scaledSize = Math.min(d.width / 2, maxFont);
            
            if (isToggled && (d.source.type === "indication" || d.target.type === "indication" ||
                              d.source.type === "reaction"  || d.target.type === "reaction")) {
                scaledSize = Math.max(14, scaledSize);
            }
            return `${scaledSize}px`;
        })
        .style("font-weight", d => {
            if (isToggled && (d.source.type === "indication" || d.target.type === "indication" ||
                              d.source.type === "reaction"  || d.target.type === "reaction")) {
                return "bold";
            }
            return "normal";
        })        
        .append("textPath")
        .attr("href", d => `#link-label-path-${d.source.id}-${d.target.id}`)
        .attr("startOffset", d => {
            if (d.source.type === "report_detail" && (d.target.type === "indication" || d.target.type === "reaction")) {
                return "5%";
            } else if ((d.source.type === "indication" || d.source.type === "reaction") && d.target.type === "report_detail") {
                return "95%";
            } else if (d.source.type === "indication" && d.target.type === "product") {
                return "5%";
            } else if (d.source.type === "product" && d.target.type === "reaction") {
                return "95%";
            }
            return "50%";
        })
        .attr("text-anchor", d => {
            if (d.source.type === "report_detail" && (d.target.type === "indication" || d.target.type === "reaction")) {
                return "start";
            } else if ((d.source.type === "indication" || d.source.type === "reaction") && d.target.type === "report_detail") {
                return "end";
            } else if (d.source.type === "indication" && d.target.type === "product") {
                return "start";
            } else if (d.source.type === "product" && d.target.type === "reaction") {
                return "end";
            }
            return "middle";
        })
        .text(d => {
            if ((d.source.type === "report_detail" && (d.target.type === "indication" || d.target.type === "reaction")) ||
                ((d.source.type === "indication" || d.source.type === "reaction") && d.target.type === "report_detail")) {
                const report = d.source.type === "report_detail" ? d.source.report : d.target.report;
                return getPatientDetails(report);
            } else if (d.source.type === "indication" && d.target.type === "product") {
                return d.source.name;
            } else if (d.source.type === "product" && d.target.type === "reaction") {
                return d.target.name;
            }
            return "";
        });

    linkLabels.selectAll("textPath")
        .attr("dominant-baseline", "middle")
        .style("pointer-events", "none");
    
        const nodeGroup = diagramGroup.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .enter()
            .append("g")
            .attr("data-node-id", d => d.id);
    
        nodeGroup.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => {
                if (d.type === "product") {
                    return "#d3d3d3";
                }
                if (d.type === "indication") {
                    const count = window.totalIndicationCounts[d.name] || 0;
                    return indicationColorScale(count);
                }
                if (d.type === "reaction") {
                    const count = window.totalReactionCounts[d.name] || 0;
                    return reactionColorScale(count);
                }
                if (d.type === "report_detail") {
                    return outcomeColors[d.report.Outcome] || "#87ceeb";
                }
                return colorScale(d.name);
            })
            .attr("stroke", d => {
                if (d.type === "indication") return "darkgreen";
                if (d.type === "reaction") return "darkred";
                if (d.type === "report_detail") return "#4682b4";
                return "#000";
            })
            .attr("stroke-width", 1)
            .on("click", function (event, d) {
                if (d.type === "indication" || d.type === "reaction") {
                    if (!d3.select(this).classed("beating")) {
                        const associatedProducts = findProductsByReactionOrIndication(d.type, d.name);
                        beatingProducts = associatedProducts;
                        triggerBeatingForProduct(associatedProducts);
                        d3.select(this).classed("beating", true);
                    } else {
                        toggleNodeExpansion(d, graph);
                    }
                } else if (d.type === 'report_detail') {
                    event.stopPropagation();
                    stopAllBeating();
                    updateFadedState();
                    d3.selectAll(".report_detail").classed("beating", false);
                    d3.select(this).classed("beating", true);
                    showReportDetails(event, d);
                }
            })
            .on("mouseover", function (event, d) {
                if (d.type === 'report_detail') {
                }
            })
            .on("mouseout", function(event, d) {
                if (d.type === 'report_detail') {
                    tooltip.transition().duration(500).style("opacity", 0);
                }
            });
            nodeGroup.filter(d => d.type === 'product').append("text")
            .attr("x", d => (d.x0 + d.x1) / 2)
            .attr("y", d => d.y0 + 30)
            .attr("text-anchor", "middle")
            .style("font-size", d => {
                const nodeHeight = d.y1 - d.y0;
                const maxFontSize = 14;
                const fontSize = Math.min(nodeHeight / d.name.length, maxFontSize);
                return `${fontSize}px`;
            })
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`${d.reactionCount} Reactions<br/>${d.indicationCount} Indications`)
                    .style("left", `${event.pageX + 5}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .each(function(nodeData) {
                const textElem = d3.select(this);
                const letters = nodeData.name.split("");
                letters.forEach((letter, i) => {
                    textElem.append("tspan")
                        .attr("x", (nodeData.x0 + nodeData.x1) / 2)
                        .attr("dy", i === 0 ? "0em" : "1.5em")
                        .text(letter);
                });
            })
            .style("fill", "#000");

    }

    function getPatientDetails(report) {
        const details = [];
        if (report.SafetyreportID) {
            details.push(`Report ID: ${report.SafetyreportID}`);
        }
        if (report.PatientSex && report.PatientSex !== 'unknown') {
            details.push(`${capitalize(report.PatientSex)}`);
        }
        if (report.PatientAge && report.PatientAge !== 'unknown') {
            details.push(`${report.PatientAge} years`);
        }
        if (report.PatientWeight && report.PatientWeight !== 'unknown') {
            details.push(`${report.PatientWeight} kg`);
        }
        return details.join(' | ');
    }


    function findProductsByReactionOrIndication(type, name) {
        const products = [];
        const targetName = name.trim().toLowerCase();
    
        originalData.forEach(report => {
            const productName = report.Medicinalproduct.trim();
            const normalizedProductName = productName.toLowerCase();
    
            if (type === "indication") {
                const indications = splitBySemicolon(report.DrugIndication).map(s => s.trim().toLowerCase());
                if (indications.includes(targetName)) {
                    products.push(normalizedProductName);
                }
            } else if (type === "reaction") {
                const reactions = splitBySemicolon(report.Reactions).map(s => s.trim().toLowerCase());
                if (reactions.includes(targetName)) {
                    products.push(normalizedProductName);
                }
            }
        });
    
        return [...new Set(products)];
    }
       

    function getReportsByNode(nodeData) {
        const nodeName = nodeData.name.trim().toLowerCase();
        let datasetToSearch;
    
        if (isCountryFilterActive) {
            datasetToSearch = window.currentReportsToUse;
        } else {
            datasetToSearch = originalData;
        }
    
        if (nodeData.type === 'indication') {
            return datasetToSearch.filter(report => {
                const indications = splitBySemicolon(report.DrugIndication).map(s => s.trim().toLowerCase());
                return indications.includes(nodeName);
            });
        } else if (nodeData.type === 'reaction') {
            return datasetToSearch.filter(report => {
                const reactions = splitBySemicolon(report.Reactions).map(s => s.trim().toLowerCase());
                return reactions.includes(nodeName);
            });
        }
    
        return [];
    }
          

    function capitalize(str) {
        if (typeof str !== 'string') return '';
        if (str.length === 0) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function showReportDetails(event, d) {
        d3.selectAll(".detail-box").remove();
        d3.select("body").on("click.detailBox", null);
    
        const margin = 20;
        const boxWidth = 300;
        const boxHeight = 200;
        const xSpace = 20;
        const ySpace = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
    
        let x = event.clientX + xSpace;
        let y = event.clientY + ySpace;
    
        if (x + boxWidth > viewportWidth) {
            x = event.clientX - boxWidth - xSpace;
        }
    
        if (y + boxHeight > viewportHeight) {
            y = event.clientY - boxHeight - ySpace;
        }
    
        if (x < margin) x = margin;
        if (y < margin) y = margin;
    
        const detailBox = d3.select("body")
            .append("div")
            .attr("class", "detail-box")
            .style("position", "fixed")
            .style("left", `${x}px`)
            .style("top", `${y}px`)
            .style("pointer-events", "auto")
            .style("width", `${boxWidth}px`)
            .style("max-height", `${boxHeight}px`)
            .style("overflow-y", "auto")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "10px")
            .style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)")
            .style("z-index", 1000)
            .html("");
    
        const report = d.report;
        const medicinalProduct = report.Medicinalproduct || null;
        const dosage = report.DosageText && report.DosageText !== 'unknown' ? report.DosageText : null;
        const treatmentDuration = report.TreatmentDuration && report.TreatmentDuration !== 'unknown' ? report.TreatmentDuration : null;
        const startDate = report.StartDate && report.StartDate !== 'unknown' ? formatDate(report.StartDate) : null;
        const endDate = report.EndDate && report.EndDate !== 'unknown' ? formatDate(report.EndDate) : null;
        const indications = splitBySemicolon(report.DrugIndication);
        const reactions = splitBySemicolon(report.Reactions);
    
        let message = "The patient";
    
        if (medicinalProduct) {
            message += ` took <span class="medical-product">${medicinalProduct}</span>`;
        } else {
            message += ` did not report a specific medicinal product`;
        }
    
        if (dosage) {
            message += ` with a dosage of <span class="dosage">${dosage}</span>`;
        }
    
        if (treatmentDuration) {
            message += ` for a treatment duration of <span class="treatment-duration">${treatmentDuration}</span> days`;
        }
    
        if (startDate && endDate) {
            message += ` from <span class="start-date">${startDate}</span> to <span class="end-date">${endDate}</span>`;
        } else if (startDate && !endDate) {
            message += ` starting on <span class="start-date">${startDate}</span>`;
        } else if (!startDate && endDate) {
            message += ` until <span class="end-date">${endDate}</span>`;
        }
    
        if (indications.length > 0) {
            message += ` for <span class="indications">${indications.join(", ")}</span> Indications`;
        }
    
        if (reactions.length > 0) {
            message += ` and got <span class="reactions">${reactions.join(", ")}</span> reactions.`;
        } else {
            message += ` without any reported reactions.`;
        }
    
        if (indications.length === 0 && reactions.length === 0) {
            message = message.replace(/ and got .* reactions\./, ".");
        }
        if (!message.endsWith(".")) {
            message += ".";
        }
        detailBox.html(message);
    
        d3.select("body").on("click.detailBox", function(evt) {
            if (!detailBox.node().contains(evt.target)) {
                detailBox.remove();
                d3.select("body").on("click.detailBox", null);
                stopAllBeating();
                updateFadedState();
            }
        });
    
        detailBox.on("click", function(event) {
            event.stopPropagation();
        });
    }
    
}

window.addEventListener("resize", () => {
    drawSankeyDiagram(currentNodesData, currentLinksData);
  });

function showTooltip(element, text) {
    const tooltip = d3.select("body").append("div")
        .attr("class", "pagination-tooltip")
        .style("position", "absolute")
        .style("background", "#333")
        .style("color", "#fff")
        .style("padding", "5px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0.8)
        .text(text);

    const rect = element.getBoundingClientRect();
    tooltip.style("left", `${rect.left + window.scrollX}px`)
        .style("top", `${rect.top + window.scrollY - 30}px`);
}

function updateFadedState() {
    const beatingNodes = d3.selectAll(".product-outer.beating").nodes();
    const anyBeating = beatingNodes.length > 0;
  
    if (anyBeating) {
      const beatingKeys = beatingNodes.map(node => {
        const datum = d3.select(node).datum();
        return datum.data.key.toLowerCase();
      });
  
      d3.selectAll(".product").classed("faded", function(d) {
        const productKey = d.data.key.toLowerCase();
        return !beatingKeys.includes(productKey);
      });
    } else {
      d3.selectAll(".product").classed("faded", false);
    }
  }  

  document.addEventListener("DOMContentLoaded", function() {
    toggleCountryFilterBtn = document.getElementById('toggle-country-filter-btn');
    countryFilterMessage = document.getElementById('country-filter-message');

    toggleCountryFilterBtn.addEventListener('click', function() {
        if (!currentProductData) {
            alert('Please select a medicinal product first.');
            return;
        }
        isCountryFilterActive = !isCountryFilterActive;
        if (isCountryFilterActive) {
            toggleCountryFilterBtn.textContent = 'Country Specific';
        } else {
            toggleCountryFilterBtn.textContent = 'Global Data';
        }
        showProductInfo(currentProductData);
    });

    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const contentContainer = document.getElementById('content-container');

    toggleViewBtn.addEventListener('click', function() {
        isToggled = !isToggled;
        if (isToggled) {
            contentContainer.classList.add('toggled-view');
            resizeSVGsForToggledView();
            d3.select("#sankey-container")
                .style("border", "1px solid #ccc")
                .style("padding", "5px");
        } else {
            contentContainer.classList.remove('toggled-view');
            resetSVGsToDefault();
            d3.select("#sankey-container")
                .style("border", "none")
                .style("padding", "0");
        }
    });

    function resizeSVGsForToggledView() {
        const treemapElement = document.getElementById("treemap");
        const newWidth = treemapElement.clientWidth;
        const newHeight = treemapElement.clientHeight;
        d3.select("#treemap svg")
            .attr("width", newWidth)
            .attr("height", newHeight)
            .style("border", "2px solid black");

        const bbox = zoomGroup.node().getBBox();
        const scale = Math.min(newWidth / bbox.width, newHeight / bbox.height);
        const translateX = (newWidth - bbox.width * scale) / 2;
        const translateY = (newHeight - bbox.height * scale) / 2;

        svg.transition().duration(500).call(
            zoom.transform,
            d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );

        d3.select("#sankey-container svg")
            .attr("width", document.getElementById("sankey-container").clientWidth)
            .attr("height", newHeight)
            .style("overflow", "scroll");
    }

    function resetSVGsToDefault() {
        d3.select("#treemap svg")
            .attr("width", outerWidth + margin.left + margin.right)
            .attr("height", outerHeight + margin.top + margin.bottom)
            .style("border", "1px solid black");

        svg.transition().duration(500).call(
            zoom.transform,
            d3.zoomIdentity
        );

        d3.select("#sankey-container svg")
            .attr("width", document.getElementById("sankey-container").clientWidth)
            .attr("height", 800)
            .style("overflow-y", "visible");
    }

    const toggleBtn = document.getElementById('toggle-structure-btn');
    const structureBox = document.getElementById('structure-box');

    function toggleStructureBox(event) {
        event.stopPropagation();
        structureBox.classList.toggle('visible');
        if (structureBox.classList.contains('visible')) {
          setTimeout(renderTree, 300);
        }
      }

    toggleBtn.addEventListener('click', toggleStructureBox);

    document.addEventListener('click', function(event) {
        const target = event.target;
        if (!structureBox.contains(target) && target !== toggleBtn) {
            structureBox.classList.remove('visible');
        }
    });

    structureBox.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    const data = {
        name: "Safety Report",
        children: [
            { name: "safetyreportversion" },
            { name: "safetyreportid" },
            { name: "primarysourcecountry" },
            { name: "transmissiondateformat" },
            { name: "transmissiondate" },
            { name: "reporttype" },
            { name: "serious" },
            { name: "seriousnessdeath" },
            { name: "seriousnesslifethreatening" },
            { name: "seriousnesshospitalization" },
            { name: "seriousnessdisabling" },
            { name: "seriousnesscongenitalanomali" },
            { name: "seriousnessother" },
            { name: "receivedate" },
            { name: "receiptdate" },
            { name: "fulfillexpeditecriteria" },
            { name: "authoritynumb" },
            {
                name: "primarysource",
                children: [
                    { name: "reportercountry" },
                    { name: "qualification" }
                ]
            },
            {
                name: "sender",
                children: [
                    { name: "sendertype" },
                    { name: "senderorganization" }
                ]
            },
            {
                name: "receiver",
                children: [
                    { name: "receivertype" },
                    { name: "receiverorganization" }
                ]
            },
            {
                name: "patient",
                children: [
                    { name: "patientonsetage" },
                    { name: "patientonsetageunit" },
                    { name: "patientsex" },
                    {
                        name: "reaction",
                        children: [
                            { name: "reactionmeddraversionpt" },
                            { name: "reactionmeddrapt" }
                        ]
                    },
                    {
                        name: "drug",
                        children: [
                            { name: "drugcharacterization" },
                            { name: "medicinalproduct" },
                            { name: "drugbatchnumb" },
                            { name: "drugstructuredosagenumb" },
                            { name: "drugstructuredosageunit" },
                            { name: "drugseparatedosagenumb" },
                            { name: "drugintervaldosageunitnumb" },
                            { name: "drugintervaldosagedefinition" },
                            { name: "drugdosagetext" },
                            { name: "drugadministrationroute" },
                            { name: "drugindication" },
                            { name: "drugstartdateformat" },
                            { name: "drugstartdate" },
                            { name: "drugadditional" },
                            {
                                name: "activesubstance",
                                children: [
                                    { name: "activesubstancename" }
                                ]
                            },
                            {
                                name: "openfda",
                                children: [
                                    { name: "application_number" },
                                    { name: "brand_name" },
                                    { name: "generic_name" },
                                    { name: "manufacturer_name" },
                                    { name: "product_ndc" },
                                    { name: "product_type" },
                                    { name: "route" },
                                    { name: "substance_name" },
                                    { name: "rxcui" },
                                    { name: "spl_id" },
                                    { name: "spl_set_id" },
                                    { name: "package_ndc" },
                                    { name: "nui" },
                                    { name: "pharm_class_epc" },
                                    { name: "pharm_class_moa" },
                                    { name: "unii" }
                                ]
                            }
                        ]
                    },
                    {
                        name: "summary",
                        children: [
                            { name: "narrativeincludeclinical" }
                        ]
                    }
                ]
            }
        ]
    };

    const svg = d3.select("#data-structure-svg");

    function setLabelWidth(node) {
        const avgCharWidth = 9;
        const padding = 5;
        node.data.labelWidth = node.data.name.length * avgCharWidth + padding;
        if (node.children) {
            node.children.forEach(child => setLabelWidth(child));
        }
    }

    function renderTree() {
        svg.selectAll("*").remove();
        const boundingBox = svg.node().getBoundingClientRect();
        const width = boundingBox.width;
        const height = boundingBox.height;
        const root = d3.hierarchy(data);
        setLabelWidth(root);
        const treeLayout = d3.cluster()
            .size([height, width - 200])
            .separation((a, b) => 2);
        treeLayout(root);
        const nodes = root.descendants();
        const links = root.links();
        const adjustedLinks = links.map(link => ({
            source: { x: link.source.x, y: link.source.y + link.source.data.labelWidth },
            target: { x: link.target.x, y: link.target.y }
        }));
        const g = svg.append("g")
            .attr("transform", "translate(5,2)");
        const linkGenerator = d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x);
        g.selectAll(".link")
            .data(adjustedLinks)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", linkGenerator)
            .attr("fill", "none")
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);
        const nodeRadius = 4;
        const fontSize = 8;
        g.selectAll(".node")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("class", "node")
            .attr("cx", d => d.y)
            .attr("cy", d => d.x)
            .attr("r", nodeRadius)
            .attr("fill", "#333")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(d.data.name)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this).attr("fill", "#ff0");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).attr("fill", "#555");
            });
        const labels = g.selectAll(".label")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "label-group")
            .attr("transform", d => `translate(${d.y}, ${d.x})`);
        labels.each(function(d) {
            const text = d.data.name;
            d3.select(this).append("circle")
                .attr("class", "node")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", nodeRadius)
                .attr("fill", "#333");
            d3.select(this).append("text")
                .attr("class", "label-text")
                .attr("x", 5)
                .attr("y", 3.5)
                .attr("font-size", fontSize)
                .attr("fill", "#333")
                .text(text);
        });
    }
    renderTree();
    window.addEventListener("resize", function() {
        renderTree();
    });
});
