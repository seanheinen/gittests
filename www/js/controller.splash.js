angular.module('epicmobile.controller.splash', [])
  
  .controller("Splash", function($scope, $timeout, $ionicPlatform, $ionicPopup, $state, $ionicHistory, $cordovaSplashscreen, $cordovaAfaria, $db){

    $timeout(function(){
      $scope.progress = "Retrieving server settings...";
      getAfariaSettings();
    }, 3500);    

    function getAfariaSettings(){

      // get afaria settings (check if afaria is defined for browser)      
      if (localStorage.getItem("Online") === "true" && typeof afaria != "undefined"){      
        $cordovaAfaria.getSettings({})
          .then(function(res){            
            // clear all old user settings if app reopened from scratchs            

            var afariaSettings = res.split(';');
            var SMPServer = afariaSettings[0].trim();
            var SMPPort = afariaSettings[1].trim();
            var AppOnline = afariaSettings[2].trim();
            
            // online/offline version
            localStorage.setItem("Online", JSON.parse(AppOnline));

            // set application id
            var appId = "za.gov.capetown.epicmobile";
            localStorage.setItem("ApplicationID", appId);

            // get and set application connection settings            
            var smpServerHost = SMPServer;
            var smpServerPort = SMPPort;            
            var smpServerProtocol = true; // https = true            
            var communicatorID = "REST";                        

            var connectionSettings = {        
              "serverHost": smpServerHost, 
              "https": smpServerProtocol,
              "serverPort": smpServerPort,
              "user": "", 
              "password": "", 
              "communicatorId": communicatorID,
              "passcode": "password",                                             
              "unlockPasscode": "password",
              "passcode_CONFIRM":"password",
              "registrationReadOnly":"true"
            };  

            localStorage.setItem("ConnectionSettings",JSON.stringify(connectionSettings));
            $state.go('login');
          }, function(err){            
            
            $ionicPopup.alert({
              title: 'Error',
              template: 'Unable to obtain server details. Please ensure that you have a connection.'
            }).then(function(res) {
              defaultSettings();   
            });           
            
          });        
      } else {
        defaultSettings();
      }     

    }

    // check if last know settings
    function defaultSettings(){

      
      // DEFAULT CONNECTION SETTINGS
      // set application id
      var appId = "za.gov.capetown.epicmobile";
      localStorage.setItem("ApplicationID", appId);
      
      // get and set application connection settings            
      var smpServerHost = "cbd-cdcxmd-ap01.capetown.gov.za";
      //gwd-edcxmp-ap01.capetown.gov.za
      var smpServerPort = "443";            
      var smpServerProtocol = true; // https = true            
      var communicatorID = "REST";            
      
      var connectionSettings = {        
        "serverHost": smpServerHost, 
        "https": smpServerProtocol,
        "serverPort": smpServerPort,
        "user": "", 
        "password": "", 
        "communicatorId": communicatorID            
      };  
      
      localStorage.setItem("ConnectionSettings", JSON.stringify(connectionSettings));

      // delay login page        
      setTimeout(function(){                    
        $state.go('login');            
      }, 500);          

      return;

      var connectionSettings = localStorage.getItem("ConnectionSettings");        
      if(connectionSettings === null){
        $ionicPopup.alert({
          title: 'Error',
          template: 'No previous server settings. Application will close.'
        }).then(function(res) {
          ionic.Platform.exitApp();
        });            
        return;
      }
      try{
        connectionSettings = JSON.parse(connectionSettings);
      } catch(ex){
        $ionicPopup.alert({
          title: 'Error',
          template: 'No previous server settings. Application will close.'
        }).then(function(res) {
          ionic.Platform.exitApp();
        });            
        return;
      }
      
      // delay login page        
      setTimeout(function(){                    
        $state.go('login');            
      }, 500);          

    }


  });  
  