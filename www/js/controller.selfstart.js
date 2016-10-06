angular.module('epicmobile.controller.selfstart', [])
  
  .controller("Selfstart", function($scope, $state, $ionicPopup, $db, $epic, $cordovaGeolocation, $sapRequest, $ionicLoading, $timeout){

    $scope.selfstart = {
      unit: "",
      unitName: "",
      location: "",
      location2: "",
      geox: "",
      geoy: "",
      streetNumber: "",
      street: "",
      suburb: "",
      town: ""
    };
    
    var query = 'SELECT * FROM Unit WHERE Unit.UnitId = ' + JSON.parse(localStorage.getItem("User")).UnitID; 
    $db.read(query, function(unit){      
      $scope.selfstart.unit = unit.UnitId;
      $scope.selfstart.unitName = unit.UnitName;
    });

    $scope.submit = function(){      

      // check that address or geolocation is filled in
      if($scope.selfstart.geox === "" || $scope.selfstart.geoy === ""){
        if($scope.selfstart.streetNumber === "" ||
          $scope.selfstart.street === "" ||
          $scope.selfstart.suburb === ""){

          $ionicPopup.alert({
            title: 'Error',
            template: "No Geolocation obtained. Please ensure that you have filled in the address."
          });     
          return;
        }
      }

      $ionicPopup.confirm({
        scope: $scope,
        title: 'Confirmation',
        template: 'Are you sure you would like to start this incident?'
      }).then(function(res) {
        if (res) {
          $ionicLoading.show({ template: "Submitting Incident" });

          // get date and time
          var currentdate = new Date();    
          var thisDate = $epic.convertToSAPDate(currentdate);
          var thisTime = $epic.convertToSAPTime(currentdate);

          // pack payload for POST
          var startTaskPayload = {
            "d" : {
              "UnitID" : $scope.selfstart.unit.toString(),
              "Location" : $scope.selfstart.location.toString(),
              "AddLocation" : $scope.selfstart.location2.toString(),
              "GeoX" : $scope.selfstart.geox.toString(),
              "GeoY" : $scope.selfstart.geoy.toString(),
              "StreetNo" : $scope.selfstart.streetNumber.toString(),
              "Street" : $scope.selfstart.street.toString(),
              "Suburb" : $scope.selfstart.suburb.toString(),
              "Town" : $scope.selfstart.town.toString(),
              "Date" : thisDate.toString(),
              "Time" : thisTime.toString(),
              "Partner": JSON.parse(localStorage.getItem("User")).Partner
            }          
          };
          
          $sapRequest.request({
            method: "POST",
            requestUri: "SelfStartTaskSet",
            data: startTaskPayload
          }, 
          function(data){   
            $ionicLoading.hide();
            /*
            $ionicPopup.confirm({
                scope: $scope,
                title: 'Incident Submitted',
                template: 'Would you like to go to your tasklist?'
              }).then(function(res) {
                if (res) {
                  $state.go("tasklist");
                }
              });            
            */
            $state.go("tasklist");
          }, function(err){

            $offlineStorage.storeOffline(request, "SelfStart", err);

            $ionicLoading.hide();
            $ionicPopup.alert({
              title: 'Error',
              template: err
            });            
          }, "Self-start Incident");
        }
      });
    }
    
    $scope.getGeolocation = function(){

      // get photo geolocation and update asynchronously
      if(window.cordova){
        $ionicLoading.show({ template: "Retrieving Location" });
        $cordovaGeolocation.getCurrentPosition({ timeout: 5000, enableHighAccuracy: true })
          .then(function (position) {
            $ionicLoading.hide();
            $timeout(function(){
              $scope.selfstart.geox = position.coords.latitude;
              $scope.selfstart.geoy = position.coords.longitude;
            });            
         }, function(err) {
          $ionicLoading.hide();
          $ionicPopup.alert({
            title: 'Error',
            template: "Unable to retrieve Geolocation."
          }); 
        });
      }
    }
    $scope.getGeolocation();

  });  