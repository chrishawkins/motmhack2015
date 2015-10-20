

$(document).ready(function() {

 String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

  function FindSuggestion(query, facets) {
    var testString = query;
    if(facets) {
      testString = [testString,facets.join(",")].join(",");
    }
      var suggestions = [
      {
        "tags": ["Construction"],
        "url": "http://www.ci.richmond.ca.us/1243/RichmondBUILD",
        "title": "RichmondBUILD",
        "snippet": "A public private partnership focused on developing talent and skill in the high growth, high wage construction and renewable energy fields.",
        "Recommendation": "The city of Richmond provides learning opportunities to help build the skills necessary for next generation construction techniques."
      },
      {
        "tags": ["Driver","Printer"],
        "url": "https://www.wardrobe.org/about.aspx",
        "title": "Wardrobe for Opportunity",
        "snippet": "Wardrobe for Opportunity (WFO) works in partnership with the community to assist low-income individuals in their efforts to Find a Job, Keep a Job, and Build a Career.",
        "Recommendation": "For professional jobs such as what you have selected, looking good for your interview is important.  We recommend Wardrobe for Opportunity to find clothing options should you need them."
      }
    ];
    var filtered = suggestions.filter(function(d) {
      var isHit = false;
        d.tags.forEach(function(tag) {
          if(testString.contains(tag)) {
            isHit = true;
          }
        });  
      return isHit;
    });
    if(filtered.length > 0) {
      return filtered[0];
    } else{
      return null;
    }
  }

  // INITIALIZATION
  // ==============
  // Replace with your own values
  var APPLICATION_ID = 'X25CP0XHD3';
  var SEARCH_ONLY_API_KEY = '3b31680862bc438bf721821be36fcbe0';
  var INDEX_NAME = 'jobsID_ng';
  var PARAMS = {
    hitsPerPage: 15,
    maxValuesPerFacet: 25,
    facets: [],
    disjunctiveFacets: ['city', 'company', 'query']
  };
  var FACETS_SLIDER = [];
  var DEFAULT_USER = {
    lat: 37.93956,
    lng: -122.34165
  };
  var SEARCH_PARAMETERS = {
    aroundLatLng: DEFAULT_USER.lat + ',' + DEFAULT_USER.lng,
    aroundRadius: 10000 // 10km around
  };
  var FACETS_ORDER_OF_DISPLAY = ['query', 'city', 'company'];
  var FACETS_LABELS = {city: 'City', query: 'Job Type', company: 'Company'};

  // Client + Helper initialization
  var algolia = algoliasearch(APPLICATION_ID, SEARCH_ONLY_API_KEY);
  var algoliaHelper = algoliasearchHelper(algolia, INDEX_NAME, PARAMS);
  var cityProgramsHelper = algoliasearchHelper(algolia, 'city_programs', {
    hitsPerPage: 1
  });

  // DOM BINDING
  $searchInput = $('#search-input');
  $searchInputIcon = $('#search-input-icon');
  $main = $('main');
  $sortBySelect = $('#sort-by-select');
  $hits = $('#hits');
  $map = $('#map');
  $stats = $('#stats');
  $facets = $('#facets');
  $pagination = $('#pagination');
  $suggestions = $('#suggestions');

  // Hogan templates binding
  var hitTemplate = Hogan.compile($('#hit-template').text());
  var mapTemplate = Hogan.compile($('#map-template').text());
  var statsTemplate = Hogan.compile($('#stats-template').text());
  var facetTemplate = Hogan.compile($('#facet-template').text());
  var sliderTemplate = Hogan.compile($('#slider-template').text());
  var suggestionsTemplate = Hogan.compile($('#suggestions-template').text());
  var paginationTemplate = Hogan.compile($('#pagination-template').text());
  var noResultsTemplate = Hogan.compile($('#no-results-template').text());

  var map = L.map('map').setView([DEFAULT_USER.lat, DEFAULT_USER.lng], 9);
  L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
/*
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      maxZoom: 18,
      id: 'jmcatani.m08me49a',
      accessToken: 'pk.eyJ1Ijoiam1jYXRhbmkiLCJhIjoicC1ZOHRZRSJ9.eX2hWI42sFzAXgh2jw7Kng'
  }).addTo(map);
*/

  var RedIcon = L.Icon.Default.extend({ options: {
       iconUrl: 'img/marker-icon-red.png' 
     }
  });
  var personMarker = L.marker([ DEFAULT_USER.lat, DEFAULT_USER.lng ], {icon:new RedIcon()})
                      .addTo(map)
  var markers = {};

  // SEARCH BINDING
  // ==============

  // Input binding
  $searchInput
  .on('keyup', function() {
    var query = $(this).val();
    toggleIconEmptyInput(query);
    algoliaHelper.setQuery(query).search(SEARCH_PARAMETERS);
  })
  .focus();

  // Search errors
  algoliaHelper.on('error', function(error) {
    console.err(error);
  });

  // Update URL
  algoliaHelper.on('change', function(state) {
    setURLParams();
  });

  // Search results
  algoliaHelper.on('result', function(content, state) {
    renderStats(content);
    renderHits(content);
    renderSuggestions(content,state);
    renderMap(content);
    renderFacets(content, state);
    bindSearchObjects(state);
    renderPagination(content);
    handleNoResults(content);
  });

  // Initial search
  initFromURLParams();
  algoliaHelper.search(SEARCH_PARAMETERS);



  // RENDER SEARCH COMPONENTS
  // ========================

  function renderSuggestions(content,state) {
    var suggestions = FindSuggestion(state.query, state.disjunctiveFacetsRefinements.query);
        console.log(suggestions);
    if(suggestions) {
        $suggestions.html(suggestionsTemplate.render(suggestions));
    }
    else {
        $suggestions.html("");
    }
  }

  function renderStats(content) {
    var stats = {
      nbHits: content.nbHits,
      nbHits_plural: content.nbHits !== 1,
      processingTimeMS: content.processingTimeMS
    };
    $stats.html(statsTemplate.render(stats));
  }

  function renderHits(content) {
    var x = {};
    x.hits = content.hits.map(function(d) { 
        return Object.assign({}, d, { 
            transitCost: estimateTransitCost([DEFAULT_USER.lat, DEFAULT_USER.lng], [d.latitude,d.longitude])
        });
    });
    $hits.html(hitTemplate.render(x));
  }

  function renderMap(content) {
    map.removeLayer(markers); 
    markers = L.layerGroup(content.hits.map(function(d) {
      var marker = L.marker([ d.latitude, d.longitude ],{
        title: d.jobkey
      })
      marker.on('click',function() { onJobSelect(this.options.title);})
      return marker;
    }));
    markers.addTo(map);
  }

  function renderFacets(content, state) {
    var facetsHtml = '';
    for (var facetIndex = 0; facetIndex < FACETS_ORDER_OF_DISPLAY.length; ++facetIndex) {
      var facetName = FACETS_ORDER_OF_DISPLAY[facetIndex];
      var facetResult = content.getFacetByName(facetName);
      if (!facetResult) continue;
      var facetContent = {};

      // Slider facets
      if ($.inArray(facetName, FACETS_SLIDER) !== -1) {
        facetContent = {
          facet: facetName,
          title: FACETS_LABELS[facetName]
        };
        facetContent.min = facetResult.stats.min;
        facetContent.max = facetResult.stats.max;
        var from = state.getNumericRefinement(facetName, '>=') || facetContent.min;
        var to = state.getNumericRefinement(facetName, '<=') || facetContent.max;
        facetContent.from = Math.min(facetContent.max, Math.max(facetContent.min, from));
        facetContent.to = Math.min(facetContent.max, Math.max(facetContent.min, to));
        facetsHtml += sliderTemplate.render(facetContent);
      }

      // Conjunctive + Disjunctive facets
      else {
        facetContent = {
          facet: facetName,
          title: FACETS_LABELS[facetName],
          values: content.getFacetValues(facetName, {sortBy: ['isRefined:desc', 'count:desc']}),
          disjunctive: $.inArray(facetName, PARAMS.disjunctiveFacets) !== -1
        };
        facetsHtml += facetTemplate.render(facetContent);
      }
    }
    $facets.html(facetsHtml);
  }

  function bindSearchObjects(state) {
    // Bind Sliders
    for (facetIndex = 0; facetIndex < FACETS_SLIDER.length; ++facetIndex) {
      var facetName = FACETS_SLIDER[facetIndex];
      var slider = $('#' + facetName + '-slider');
      var sliderOptions = {
        type: 'double',
        grid: true,
        min: slider.data('min'),
        max: slider.data('max'),
        from: slider.data('from'),
        to: slider.data('to'),
        prettify: function(num) {
          return '$' + parseInt(num, 10);
        },
        onFinish: function(data) {
          var lowerBound = state.getNumericRefinement(facetName, '>=');
          lowerBound = lowerBound && lowerBound[0] || data.min;
          if (data.from !== lowerBound) {
            algoliaHelper.removeNumericRefinement(facetName, '>=');
            algoliaHelper.addNumericRefinement(facetName, '>=', data.from).search(SEARCH_PARAMETERS);
          }
          var upperBound = state.getNumericRefinement(facetName, '<=');
          upperBound = upperBound && upperBound[0] || data.max;
          if (data.to !== upperBound) {
            algoliaHelper.removeNumericRefinement(facetName, '<=');
            algoliaHelper.addNumericRefinement(facetName, '<=', data.to).search(SEARCH_PARAMETERS);
          }
        }
      };
      slider.ionRangeSlider(sliderOptions);
    }
  }

  function renderPagination(content) {
    var pages = [];
    if (content.page > 3) {
      pages.push({current: false, number: 1});
      pages.push({current: false, number: '...', disabled: true});
    }
    for (var p = content.page - 3; p < content.page + 3; ++p) {
      if (p < 0 || p >= content.nbPages) continue;
      pages.push({current: content.page === p, number: p + 1});
    }
    if (content.page + 3 < content.nbPages) {
      pages.push({current: false, number: '...', disabled: true});
      pages.push({current: false, number: content.nbPages});
    }
    var pagination = {
      pages: pages,
      prev_page: content.page > 0 ? content.page : false,
      next_page: content.page + 1 < content.nbPages ? content.page + 2 : false
    };
    $pagination.html(paginationTemplate.render(pagination));
  }



  // NO RESULTS
  // ==========

  function handleNoResults(content) {
    if (content.nbHits > 0) {
      $main.removeClass('no-results');
      return;
    }
    $main.addClass('no-results');

    var filters = [];
    var i;
    var j;
    for (i in algoliaHelper.state.facetsRefinements) {
      filters.push({
        class: 'toggle-refine',
        facet: i, facet_value: algoliaHelper.state.facetsRefinements[i],
        label: FACETS_LABELS[i] + ': ',
        label_value: algoliaHelper.state.facetsRefinements[i]
      });
    }
    for (i in algoliaHelper.state.disjunctiveFacetsRefinements) {
      for (j in algoliaHelper.state.disjunctiveFacetsRefinements[i]) {
        filters.push({
          class: 'toggle-refine',
          facet: i,
          facet_value: algoliaHelper.state.disjunctiveFacetsRefinements[i][j],
          label: FACETS_LABELS[i] + ': ',
          label_value: algoliaHelper.state.disjunctiveFacetsRefinements[i][j]
        });
      }
    }
    for (i in algoliaHelper.state.numericRefinements) {
      for (j in algoliaHelper.state.numericRefinements[i]) {
        filters.push({
          class: 'remove-numeric-refine',
          facet: i,
          facet_value: j,
          label: FACETS_LABELS[i] + ' ',
          label_value: j + ' ' + algoliaHelper.state.numericRefinements[i][j]
        });
      }
    }
    $hits.html(noResultsTemplate.render({query: content.query, filters: filters}));
  }



  // EVENTS BINDING
  // ==============

  $(document).on('click', '.toggle-refine', function(e) {
    e.preventDefault();
    algoliaHelper.toggleRefine($(this).data('facet'), $(this).data('value')).search(SEARCH_PARAMETERS);
  });
  $(document).on('click', '.go-to-page', function(e) {
    e.preventDefault();
    $('html, body').animate({scrollTop: 0}, '500', 'swing');
    algoliaHelper.setCurrentPage(+$(this).data('page') - 1).search(SEARCH_PARAMETERS);
  });
  $sortBySelect.on('change', function(e) {
    e.preventDefault();
    algoliaHelper.setIndex(INDEX_NAME + $(this).val()).search(SEARCH_PARAMETERS);
  });
  $searchInputIcon.on('click', function(e) {
    e.preventDefault();
    $searchInput.val('').keyup().focus();
  });
  $(document).on('click', '.remove-numeric-refine', function(e) {
    e.preventDefault();
    algoliaHelper.removeNumericRefinement($(this).data('facet'), $(this).data('value')).search(SEARCH_PARAMETERS);
  });
  $(document).on('click', '.clear-all', function(e) {
    e.preventDefault();
    $searchInput.val('').focus();
    algoliaHelper.setQuery('').clearRefinements().search(SEARCH_PARAMETERS);
  });

  function onJobSelect(jobkey) {
    $searchInput.val('').focus();
    algoliaHelper.setQuery(jobkey).clearRefinements().search(SEARCH_PARAMETERS);
  }



  // URL MANAGEMENT
  // ==============

  function initFromURLParams() {
    var URLString = window.location.search.slice(1);
    var URLParams = algoliasearchHelper.url.getStateFromQueryString(URLString);
    if (URLParams.query) $searchInput.val(URLParams.query);
    if (URLParams.index) $sortBySelect.val(URLParams.index.replace(INDEX_NAME, ''));
    algoliaHelper.overrideStateWithoutTriggeringChangeEvent(algoliaHelper.state.setQueryParameters(URLParams));
  }

  var URLHistoryTimer = Date.now();
  var URLHistoryThreshold = 700;
  function setURLParams() {
    var trackedParameters = ['attribute:*'];
    if (algoliaHelper.state.query.trim() !== '')  trackedParameters.push('query');
    if (algoliaHelper.state.page !== 0)           trackedParameters.push('page');
    if (algoliaHelper.state.index !== INDEX_NAME) trackedParameters.push('index');

    var URLParams = window.location.search.slice(1);
    var nonAlgoliaURLParams = algoliasearchHelper.url.getUnrecognizedParametersInQueryString(URLParams);
    var nonAlgoliaURLHash = window.location.hash;
    var helperParams = algoliaHelper.getStateAsQueryString({filters: trackedParameters, moreAttributes: nonAlgoliaURLParams});
    if (URLParams === helperParams) return;

    var now = Date.now();
    if (URLHistoryTimer > now) {
      window.history.replaceState(null, '', '?' + helperParams + nonAlgoliaURLHash);
    } else {
      window.history.pushState(null, '', '?' + helperParams + nonAlgoliaURLHash);
    }
    URLHistoryTimer = now+URLHistoryThreshold;
  }

  window.addEventListener('popstate', function() {
    initFromURLParams();
    algoliaHelper.search(SEARCH_PARAMETERS);
  });



  // HELPER METHODS
  // ==============

  function toggleIconEmptyInput(query) {
    $searchInputIcon.toggleClass('empty', query.trim() !== '');
  }

  function estimateTransitCost(coords1, coords2) {
    var distance = haversineDistance(coords1, coords2, true);
    if(distance > 50) {
        return "10-30";
    } 
    else if (distance > 25) {
        return "8-15";
    }
    else if (distance > 10) {
        return "5-12";
    }
    else if (distance > 5) {
        return "2-10";
    }
    else if (distance > 3) {
        return "2-5";
    }
    else {
        return "0-2";
    }
  }

  /* Calculate Number of Miles between points */
  function haversineDistance(coords1, coords2, isMiles) {
  function toRad(x) {
    return x * Math.PI / 180;
  }

  var lon1 = coords1[0];
  var lat1 = coords1[1];

  var lon2 = coords2[0];
  var lat2 = coords2[1];

  var R = 6371; // km

  var x1 = lat2 - lat1;
  var dLat = toRad(x1);
  var x2 = lon2 - lon1;
  var dLon = toRad(x2)
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;

  if(isMiles) d /= 1.60934;

  return d;
}

});
