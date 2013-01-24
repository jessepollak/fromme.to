(function() {
    this.App = (function() {

        App.prototype.defaults = {
            placesContainerSelector: '.places-container ul.places',
            inputContainerSelector: 'div.input-container',
            inputSelector: 'div.input-container input#input',
            submitSelector: 'div.input-container div#submit',
            escKeyCode: 27,
            enterKeyCode: 13
        };

        function App(options) {
            if (options.destintation === 'nil') {
                return;
            }

            this.options = _.defaults(options, this.defaults);
            this.destination = options.destination;
            this.placesContainer = $(this.options.placesContainerSelector);

            this.inputContainer = $(this.options.inputContainerSelector);
            this.input = $(this.options.inputSelector);
            this.submit = $(this.options.submitSelector);

            this.inputShown = false;

            this.routes = [];
            this.places = [];

            this.directionsService = new google.maps.DirectionsService();
            this.directionsDisplay = new google.maps.DirectionsRenderer();
            this.geocoder = new google.maps.Geocoder();
            this.getLocation = _.bind(this.getLocation, this);
            this.handlePosition = _.bind(this.handlePosition, this);
            this.handleError = _.bind(this.handleError, this);
            this.findPlaces = _.bind(this.findPlaces, this);
            this.handlePlaces = _.bind(this.handlePlaces, this);
            this.attachHandlers = _.bind(this.attachHandlers, this);
            this.attachPlaceHandlers = _.bind(this.attachPlaceHandlers, this);
            this.changePlace = _.bind(this.changePlace, this);
            this.handleTyping = _.bind(this.handleTyping, this);
            this.hideInput = _.bind(this.hideInput, this);
            this.showInput = _.bind(this.showInput, this);
            this.submitInput = _.bind(this.submitInput, this);

            this.getLocation(this.handlePosition, this.handleError);
            // this.handleDirections(directions);

            this.attachHandlers();
        }

        App.prototype.attachHandlers = function() {
            $(window).on('keydown', this.handleTyping);
            this.submit.on('click', this.submitInput);
        };

        App.prototype.getLocation = function(success, error) {

            if (Modernizr.geolocation) {
                navigator.geolocation.getCurrentPosition(success, error);
            } else {
                this.handleError(error);
            }
        };

        App.prototype.handlePosition = function(data) {

            this.location = new google.maps.LatLng(data.coords.latitude, data.coords.longitude);

            var mapOptions = {
                zoom: 16,
                center: this.location,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            this.map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

            this.directionsDisplay.setMap(this.map);

            var places = this.findPlaces(this.destination, this.handlePlaces);
        };

        App.prototype.findPlaces = function(keyword, callback) {

            if (this.placesService === undefined) {
                this.localSearch = new google.search.LocalSearch();
                this.autoCompleteService = new google.maps.places.AutocompleteService();
                this.placesService = new google.maps.places.PlacesService(this.map);
            }

            this.localSearch.setCenterPoint(this.location);

            this.localSearch.setSearchCompleteCallback(this, callback, null);

            this.localSearch.execute(keyword.replace('+', ' '));

            // this.autoCompleteService.getQueryPredictions(
            //     {
            //         input: keyword,
            //         bounds: convertToLatLngBounds(this.location)
            //     },
            //     function(predictions, status) {
            //         console.log(predictions);
            //     }
            // );

            // var request = {
            //     location: this.location,
            //     query: keyword,
            //     radius: 50000
            // };

            // this.placesService.textSearch(request, callback);
        };

        App.prototype.handlePlaces = function(places, status) {
            var _this = this;

            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                this.handleError(status);
                return;
            }

            _.each(places.slice(0, 5), function(p, i) {
                var place = new Place(p, i, _this);
                _this.places.push(place);
                place.render(_this.placesContainer);
                _this.attachPlaceHandlers(place);
            });

            this.currentPlace = this.places[0];
            this.currentPlace.expand();
        };

        App.prototype.attachPlaceHandlers = function(place) {
            place.$html.on('place.summary-click', this.changePlace);
        };

        App.prototype.changePlace = function(e, place) {
            if (this.inputShown && e !== undefined) this.hideInput();
            if (this.currentPlace) this.currentPlace.collapse();

            if (this.currentPlace !== place) {
                place.expand();
                this.currentPlace = place;
            } else {
                this.currentPlace = undefined;
            }
        };

        App.prototype.handleTyping = function(e) {
            var _this = this;
            // Enter submits the form
            if(e.keyCode === this.options.enterKeyCode && this.inputShown) {
                this.submitInput();
                return;
            }

            // ESC closes the input
            if (e.keyCode == this.options.escKeyCode && this.inputShown) {
                this.hideInput();

                // show the first route
                this.changePlace(undefined, this.places[0]);
                return;
            }

            // Any typing opens up the form
            if (!this.inputShown && e.keyCode != this.options.escKeyCode) {
                this.showInput();

                // hide the current shown route
                this.changePlace(undefined, this.currentPlace);
                return;
            }
        };

        App.prototype.hideInput = function(){
            this.inputShown = false;
            this.inputContainer.slideUp();
            this.input.val('');
        };

        App.prototype.showInput = function() {
            this.inputShown = true;
            this.inputContainer.show();
            this.input.focus();
        };

        App.prototype.submitInput = function() {
            window.location = '/' + this.input.val().replace(/ /g, '+');
        };

        App.prototype.handleError = function(error) {
            console.log(error);
            console.log('Y U GIVE ME BAD ERROR!?');
        };

        function convertToLatLngBounds(latlng) {
            var LAT_DIFF = .01;
            var LNG_DIFF = .02;

            var bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(latlng.lat() - LAT_DIFF, latlng.lng() - LNG_DIFF),
                new google.maps.LatLng(latlng.lat() + LAT_DIFF, latlng.lng() + LNG_DIFF)
            );

            console.log(bounds);
            return bounds;
        }

        return App;
    })();

    this.Place = (function() {

        Place.prototype.defaults = {
            baseHTML: "<li class='place'><div class='summary-container' style='display:none;'><h6 class='summary'></h6></div><div class='route-container'></div></li>",
            summaryContainerSelector: 'div.summary-container',
            summarySelector: 'h6.summary',
            routeContainerSelector: 'div.route-container'
        };

        function Place(placeInformation, index, app) {

            this.placeInformation = placeInformation;
            this.options = _.defaults(_.clone(placeInformation), this.defaults);
            this.index = index + 1;
            this.app = app;
            this.expanded = false;

            this.$html = $(this.options.baseHTML);
            this.summaryContainer = this.$html.find(this.options.summaryContainerSelector);
            this.summary = this.summaryContainer.find(this.options.summarySelector);
            this.routeContainer = this.$html.find(this.options.routeContainerSelector);

            this.render = _.bind(this.render, this);
            this.collapse = _.bind(this.collapse, this);
            this.expand = _.bind(this.expand, this);
            this.attachHandlers = _.bind(this.attachHandlers, this);
            this.summaryClick = _.bind(this.summaryClick, this);
            this.generateRoute = _.bind(this.generateRoute, this);
            this.handleDirections = _.bind(this.handleDirections, this);
        }

        Place.prototype.render = function(container) {
            this.summary.append("<span class='place-number'>" + this.index + "</span>" + this.options.name);

            container.append(this.$html);

            this.attachHandlers(container);

            this.summaryContainer.show();
        };

        Place.prototype.collapse = function() {
            this.route.collapse();
        };

        Place.prototype.expand = function() {
            if (!this.route) {
                this.generateRoute();
            } else {
                this.app.directionsDisplay.setDirections(this.directions);
                this.route.expand();
            }
        };

        Place.prototype.generateRoute = function() {
            var placeLatLong = new google.maps.LatLng(this.options.geometry.location.Ya, this.options.geometry.location.Za);

            // // var marker = new google.maps.Marker({
            // //     position: closestLatLong,
            // //     map: this.map,
            // //     title: closest.name
            // // });

            var directions = {
                origin: this.app.location,
                destination: placeLatLong,
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL
            };

            this.app.directionsService.route(directions, this.handleDirections);
        };


        Place.prototype.handleDirections = function(directions, status) {
            var _this = this;
            if (status !== google.maps.DirectionsStatus.OK) {
                this.app.handleError(status);
                return;
            }

            this.directions = directions;

            this.route = new Route(this.directions.routes[0]);
            this.route.render(this.routeContainer);

            this.expand();
        };

        Place.prototype.attachHandlers = function(container) {
            this.summaryContainer.on('click', this.summaryClick);
        };

        Place.prototype.summaryClick = function(e) {
            this.$html.trigger('place.summary-click', this);
        };

        return Place;
    })();

    this.Route = (function() {

        Route.prototype.defaults = {
            baseHTML: "<div class='route'><ul class='directions' style='display:none;'></ul></div>",
            directionsSelector: 'ul.directions'
        };

        function Route(options) {
            this.options = _.defaults(options, this.defaults);

            this.$html = $(this.options.baseHTML);
            this.directions = this.$html.find(this.options.directionsSelector);

            this.render = _.bind(this.render, this);
            this.collapse = _.bind(this.collapse, this);
            this.expand = _.bind(this.expand, this);
            this.formatDirections = _.bind(this.formatDirections, this);
            this.formatStep = _.bind(this.formatStep, this);
            this.attachHandlers = _.bind(this.attachHandlers, this);
            this.summaryClick = _.bind(this.summaryClick, this);
        }

        Route.prototype.render = function(container) {
            this.directions.append(this.formatDirections());

            container.append(this.$html);

            this.attachHandlers(container);
        };

        Route.prototype.collapse = function(first) {
            this.directions.slideUp();
        };

        Route.prototype.attachHandlers = function(container) {};

        Route.prototype.summaryClick = function(e) {
            this.$html.trigger('route.summary-click', this);
        };

        Route.prototype.expand = function() {
            this.directions.slideDown();
        };

        Route.prototype.formatDirections = function() {
            var directions = this.options.legs[0],
                formattedDirections = "",
                _this = this;

            formattedDirections = _.inject(directions.steps, function(memo, step) {
                return memo + _this.formatStep(step);
            }, "");

            return formattedDirections;
        };

        Route.prototype.formatStep = function(step) {
            var extraDivRegEx = /<div.*<\/div>/,
                _ref,
                extra = "",
                clear = "<span class='clear'></span>";

            if (_ref = step.instructions.match(extraDivRegEx)) {
                _ref.forEach(function(div) {
                    step.instructions = step.instructions.replace(extraDivRegEx, "");
                    extra += "<li>" + _ref + "</li>";
                });
            }

            var distance = "<span class='distance'>" + step.distance.text + "</span>";
            var length = "<span class='length'>(" + step.duration.text + ")</span>";
            var instruction = "<span class='instruction'>" + step.instructions + "</span>";
            var information = "<p>" + distance + instruction + length + clear + "</p>";
            return "<li>" + information + "</li>" + extra;
        };

        return Route;
    })();

}).call(this);


var directions = {"routes":[{"bounds":{"Z":{"b":38.908570000000005,"d":38.9369},"ca":{"b":-77.06865,"d":-77.04403}},"copyrights":"Map data ©2013 Google","legs":[{"distance":{"text":"2.7 mi","value":4392},"duration":{"text":"9 mins","value":530},"end_address":"1353-1499 New Hampshire Avenue Northwest, Washington, DC 20036, USA","end_location":{"Ya":38.90898,"Za":-77.04403000000002},"start_address":"3512 35th Street Northwest, Washington, DC 20016, USA","start_location":{"Ya":38.9369,"Za":-77.06864999999999},"steps":[{"distance":{"text":"223 ft","value":68},"duration":{"text":"1 min","value":6},"end_location":{"Ya":38.93629000000001,"Za":-77.06864000000002},"polyline":{"points":"szslF`nkuMjBAL?"},"start_location":{"Ya":38.9369,"Za":-77.06864999999999},"travel_mode":"DRIVING","encoded_lat_lngs":"szslF`nkuMjBAL?","path":[{"Ya":38.9369,"Za":-77.06865},{"Ya":38.93636,"Za":-77.06864},{"Ya":38.93629000000001,"Za":-77.06864}],"lat_lngs":[{"Ya":38.9369,"Za":-77.06865},{"Ya":38.93636,"Za":-77.06864},{"Ya":38.93629000000001,"Za":-77.06864}],"instructions":"Head <b>south</b> on <b>35th St NW</b> toward <b>Ordway St NW</b>","start_point":{"Ya":38.9369,"Za":-77.06864999999999},"end_point":{"Ya":38.93629000000001,"Za":-77.06864000000002}},{"distance":{"text":"0.1 mi","value":194},"duration":{"text":"1 min","value":35},"end_location":{"Ya":38.93629000000001,"Za":-77.06639999999999},"polyline":{"points":"yvslF~mkuM?oA?eB?i@?kA?iB?i@"},"start_location":{"Ya":38.93629000000001,"Za":-77.06864000000002},"travel_mode":"DRIVING","encoded_lat_lngs":"yvslF~mkuM?oA?eB?i@?kA?iB?i@","path":[{"Ya":38.93629000000001,"Za":-77.06864},{"Ya":38.93629000000001,"Za":-77.06824},{"Ya":38.93629000000001,"Za":-77.06773000000001},{"Ya":38.93629000000001,"Za":-77.06752},{"Ya":38.93629000000001,"Za":-77.06714000000001},{"Ya":38.93629000000001,"Za":-77.06661000000001},{"Ya":38.93629000000001,"Za":-77.0664}],"lat_lngs":[{"Ya":38.93629000000001,"Za":-77.06864},{"Ya":38.93629000000001,"Za":-77.06824},{"Ya":38.93629000000001,"Za":-77.06773000000001},{"Ya":38.93629000000001,"Za":-77.06752},{"Ya":38.93629000000001,"Za":-77.06714000000001},{"Ya":38.93629000000001,"Za":-77.06661000000001},{"Ya":38.93629000000001,"Za":-77.0664}],"instructions":"Turn <b>left</b> onto <b>Ordway St NW</b>","start_point":{"Ya":38.93629000000001,"Za":-77.06864000000002},"end_point":{"Ya":38.93629000000001,"Za":-77.06639999999999}},{"distance":{"text":"0.8 mi","value":1329},"duration":{"text":"2 mins","value":149},"end_location":{"Ya":38.92434,"Za":-77.06636000000003},"polyline":{"points":"yvslF~_kuMP?Z?h@?jB@R?L?n@?p@AdAAhAAH?lA?j@?`B?^?N?P?j@@xA?l@?H?D?`BB@?`A?x@?P?b@?F?z@An@?nA?P?pBAtA?~AAp@?jA?fB@V?L?h@?x@?nD?bAAXC"},"start_location":{"Ya":38.93629000000001,"Za":-77.06639999999999},"travel_mode":"DRIVING","encoded_lat_lngs":"yvslF~_kuMP?Z?h@?jB@R?L?n@?p@AdAAhAAH?lA?j@?`B?^?N?P?j@@xA?l@?H?D?`BB@?`A?x@?P?b@?F?z@An@?nA?P?pBAtA?~AAp@?jA?fB@V?L?h@?x@?nD?bAAXC","path":[{"Ya":38.93629000000001,"Za":-77.0664},{"Ya":38.93620000000001,"Za":-77.0664},{"Ya":38.936060000000005,"Za":-77.0664},{"Ya":38.93585,"Za":-77.0664},{"Ya":38.93531,"Za":-77.06641},{"Ya":38.935210000000005,"Za":-77.06641},{"Ya":38.935140000000004,"Za":-77.06641},{"Ya":38.934900000000006,"Za":-77.06641},{"Ya":38.934650000000005,"Za":-77.0664},{"Ya":38.9343,"Za":-77.06639000000001},{"Ya":38.933930000000004,"Za":-77.06638000000001},{"Ya":38.93388,"Za":-77.06638000000001},{"Ya":38.933490000000006,"Za":-77.06638000000001},{"Ya":38.93327,"Za":-77.06638000000001},{"Ya":38.93278,"Za":-77.06638000000001},{"Ya":38.93262,"Za":-77.06638000000001},{"Ya":38.93254,"Za":-77.06638000000001},{"Ya":38.93245,"Za":-77.06638000000001},{"Ya":38.932230000000004,"Za":-77.06639000000001},{"Ya":38.93178,"Za":-77.06639000000001},{"Ya":38.93155,"Za":-77.06639000000001},{"Ya":38.9315,"Za":-77.06639000000001},{"Ya":38.931470000000004,"Za":-77.06639000000001},{"Ya":38.930980000000005,"Za":-77.06641},{"Ya":38.93097,"Za":-77.06641},{"Ya":38.930640000000004,"Za":-77.06641},{"Ya":38.930350000000004,"Za":-77.06641},{"Ya":38.930260000000004,"Za":-77.06641},{"Ya":38.930080000000004,"Za":-77.06641},{"Ya":38.930040000000005,"Za":-77.06641},{"Ya":38.92974,"Za":-77.0664},{"Ya":38.929500000000004,"Za":-77.0664},{"Ya":38.929100000000005,"Za":-77.0664},{"Ya":38.929010000000005,"Za":-77.0664},{"Ya":38.92844,"Za":-77.06639000000001},{"Ya":38.92801,"Za":-77.06639000000001},{"Ya":38.927530000000004,"Za":-77.06638000000001},{"Ya":38.92728,"Za":-77.06638000000001},{"Ya":38.9269,"Za":-77.06638000000001},{"Ya":38.92638,"Za":-77.06639000000001},{"Ya":38.926260000000006,"Za":-77.06639000000001},{"Ya":38.926190000000005,"Za":-77.06639000000001},{"Ya":38.92598,"Za":-77.06639000000001},{"Ya":38.92569,"Za":-77.06639000000001},{"Ya":38.92481,"Za":-77.06639000000001},{"Ya":38.92447000000001,"Za":-77.06638000000001},{"Ya":38.92434,"Za":-77.06636}],"lat_lngs":[{"Ya":38.93629000000001,"Za":-77.0664},{"Ya":38.93620000000001,"Za":-77.0664},{"Ya":38.936060000000005,"Za":-77.0664},{"Ya":38.93585,"Za":-77.0664},{"Ya":38.93531,"Za":-77.06641},{"Ya":38.935210000000005,"Za":-77.06641},{"Ya":38.935140000000004,"Za":-77.06641},{"Ya":38.934900000000006,"Za":-77.06641},{"Ya":38.934650000000005,"Za":-77.0664},{"Ya":38.9343,"Za":-77.06639000000001},{"Ya":38.933930000000004,"Za":-77.06638000000001},{"Ya":38.93388,"Za":-77.06638000000001},{"Ya":38.933490000000006,"Za":-77.06638000000001},{"Ya":38.93327,"Za":-77.06638000000001},{"Ya":38.93278,"Za":-77.06638000000001},{"Ya":38.93262,"Za":-77.06638000000001},{"Ya":38.93254,"Za":-77.06638000000001},{"Ya":38.93245,"Za":-77.06638000000001},{"Ya":38.932230000000004,"Za":-77.06639000000001},{"Ya":38.93178,"Za":-77.06639000000001},{"Ya":38.93155,"Za":-77.06639000000001},{"Ya":38.9315,"Za":-77.06639000000001},{"Ya":38.931470000000004,"Za":-77.06639000000001},{"Ya":38.930980000000005,"Za":-77.06641},{"Ya":38.93097,"Za":-77.06641},{"Ya":38.930640000000004,"Za":-77.06641},{"Ya":38.930350000000004,"Za":-77.06641},{"Ya":38.930260000000004,"Za":-77.06641},{"Ya":38.930080000000004,"Za":-77.06641},{"Ya":38.930040000000005,"Za":-77.06641},{"Ya":38.92974,"Za":-77.0664},{"Ya":38.929500000000004,"Za":-77.0664},{"Ya":38.929100000000005,"Za":-77.0664},{"Ya":38.929010000000005,"Za":-77.0664},{"Ya":38.92844,"Za":-77.06639000000001},{"Ya":38.92801,"Za":-77.06639000000001},{"Ya":38.927530000000004,"Za":-77.06638000000001},{"Ya":38.92728,"Za":-77.06638000000001},{"Ya":38.9269,"Za":-77.06638000000001},{"Ya":38.92638,"Za":-77.06639000000001},{"Ya":38.926260000000006,"Za":-77.06639000000001},{"Ya":38.926190000000005,"Za":-77.06639000000001},{"Ya":38.92598,"Za":-77.06639000000001},{"Ya":38.92569,"Za":-77.06639000000001},{"Ya":38.92481,"Za":-77.06639000000001},{"Ya":38.92447000000001,"Za":-77.06638000000001},{"Ya":38.92434,"Za":-77.06636}],"instructions":"Take the 2nd <b>right</b> onto <b>34th St NW</b>","start_point":{"Ya":38.93629000000001,"Za":-77.06639999999999},"end_point":{"Ya":38.92434,"Za":-77.06636000000003}},{"distance":{"text":"1.2 mi","value":1921},"duration":{"text":"4 mins","value":211},"end_location":{"Ya":38.91226,"Za":-77.05106},"polyline":{"points":"clqlFv_kuMPgAHi@FUFWJa@FUHUDOJUHUXi@HOFIR[PUVYFGDEX[JIFEFEHGHEPKRKXMVMNENENEREREVEZEJCJEXGHETQJKFGDCJMDGFIpAmBhBoCT]PYbAyAf@u@|@sAPYT[PYPYFInAmBDI?ALQV_@V]RYDGDIBCHOFKFKJO^i@z@sAT[l@{@HOJQj@y@j@y@v@oAv@iADGPWLSZa@^o@hAcBf@w@d@s@b@q@Ze@tAuB~@uAp@aAb@q@\\i@PYTQDGDEDEDCHEHAFA"},"start_location":{"Ya":38.92434,"Za":-77.06636000000003},"travel_mode":"DRIVING","encoded_lat_lngs":"clqlFv_kuMPgAHi@FUFWJa@FUHUDOJUHUXi@HOFIR[PUVYFGDEX[JIFEFEHGHEPKRKXMVMNENENEREREVEZEJCJEXGHETQJKFGDCJMDGFIpAmBhBoCT]PYbAyAf@u@|@sAPYT[PYPYFInAmBDI?ALQV_@V]RYDGDIBCHOFKFKJO^i@z@sAT[l@{@HOJQj@y@j@y@v@oAv@iADGPWLSZa@^o@hAcBf@w@d@s@b@q@Ze@tAuB~@uAp@aAb@q@\\i@PYTQDGDEDEDCHEHAFA","path":[{"Ya":38.92434,"Za":-77.06636},{"Ya":38.92425,"Za":-77.066},{"Ya":38.924200000000006,"Za":-77.06579},{"Ya":38.92416,"Za":-77.06568},{"Ya":38.92412,"Za":-77.06556},{"Ya":38.924060000000004,"Za":-77.06539000000001},{"Ya":38.924020000000006,"Za":-77.06528},{"Ya":38.923970000000004,"Za":-77.06517000000001},{"Ya":38.92394,"Za":-77.06509000000001},{"Ya":38.923880000000004,"Za":-77.06498},{"Ya":38.92383,"Za":-77.06487000000001},{"Ya":38.923700000000004,"Za":-77.06466},{"Ya":38.92365,"Za":-77.06458},{"Ya":38.923610000000004,"Za":-77.06453},{"Ya":38.92351,"Za":-77.06439},{"Ya":38.92342,"Za":-77.06428000000001},{"Ya":38.923300000000005,"Za":-77.06415000000001},{"Ya":38.923260000000006,"Za":-77.06411},{"Ya":38.923230000000004,"Za":-77.06408},{"Ya":38.923100000000005,"Za":-77.06394},{"Ya":38.92304,"Za":-77.06389},{"Ya":38.923,"Za":-77.06386},{"Ya":38.92296,"Za":-77.06383000000001},{"Ya":38.92291,"Za":-77.06379000000001},{"Ya":38.92286,"Za":-77.06376},{"Ya":38.92277,"Za":-77.06370000000001},{"Ya":38.922670000000004,"Za":-77.06364},{"Ya":38.922540000000005,"Za":-77.06357000000001},{"Ya":38.92242,"Za":-77.0635},{"Ya":38.922340000000005,"Za":-77.06347000000001},{"Ya":38.92226,"Za":-77.06344},{"Ya":38.922180000000004,"Za":-77.06341},{"Ya":38.92208,"Za":-77.06338000000001},{"Ya":38.921980000000005,"Za":-77.06335},{"Ya":38.92186,"Za":-77.06332},{"Ya":38.92172,"Za":-77.06329000000001},{"Ya":38.92166,"Za":-77.06327},{"Ya":38.921600000000005,"Za":-77.06324000000001},{"Ya":38.92147000000001,"Za":-77.06320000000001},{"Ya":38.921420000000005,"Za":-77.06317},{"Ya":38.921310000000005,"Za":-77.06308},{"Ya":38.92125,"Za":-77.06302000000001},{"Ya":38.92121,"Za":-77.06298000000001},{"Ya":38.92118,"Za":-77.06296},{"Ya":38.92112,"Za":-77.06289000000001},{"Ya":38.92109000000001,"Za":-77.06285000000001},{"Ya":38.92105,"Za":-77.06280000000001},{"Ya":38.920640000000006,"Za":-77.06225},{"Ya":38.92011,"Za":-77.06153},{"Ya":38.92,"Za":-77.06138},{"Ya":38.91991,"Za":-77.06125},{"Ya":38.91957,"Za":-77.0608},{"Ya":38.91937,"Za":-77.06053},{"Ya":38.91906,"Za":-77.06011000000001},{"Ya":38.91897,"Za":-77.05998000000001},{"Ya":38.91886,"Za":-77.05984000000001},{"Ya":38.91877,"Za":-77.05971000000001},{"Ya":38.91868,"Za":-77.05958000000001},{"Ya":38.91864,"Za":-77.05953000000001},{"Ya":38.918240000000004,"Za":-77.05898},{"Ya":38.91821,"Za":-77.05893},{"Ya":38.91821,"Za":-77.05892},{"Ya":38.91814,"Za":-77.05883},{"Ya":38.918020000000006,"Za":-77.05867},{"Ya":38.9179,"Za":-77.05852},{"Ya":38.9178,"Za":-77.05839},{"Ya":38.917770000000004,"Za":-77.05835},{"Ya":38.91774,"Za":-77.0583},{"Ya":38.91772,"Za":-77.05828000000001},{"Ya":38.91767,"Za":-77.0582},{"Ya":38.91763,"Za":-77.05814000000001},{"Ya":38.917590000000004,"Za":-77.05808},{"Ya":38.917530000000006,"Za":-77.058},{"Ya":38.917370000000005,"Za":-77.05779000000001},{"Ya":38.91707,"Za":-77.05737},{"Ya":38.91696,"Za":-77.05723},{"Ya":38.91673,"Za":-77.05693000000001},{"Ya":38.91668000000001,"Za":-77.05685000000001},{"Ya":38.91662,"Za":-77.05676000000001},{"Ya":38.9164,"Za":-77.05647},{"Ya":38.916180000000004,"Za":-77.05618000000001},{"Ya":38.9159,"Za":-77.05578000000001},{"Ya":38.915620000000004,"Za":-77.05541000000001},{"Ya":38.91559,"Za":-77.05537000000001},{"Ya":38.9155,"Za":-77.05525},{"Ya":38.91543,"Za":-77.05515000000001},{"Ya":38.915290000000006,"Za":-77.05498},{"Ya":38.915130000000005,"Za":-77.05474000000001},{"Ya":38.91476,"Za":-77.05424000000001},{"Ya":38.91456,"Za":-77.05396},{"Ya":38.914370000000005,"Za":-77.0537},{"Ya":38.914190000000005,"Za":-77.05345000000001},{"Ya":38.91405,"Za":-77.05326000000001},{"Ya":38.91362,"Za":-77.05267},{"Ya":38.91330000000001,"Za":-77.05224000000001},{"Ya":38.913050000000005,"Za":-77.05191},{"Ya":38.912870000000005,"Za":-77.05166000000001},{"Ya":38.91272,"Za":-77.05145},{"Ya":38.91263,"Za":-77.05132},{"Ya":38.91252,"Za":-77.05123},{"Ya":38.912490000000005,"Za":-77.05119},{"Ya":38.91246,"Za":-77.05116000000001},{"Ya":38.91243,"Za":-77.05113},{"Ya":38.912400000000005,"Za":-77.05111000000001},{"Ya":38.91235,"Za":-77.05108000000001},{"Ya":38.9123,"Za":-77.05107000000001},{"Ya":38.91226,"Za":-77.05106}],"lat_lngs":[{"Ya":38.92434,"Za":-77.06636},{"Ya":38.92425,"Za":-77.066},{"Ya":38.924200000000006,"Za":-77.06579},{"Ya":38.92416,"Za":-77.06568},{"Ya":38.92412,"Za":-77.06556},{"Ya":38.924060000000004,"Za":-77.06539000000001},{"Ya":38.924020000000006,"Za":-77.06528},{"Ya":38.923970000000004,"Za":-77.06517000000001},{"Ya":38.92394,"Za":-77.06509000000001},{"Ya":38.923880000000004,"Za":-77.06498},{"Ya":38.92383,"Za":-77.06487000000001},{"Ya":38.923700000000004,"Za":-77.06466},{"Ya":38.92365,"Za":-77.06458},{"Ya":38.923610000000004,"Za":-77.06453},{"Ya":38.92351,"Za":-77.06439},{"Ya":38.92342,"Za":-77.06428000000001},{"Ya":38.923300000000005,"Za":-77.06415000000001},{"Ya":38.923260000000006,"Za":-77.06411},{"Ya":38.923230000000004,"Za":-77.06408},{"Ya":38.923100000000005,"Za":-77.06394},{"Ya":38.92304,"Za":-77.06389},{"Ya":38.923,"Za":-77.06386},{"Ya":38.92296,"Za":-77.06383000000001},{"Ya":38.92291,"Za":-77.06379000000001},{"Ya":38.92286,"Za":-77.06376},{"Ya":38.92277,"Za":-77.06370000000001},{"Ya":38.922670000000004,"Za":-77.06364},{"Ya":38.922540000000005,"Za":-77.06357000000001},{"Ya":38.92242,"Za":-77.0635},{"Ya":38.922340000000005,"Za":-77.06347000000001},{"Ya":38.92226,"Za":-77.06344},{"Ya":38.922180000000004,"Za":-77.06341},{"Ya":38.92208,"Za":-77.06338000000001},{"Ya":38.921980000000005,"Za":-77.06335},{"Ya":38.92186,"Za":-77.06332},{"Ya":38.92172,"Za":-77.06329000000001},{"Ya":38.92166,"Za":-77.06327},{"Ya":38.921600000000005,"Za":-77.06324000000001},{"Ya":38.92147000000001,"Za":-77.06320000000001},{"Ya":38.921420000000005,"Za":-77.06317},{"Ya":38.921310000000005,"Za":-77.06308},{"Ya":38.92125,"Za":-77.06302000000001},{"Ya":38.92121,"Za":-77.06298000000001},{"Ya":38.92118,"Za":-77.06296},{"Ya":38.92112,"Za":-77.06289000000001},{"Ya":38.92109000000001,"Za":-77.06285000000001},{"Ya":38.92105,"Za":-77.06280000000001},{"Ya":38.920640000000006,"Za":-77.06225},{"Ya":38.92011,"Za":-77.06153},{"Ya":38.92,"Za":-77.06138},{"Ya":38.91991,"Za":-77.06125},{"Ya":38.91957,"Za":-77.0608},{"Ya":38.91937,"Za":-77.06053},{"Ya":38.91906,"Za":-77.06011000000001},{"Ya":38.91897,"Za":-77.05998000000001},{"Ya":38.91886,"Za":-77.05984000000001},{"Ya":38.91877,"Za":-77.05971000000001},{"Ya":38.91868,"Za":-77.05958000000001},{"Ya":38.91864,"Za":-77.05953000000001},{"Ya":38.918240000000004,"Za":-77.05898},{"Ya":38.91821,"Za":-77.05893},{"Ya":38.91821,"Za":-77.05892},{"Ya":38.91814,"Za":-77.05883},{"Ya":38.918020000000006,"Za":-77.05867},{"Ya":38.9179,"Za":-77.05852},{"Ya":38.9178,"Za":-77.05839},{"Ya":38.917770000000004,"Za":-77.05835},{"Ya":38.91774,"Za":-77.0583},{"Ya":38.91772,"Za":-77.05828000000001},{"Ya":38.91767,"Za":-77.0582},{"Ya":38.91763,"Za":-77.05814000000001},{"Ya":38.917590000000004,"Za":-77.05808},{"Ya":38.917530000000006,"Za":-77.058},{"Ya":38.917370000000005,"Za":-77.05779000000001},{"Ya":38.91707,"Za":-77.05737},{"Ya":38.91696,"Za":-77.05723},{"Ya":38.91673,"Za":-77.05693000000001},{"Ya":38.91668000000001,"Za":-77.05685000000001},{"Ya":38.91662,"Za":-77.05676000000001},{"Ya":38.9164,"Za":-77.05647},{"Ya":38.916180000000004,"Za":-77.05618000000001},{"Ya":38.9159,"Za":-77.05578000000001},{"Ya":38.915620000000004,"Za":-77.05541000000001},{"Ya":38.91559,"Za":-77.05537000000001},{"Ya":38.9155,"Za":-77.05525},{"Ya":38.91543,"Za":-77.05515000000001},{"Ya":38.915290000000006,"Za":-77.05498},{"Ya":38.915130000000005,"Za":-77.05474000000001},{"Ya":38.91476,"Za":-77.05424000000001},{"Ya":38.91456,"Za":-77.05396},{"Ya":38.914370000000005,"Za":-77.0537},{"Ya":38.914190000000005,"Za":-77.05345000000001},{"Ya":38.91405,"Za":-77.05326000000001},{"Ya":38.91362,"Za":-77.05267},{"Ya":38.91330000000001,"Za":-77.05224000000001},{"Ya":38.913050000000005,"Za":-77.05191},{"Ya":38.912870000000005,"Za":-77.05166000000001},{"Ya":38.91272,"Za":-77.05145},{"Ya":38.91263,"Za":-77.05132},{"Ya":38.91252,"Za":-77.05123},{"Ya":38.912490000000005,"Za":-77.05119},{"Ya":38.91246,"Za":-77.05116000000001},{"Ya":38.91243,"Za":-77.05113},{"Ya":38.912400000000005,"Za":-77.05111000000001},{"Ya":38.91235,"Za":-77.05108000000001},{"Ya":38.9123,"Za":-77.05107000000001},{"Ya":38.91226,"Za":-77.05106}],"instructions":"Turn <b>left</b> onto <b>Massachusetts Avenue Northwest</b>","start_point":{"Ya":38.92434,"Za":-77.06636000000003},"end_point":{"Ya":38.91226,"Za":-77.05106}},{"distance":{"text":"0.4 mi","value":608},"duration":{"text":"1 min","value":73},"end_location":{"Ya":38.91014000000001,"Za":-77.04489999999998},"polyline":{"points":"s`olFb`huMH?J?FAHAFCHGHKDKBMBK?I?MAICKAGEIAO?O?SB[nAkFFYdA_EhAyE|@qDj@}BNm@"},"start_location":{"Ya":38.91226,"Za":-77.05106},"travel_mode":"DRIVING","encoded_lat_lngs":"s`olFb`huMH?J?FAHAFCHGHKDKBMBK?I?MAICKAGEIAO?O?SB[nAkFFYdA_EhAyE|@qDj@}BNm@","path":[{"Ya":38.91226,"Za":-77.05106},{"Ya":38.91221,"Za":-77.05106},{"Ya":38.912150000000004,"Za":-77.05106},{"Ya":38.912110000000006,"Za":-77.05105},{"Ya":38.912060000000004,"Za":-77.05104},{"Ya":38.912020000000005,"Za":-77.05102000000001},{"Ya":38.911970000000004,"Za":-77.05098000000001},{"Ya":38.91192,"Za":-77.05092},{"Ya":38.91189,"Za":-77.05086},{"Ya":38.91187,"Za":-77.05079},{"Ya":38.91185,"Za":-77.05073},{"Ya":38.91185,"Za":-77.05068},{"Ya":38.91185,"Za":-77.05061},{"Ya":38.911860000000004,"Za":-77.05056},{"Ya":38.911880000000004,"Za":-77.0505},{"Ya":38.91189,"Za":-77.05046},{"Ya":38.91192,"Za":-77.05041},{"Ya":38.911930000000005,"Za":-77.05033},{"Ya":38.911930000000005,"Za":-77.05025},{"Ya":38.911930000000005,"Za":-77.05015},{"Ya":38.911910000000006,"Za":-77.05001},{"Ya":38.91151,"Za":-77.04883000000001},{"Ya":38.91147,"Za":-77.04870000000001},{"Ya":38.911120000000004,"Za":-77.04774},{"Ya":38.91075,"Za":-77.04665},{"Ya":38.91044,"Za":-77.04576},{"Ya":38.91022,"Za":-77.04513},{"Ya":38.910140000000006,"Za":-77.04490000000001}],"lat_lngs":[{"Ya":38.91226,"Za":-77.05106},{"Ya":38.91221,"Za":-77.05106},{"Ya":38.912150000000004,"Za":-77.05106},{"Ya":38.912110000000006,"Za":-77.05105},{"Ya":38.912060000000004,"Za":-77.05104},{"Ya":38.912020000000005,"Za":-77.05102000000001},{"Ya":38.911970000000004,"Za":-77.05098000000001},{"Ya":38.91192,"Za":-77.05092},{"Ya":38.91189,"Za":-77.05086},{"Ya":38.91187,"Za":-77.05079},{"Ya":38.91185,"Za":-77.05073},{"Ya":38.91185,"Za":-77.05068},{"Ya":38.91185,"Za":-77.05061},{"Ya":38.911860000000004,"Za":-77.05056},{"Ya":38.911880000000004,"Za":-77.0505},{"Ya":38.91189,"Za":-77.05046},{"Ya":38.91192,"Za":-77.05041},{"Ya":38.911930000000005,"Za":-77.05033},{"Ya":38.911930000000005,"Za":-77.05025},{"Ya":38.911930000000005,"Za":-77.05015},{"Ya":38.911910000000006,"Za":-77.05001},{"Ya":38.91151,"Za":-77.04883000000001},{"Ya":38.91147,"Za":-77.04870000000001},{"Ya":38.911120000000004,"Za":-77.04774},{"Ya":38.91075,"Za":-77.04665},{"Ya":38.91044,"Za":-77.04576},{"Ya":38.91022,"Za":-77.04513},{"Ya":38.910140000000006,"Za":-77.04490000000001}],"instructions":"At the traffic circle, continue straight to stay on <b>Massachusetts Avenue Northwest</b>","start_point":{"Ya":38.91226,"Za":-77.05106},"end_point":{"Ya":38.91014000000001,"Za":-77.04489999999998}},{"distance":{"text":"0.1 mi","value":174},"duration":{"text":"1 min","value":33},"end_location":{"Ya":38.90857,"Za":-77.04489999999998},"polyline":{"points":"ksnlFryfuM`B?vE?"},"start_location":{"Ya":38.91014000000001,"Za":-77.04489999999998},"travel_mode":"DRIVING","encoded_lat_lngs":"ksnlFryfuM`B?vE?","path":[{"Ya":38.910140000000006,"Za":-77.04490000000001},{"Ya":38.909650000000006,"Za":-77.04490000000001},{"Ya":38.908570000000005,"Za":-77.04490000000001}],"lat_lngs":[{"Ya":38.910140000000006,"Za":-77.04490000000001},{"Ya":38.909650000000006,"Za":-77.04490000000001},{"Ya":38.908570000000005,"Za":-77.04490000000001}],"instructions":"Turn <b>right</b> onto <b>20th St NW</b>","start_point":{"Ya":38.91014000000001,"Za":-77.04489999999998},"end_point":{"Ya":38.90857,"Za":-77.04489999999998}},{"distance":{"text":"125 ft","value":38},"duration":{"text":"1 min","value":13},"end_location":{"Ya":38.90857,"Za":-77.04446000000002},"polyline":{"points":"qinlFryfuM?wA"},"start_location":{"Ya":38.90857,"Za":-77.04489999999998},"travel_mode":"DRIVING","encoded_lat_lngs":"qinlFryfuM?wA","path":[{"Ya":38.908570000000005,"Za":-77.04490000000001},{"Ya":38.908570000000005,"Za":-77.04446}],"lat_lngs":[{"Ya":38.908570000000005,"Za":-77.04490000000001},{"Ya":38.908570000000005,"Za":-77.04446}],"instructions":"Take the 2nd <b>left</b> onto <b>O St NW</b>","start_point":{"Ya":38.90857,"Za":-77.04489999999998},"end_point":{"Ya":38.90857,"Za":-77.04446000000002}},{"distance":{"text":"197 ft","value":60},"duration":{"text":"1 min","value":10},"end_location":{"Ya":38.90898,"Za":-77.04403000000002},"polyline":{"points":"qinlFzvfuMcA_AKSAA"},"start_location":{"Ya":38.90857,"Za":-77.04446000000002},"travel_mode":"DRIVING","encoded_lat_lngs":"qinlFzvfuMcA_AKSAA","path":[{"Ya":38.908570000000005,"Za":-77.04446},{"Ya":38.908910000000006,"Za":-77.04414000000001},{"Ya":38.908970000000004,"Za":-77.04404000000001},{"Ya":38.90898,"Za":-77.04403}],"lat_lngs":[{"Ya":38.908570000000005,"Za":-77.04446},{"Ya":38.908910000000006,"Za":-77.04414000000001},{"Ya":38.908970000000004,"Za":-77.04404000000001},{"Ya":38.90898,"Za":-77.04403}],"instructions":"Turn <b>left</b> onto <b>New Hampshire Ave NW</b><div style=\"font-size:0.9em\">Destination will be on the right</div>","start_point":{"Ya":38.90857,"Za":-77.04446000000002},"end_point":{"Ya":38.90898,"Za":-77.04403000000002}}],"via_waypoint":[],"via_waypoints":[]}],"overview_polyline":{"points":"szslF`nkuMxBA?uD?iGbE@bCAfFC|D?dE@rBBtJAxHC|F@`H?|AEZqBb@eBd@qA~@_Bv@}@d@e@NKx@e@p@[^KnAWf@Id@M^WRS^c@bFuH|FwIbBkChA_BZi@nByCxAyBvAsBnByC`AuAvD_GzI{Mf@e@NIPCf@CPKNWFY?WMg@A_@Bo@vAeGnCyKhBoHNm@`B?vE??wAcA_AKSAA"},"summary":"34th St NW and Massachusetts Avenue Northwest","warnings":[],"waypoint_order":[],"overview_path":[{"Ya":38.9369,"Za":-77.06865},{"Ya":38.93629000000001,"Za":-77.06864},{"Ya":38.93629000000001,"Za":-77.06773000000001},{"Ya":38.93629000000001,"Za":-77.0664},{"Ya":38.93531,"Za":-77.06641},{"Ya":38.934650000000005,"Za":-77.0664},{"Ya":38.933490000000006,"Za":-77.06638000000001},{"Ya":38.93254,"Za":-77.06638000000001},{"Ya":38.93155,"Za":-77.06639000000001},{"Ya":38.93097,"Za":-77.06641},{"Ya":38.929100000000005,"Za":-77.0664},{"Ya":38.927530000000004,"Za":-77.06638000000001},{"Ya":38.926260000000006,"Za":-77.06639000000001},{"Ya":38.92481,"Za":-77.06639000000001},{"Ya":38.92434,"Za":-77.06636},{"Ya":38.924200000000006,"Za":-77.06579},{"Ya":38.924020000000006,"Za":-77.06528},{"Ya":38.92383,"Za":-77.06487000000001},{"Ya":38.92351,"Za":-77.06439},{"Ya":38.923230000000004,"Za":-77.06408},{"Ya":38.92304,"Za":-77.06389},{"Ya":38.92296,"Za":-77.06383000000001},{"Ya":38.922670000000004,"Za":-77.06364},{"Ya":38.92242,"Za":-77.0635},{"Ya":38.92226,"Za":-77.06344},{"Ya":38.92186,"Za":-77.06332},{"Ya":38.92166,"Za":-77.06327},{"Ya":38.92147000000001,"Za":-77.06320000000001},{"Ya":38.921310000000005,"Za":-77.06308},{"Ya":38.92121,"Za":-77.06298000000001},{"Ya":38.92105,"Za":-77.06280000000001},{"Ya":38.91991,"Za":-77.06125},{"Ya":38.91864,"Za":-77.05953000000001},{"Ya":38.91814,"Za":-77.05883},{"Ya":38.917770000000004,"Za":-77.05835},{"Ya":38.91763,"Za":-77.05814000000001},{"Ya":38.91707,"Za":-77.05737},{"Ya":38.91662,"Za":-77.05676000000001},{"Ya":38.916180000000004,"Za":-77.05618000000001},{"Ya":38.915620000000004,"Za":-77.05541000000001},{"Ya":38.915290000000006,"Za":-77.05498},{"Ya":38.914370000000005,"Za":-77.0537},{"Ya":38.91263,"Za":-77.05132},{"Ya":38.91243,"Za":-77.05113},{"Ya":38.91235,"Za":-77.05108000000001},{"Ya":38.91226,"Za":-77.05106},{"Ya":38.912060000000004,"Za":-77.05104},{"Ya":38.911970000000004,"Za":-77.05098000000001},{"Ya":38.91189,"Za":-77.05086},{"Ya":38.91185,"Za":-77.05073},{"Ya":38.91185,"Za":-77.05061},{"Ya":38.91192,"Za":-77.05041},{"Ya":38.911930000000005,"Za":-77.05025},{"Ya":38.911910000000006,"Za":-77.05001},{"Ya":38.91147,"Za":-77.04870000000001},{"Ya":38.91075,"Za":-77.04665},{"Ya":38.91022,"Za":-77.04513},{"Ya":38.910140000000006,"Za":-77.04490000000001},{"Ya":38.909650000000006,"Za":-77.04490000000001},{"Ya":38.908570000000005,"Za":-77.04490000000001},{"Ya":38.908570000000005,"Za":-77.04446},{"Ya":38.908910000000006,"Za":-77.04414000000001},{"Ya":38.908970000000004,"Za":-77.04404000000001},{"Ya":38.90898,"Za":-77.04403}]}],"status":"OK","Db":{"origin":{"Ya":38.93689596649712,"Za":-77.0686977832143},"destination":{"Ya":38.908826,"Za":-77.04382099999998},"travelMode":"DRIVING","unitSystem":1}};