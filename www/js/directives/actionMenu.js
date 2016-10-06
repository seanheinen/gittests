
angular.module('epicmobile.directives.actionMenu', [])

    .directive('cta', function ($document, $rootScope, $timeout, $ionicScrollDelegate, $state) {

      var timer = null;

      return {
        restrict: 'A',
      link: function ($scope, $element, $attr) {
        
        // hide action button
        $element.bind('touchstart', function(e) {
            //var cta = $document[0].body.querySelector('#floating-action');            
            var cta = $document[0].body.querySelectorAll('.floating-action');            
            angular.element(cta).addClass('on');

            // jiffy due to touchstop and stop scroll not working
            timer = setTimeout(function(){                                  
            //var cta = $document[0].body.querySelector('#floating-action');
            var cta = $document[0].body.querySelectorAll('.floating-action');
            angular.element(cta).removeClass('on');                 
          }, 1500);


        });
        
        /*
        does work at all because of smet android native browser

        $element.bind('touchend', function(e) { showActionButton() });
        $element.bind('scroll', function(e) { showActionButton() });
      
        // show action button - delay before showing
        function showActionButton(){
          clearTimeout(timer);
          timer = setTimeout(function(){                      
            alert("test");
            var cta = $document[0].body.querySelector('#checkin-floating-action');
            angular.element(cta).removeClass('on');                 
          }, 1500);
        }
        */
      }
    }
});
    