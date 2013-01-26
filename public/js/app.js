(function() {
    this.App = (function() {

        App.prototype.defaults = {
            placesContainerSelector: 'div.places-container',
            placesSelector: 'div.places-container ul.places',
            inputContainerSelector: 'div.input-container',
            inputSelector: 'div.input-container input#input',
            submitSelector: 'div.input-container div#submit',
            helpSelector: 'div.help-callout h6',
            errorContainerSelector: 'div.error-container',
            errorSelector: 'div.error-container #error',
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
            this.help = $(this.options.helpSelector);
            this.errorContainer = $(this.options.errorContainerSelector);
            this.error = $(this.options.errorSelector);

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
            this.handleNoPlaces = _.bind(this.handleNoPlaces, this);
            this.handleAutoComplete = _.bind(this.handleAutoComplete, this);
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

            this.options.mapSpinner.stop();
            this.map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

            this.directionsDisplay.setMap(this.map);

            if (this.destination && this.destination !== "") {
                var places = this.findPlaces(this.destination, this.handlePlaces);
            } else {
                this.showInput();
            }
        };

        App.prototype.findPlaces = function(keyword, callback) {

            if (this.localSearch === undefined) {
                this.localSearch = new google.search.LocalSearch();
            }

            this.localSearch.setCenterPoint(this.location);
            this.localSearch.setResultSetSize(5);

            this.localSearch.setSearchCompleteCallback(this, callback, null);

            this.localSearch.execute(decodeURIComponent(keyword));
        };

        App.prototype.handlePlaces = function() {
            var _this = this;

            this.options.placesSpinner.stop();

            if (this.localSearch.results && this.localSearch.results.length > 0) {
                var places = this.localSearch.results;
                _.each(places.slice(0, 5), function(p, i) {
                    var place = new Place(p, i, _this);
                    _this.places.push(place);
                    place.render(_this.placesContainer.find('ul.places'));
                    _this.attachPlaceHandlers(place);
                });

                this.currentPlace = this.places[0];
                this.currentPlace.expand();
            } else {
                this.handleNoPlaces();
            }
        };

        App.prototype.handleNoPlaces = function() {
            this.autoComplete = this.autoComplete || new google.maps.places.AutocompleteService();

            this.autoComplete.getQueryPredictions(
                {
                    input: this.destination,
                    bounds: convertToLatLngBounds(this.location)
                },
                this.handleAutoComplete
            );
        };

        App.prototype.handleAutoComplete = function(predictions, status) {
            var _this = this;
            if(status != google.maps.places.PlacesServiceStatus.OK) {
                this.handleError(status);
                return;
            }

            this.placesContainer.prepend('<h4 class="no-results">No locations were found.</h4><h6 class="no-results">Here are a few suggestions:</h6>');

            _.each(predictions, function(prediction, i) {
                var sugg = new Suggestion(prediction, i);
                sugg.render(_this.placesContainer.find('ul.places'));
            });
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
            var code = e.keyCode || e.which;
            // Enter submits the form
            if(code === this.options.enterKeyCode && this.inputShown) {
                this.submitInput();
                return;
            }

            // ESC closes the input
            if (code == this.options.escKeyCode && this.inputShown) {
                this.hideInput();

                // show the first route
                this.changePlace(undefined, this.places[0]);
                return;
            }

            // Any typing opens up the form
            if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90)) {
                this.showInput();

                // hide the current shown route
                this.changePlace(undefined, this.currentPlace);
                return;
            }

            if (!this.input.is(':focus')) this.input.focus();
        };

        App.prototype.hideInput = function(){
            this.inputShown = false;
            this.inputContainer.slideUp();
            this.input.val('');
            this.help.html('start typing');
        };

        App.prototype.showInput = function() {
            this.inputShown = true;
            this.inputContainer.show();
            this.input.focus();
            this.help.html('hit esc');
        };

        App.prototype.submitInput = function() {
            window.location = '/' + encodeURIComponent(this.input.val());
        };

        App.prototype.handleError = function(error) {
            var message;
            console.log(error);
            if (error.PERMISSION_DENIED !== undefined) {
                if (error.code === error.PERMISSION_DENIED)
                    message = "Please allow the browser to use your position.";
                else if (error.code === error.POSITION_UNAVAILABLE)
                    message = "Your position is currently unavailable. Try turning on WiFi or location services.";
                else if (error.code === error.TIMEOUT)
                    message = "The browser timed out in finding your position.";
            }
            else if (error === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT)
                message = "fromme.to has reached it's Google Maps API limit. Try again in a little while.";
            else if (error === google.maps.places.PlacesServiceStatus.ZERO_RESULTS)
                message = "No results were found.";
            this.error.html(message);
            this.help.html('type to try again');
            this.errorContainer.slideDown();
        };


        function convertToLatLngBounds(latlng) {
            var LAT_DIFF = .01;
            var LNG_DIFF = .02;

            var bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(latlng.lat() - LAT_DIFF, latlng.lng() - LNG_DIFF),
                new google.maps.LatLng(latlng.lat() + LAT_DIFF, latlng.lng() + LNG_DIFF)
            );

            return bounds;
        }

        return App;
    })();

    this.Place = (function() {

        Place.prototype.defaults = {
            baseHTML: "<li class='place'><div class='summary-container' style='display:none;'><h6 class='place-number'></h6><div class='place-info'><h6 class='summary'></h6><p class='location'></p></div><div class='clear'></div></div><div class='route-container'></div></li>",
            summaryContainerSelector: 'div.summary-container',
            summarySelector: 'div.place-info h6.summary',
            indexSelector: 'h6.place-number',
            routeContainerSelector: 'div.route-container',
            colors: [
                'rgb(38,174,144)',
                'rgb(29, 36, 48)',
                'rgb(213, 51, 37)',
                'rgb(33, 93, 229)',
                'rgb(230, 0, 120)',
                'rgb(46, 172, 243)'
            ]
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
            this.summaryContainer.find(this.options.indexSelector).append(this.index);
            this.summary.append(this.options.title);
            this.summaryContainer.find('p.location').append(this.options.addressLines[0] + ' ' + this.options.addressLines[1]);
            this.summaryContainer.css('background', this.options.colors[this.index - 1]);

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
            var placeLatLong = new google.maps.LatLng(this.options.lat, this.options.lng);

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
            directionsSelector: 'ul.directions',
            mobileContainerSelector: 'div.mobile-container',
        };

        function Route(options) {
            this.options = _.defaults(options, this.defaults);

            this.$html = $(this.options.baseHTML);
            this.directions = this.$html.find(this.options.directionsSelector);
            this.mobileContainer = $(this.options.mobileContainerSelector);

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

            if ($(window).width() < 780) {
                this.mobileContainer.append(this.$html);
            } else {
                container.append(this.$html);
            }

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

    this.Suggestion = (function(Place) {

        Suggestion.prototype = new Place({});


        function Suggestion(options, index) {
            this.options = _.defaults(options, this.defaults);
            this.options.mobileContainerSelector = 'div.mobile-container';
            this.index = index + 1;
            this.expanded = false;

            this.$html = $(this.options.baseHTML);
            this.$html.addClass('suggestion');
            this.summaryContainer = this.$html.find(this.options.summaryContainerSelector);
            this.summary = this.summaryContainer.find(this.options.summarySelector);
            this.routeContainer = this.$html.find(this.options.routeContainerSelector);
            this.mobileContainer = $(this.options.mobileContainerSelector);

            this.render = _.bind(this.render, this);
            this.collapse = _.bind(this.collapse, this);
            this.expand = _.bind(this.expand, this);
            this.attachHandlers = _.bind(this.attachHandlers, this);
            this.summaryClick = _.bind(this.summaryClick, this);
            this.generateRoute = _.bind(this.generateRoute, this);
            this.handleDirections = _.bind(this.handleDirections, this);
        }

        Suggestion.prototype.render = function(container) {
            this.summaryContainer.find(this.options.indexSelector).append(this.index);
            this.summary.append(this.options.description);
            this.summaryContainer.css('background', this.options.colors[this.index - 1]);

            if ($(window).width() < 780) {
                this.mobileContainer.append(this.$html);
            } else {
                container.append(this.$html);
            }

            this.attachHandlers(container);

            this.summaryContainer.show();
        };

        Suggestion.prototype.attachHandlers = function() {
            var _this = this;
            this.summaryContainer.click(function() {
                window.location = '/' + encodeURIComponent(_this.options.description);
            });
        };

        return Suggestion;
    })(this.Place);

}).call(this);
