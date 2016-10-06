/********************************************************************************
 * Create Date: 12/09/2015 Company: EOH Mobility Author: Development Team
 ******************************************************************************/
(function(){

  // the 2nd parameter is an array of 'requires'
  angular.module('epicmobile', [ 
    'ionic',     
    'monospaced.elastic',
    'ngCordova',
    'ui.router',
    'templateCache',
    'epicmobile.services',
    'epicmobile.controllers',
    'epicmobile.controller.help',
    'epicmobile.controller.splash',
    'epicmobile.controller.settings',
    'epicmobile.controller.login',
    'epicmobile.controller.changepassword',
    'epicmobile.controller.checkin',
    'epicmobile.controller.status',
    'epicmobile.controller.tempbase',
    'epicmobile.controller.selfstart',
    'epicmobile.controller.tasklist',
    'epicmobile.controller.taskview',
    'epicmobile.controller.task',
    'epicmobile.controller.resolution',
    'epicmobile.controller.offline',
    'epicmobile.controller.resync',
    'epicmobile.directives.actionMenu'
  ])

  .value("Debug", {
    log: function(error){

      try{

        // format time
        var errorDate = error.date;      
        
        var pad = "00";
        var month = pad.substring(0, pad.length - (errorDate.getMonth()+1).toString().length) + (errorDate.getMonth()+1).toString();
        var day = pad.substring(0, pad.length - errorDate.getDate().toString().length) + errorDate.getDate().toString();
        error.date = errorDate.getFullYear().toString() + month + day;

        var hour = pad.substring(0, pad.length - errorDate.getHours().toString().length) + errorDate.getHours().toString();
        var minute = pad.substring(0, pad.length - errorDate.getMinutes().toString().length) + errorDate.getMinutes().toString();
        var second = pad.substring(0, pad.length - errorDate.getSeconds().toString().length) + errorDate.getSeconds().toString();
        error.time = hour + minute + second

        // push to db

        // push to SAP
        var pushData = {
          "d":{
            "IMEI": localStorage.getItem("IMEI"),
            "UserID": JSON.parse(localStorage.getItem("User")).username,
            "Date": error.date,
            "Time": error.time,
            "Module": error.type,
            "Screen": error.url,
            "Cause": error.cause,
            "Error": error.message,
            "Stack": error.stack + " - local storage user: " + localStorage.getItem("User")
          }
        };

        // get url and username password
        var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));          
        var credentials = localStorage.getItem("Credentials");

        // //get tokem    
        var requestUri = applicationContext.applicationEndpointURL;
        OData.request({
          headers : { 
            "Authorization" :   credentials,
            "X-CSRF-Token"  : "Fetch"
          },
          method: "GET",
          requestUri: requestUri  
        },
        function(data, response){
          var token = response.headers["x-csrf-token"];

          var request = {
            method: "POST",
            requestUri: applicationContext.applicationEndpointURL + "/ErrorLogSet",
            data: pushData 
          };
          request.headers = {};
          request.headers["Authorization"] = credentials;
          request.headers["X-CSRF-Token"] = token;
          request.headers["Content-Type"] = "application/json";
          OData.request(request,              
          function(data){            
            console.log("logged to sap");
          },
          function(err){                    
            console.log("not logged to sap");
          }); 

        }, function(err){
          console.log("error retrieving token");
        });  
      } catch(ex){
        
      }
    }
  })

  .run(['$ionicPlatform', '$ionicPopup', '$state', '$db', '$smp', '$ionicLoading', function($ionicPlatform, $ionicPopup, $state, $db, $smp, $ionicLoading) {

    // cordova ready
    $ionicPlatform.ready(function() {  
        
      localStorage.setItem("Online","true");

      localStorage.setItem("RefreshApp", "false");

      // initiate database
      $db.init();
    });    

    // Disable BACK button on home
    $ionicPlatform.registerBackButtonAction(function(event) {

      // login page to exit app
      if( $state.current.name === "login" ){        

        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to exit application?'
        }).then(function(res) {
          if (res) {
            ionic.Platform.exitApp();  
          }
        })
        return;
      } 

      // perpare app back
      if( $state.current.name === "prepare" ){        

        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to cancel login?'
        }).then(function(res) {
          if (res) {
            // cancel login if possible


            $state.go('login');
          }
        })
        return;
      } 

      // checkin page to logout
      if( $state.current.name.indexOf("checkin") >= 0  ){        

        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to log off?'
        }).then(function(res) {
          if (res) {
            $ionicLoading.show({ template: 'Logging out'});
            $smp.logout(function(response){
              $ionicLoading.hide();
              $state.go("login");
            }, function(err){
              $ionicLoading.hide();
              $state.go("login");
            });
          }
        })
        return;
      }

      // status to checkin page
      if( $state.current.name.indexOf("status") >= 0  ){                
        $state.go('checkin.details');        
        return;
      }

      // tasklist page to status
      if( $state.current.name === "tasklist" ){                
        $state.go('status');     
        return;   
      }

      // incident page to tasklist
      if( $state.current.name.indexOf("task") >= 0  ){       
        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to exit this task?'
        }).then(function(res) {
          if (res) {
            $state.go('tasklist');
          }
        })
        return;
      }

      // resolution page to task
      if( $state.current.name === "resolution" ){        

        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to go back to this task?'
        }).then(function(res) {
          if (res) {
            $state.go("task.details");
          }
        })
        return;
      }       

      // otherwise
      window.history.back();            

    }, 100);

  }])
  
  /// router options below - all screens for application
  .config(['$stateProvider', '$urlRouterProvider', '$provide', function($stateProvider, $urlRouterProvider, $provide) {    

    $provide.decorator("$exceptionHandler", ['$delegate', '$window', 'Debug', function($delegate, $window, Debug) {

    var debug = Debug;

    return function (exception, cause) {      

        // get date and time
        var currentdate = new Date();    
        
        var data = {
          type: 'angular',
          url: window.location.hash,
          date: currentdate,
          cause: "",
          message: "", 
          name: "",
          stack: ""
        };

        if(cause)               { data.cause    = cause;              }
        if(exception){
          if(exception.message) { data.message  = exception.message;  }
          if(exception.name)    { data.name     = exception.name;     }
          if(exception.stack)   { data.stack    = exception.stack;    }
        }

        // if prep go back to login
        if( window.location.hash.indexOf("prepare") >= 0  ){                
          window.history.back();
        }
        alert('Critical Error: An unexpected error occurred. Please contact your Administrator - ' + exception.message);

        // log if past prep screen (user must be logged in)
        //if( window.location.hash.indexOf("prepare") < 0 && window.location.hash.indexOf("login") < 0  ){                
          debug.log(data);
        //}
        
        // Pass the error through to the delegate
        // continue to log it console as ionic typically does
        $delegate(exception, cause);
      }
    }]);
    
      // if none of the above states are matched, use this as the fallback
      $urlRouterProvider.otherwise('splash');

      // define states - this changes pages
      $stateProvider

        .state('splash', {
          url: '/splash',      
          templateUrl: 'splash.html',
          controller: 'Splash'
        })        

        .state('settings', {
          url: '/settings',      
          templateUrl: 'settings.html',
          controller: 'Settings'
        })        

        .state('login', {
          url: '/login',      
          templateUrl: 'login.html',
          controller: 'Login'
        })

        .state('changepassword', {
          url: '/changepassword',      
          templateUrl: 'changePassword.html',
          controller: 'ChangePassword'
        })

        .state('prepare', {
          url: '/prepare',      
          templateUrl: 'prepare.html',
          controller: 'Prepare'
        })

        .state('search', {
          url: '/search',          
          templateUrl: 'search.html',
          params: {
            searchTitle: null,            
            searchScope: null,
            searchKeys: null,
            searchOrder: null,
            resultTemplate: null,
            clickAction: null
          },
          controller: "Search"
        })

        .state('dropdown', {
          url: '/dropdown',          
          templateUrl: 'dropdown.html',
          params: {
            dropdownTitle: null,            
            dropdownScope: null,
            displayField: null,
            resultTemplate: null,
            clickAction: null
          },
          controller: "Dropdown"
        })        

        .state('person', {
          url: '/person',          
          templateUrl: 'personProfile.html',
          params: {
            person: null
          },
          controller: "PersonProfile"
        })        

        .state('vehicle', {
          url: '/vehicle',          
          templateUrl: 'vehicleProfile.html',
          params: {
            vehicle: null
          },
          controller: "VehicleProfile"
        })

        // checkin screens
        .state('checkin', {
          url: '/checkin',          
          templateUrl: 'checkin.html',
          abstract: true,
          controller: 'Checkin'
        })

        .state('checkin.overview', {
          url: '/overview',
          views: {
            'checkin-overview': {
              templateUrl: 'checkin-overview.html',                
            }
          }
        })

        .state('checkin.detail', {
          url: '/detail',
          views: {
            'checkin-detail': {
              templateUrl: 'checkin-detail.html',                
            }
          }
        })

        .state('checkin.proficiencies', {
          url: '/proficiencies',
          views: {
            'checkin-proficiencies': {
              templateUrl: 'checkin-proficiencies.html',
            }
          }          
        })

        .state('selfstart', {
          url: '/selfstart',          
          templateUrl: 'selfstart.html',          
          controller: 'Selfstart'
        })

        .state('status', {
          url: '/status',          
          templateUrl: 'status.html',          
          controller: 'Status'
        })

        .state('tempbase', {
          url: '/tempbase',          
          templateUrl: 'temp-base.html',          
          controller: 'TempBase'
        })

        .state('tasklist', {
          url: '/tasklist',          
          templateUrl: 'tasklist.html',
          controller: 'TaskList'
        })

        .state('taskview', {
          url: '/task-view',          
          templateUrl: 'task-view.html',          
          controller: 'TaskView'
        })

        .state('task', {
          url: '/task',          
          templateUrl: 'task.html',
          abstract: true,
          controller: 'Task'
        })

        .state('task.details', {
          url: '/details',
          views: {
            'task-details': {
              templateUrl: 'task-details.html',                
            }
          }
        })

        .state('task.caller', {
          url: '/caller',
          views: {
            'task-caller': {
              templateUrl: 'task-caller.html',                
            }
          }
        })

        .state('task.units', {
          url: '/units',
          views: {
            'task-units': {
              templateUrl: 'task-units.html',                
            }
          }
        })

        .state('task.navigate', {
          url: '/navigate',
          views: {
            'task-navigate': {
              templateUrl: 'task-navigate.html',
            }
          }          
        })

        .state('task.media', {
          url: '/media',
          views: {
            'task-media': {
              templateUrl: 'task-media.html',
            }
          }          
        })

        .state('task.form', {
          url: '/form',
          views: {
            'task-form': {
              templateUrl: 'task-form.html',
            }
          }          
        })

        .state('help', {
          url: '/help',          
          templateUrl: 'help.html',          
          controller: 'Help'
        })

        .state('changestatus', {
          url: '/changestatus',          
          templateUrl: 'changeStatus.html'
        })

        .state('offline', {
          url: '/offline',          
          templateUrl: 'offline.html',
          controller: 'Offline'
        })

        // Closure screens
        .state('resolution', {
          url: '/resolution',          
          templateUrl: 'resolution.html',
          controller: 'Resolution'
        })

        // resync screen
        .state('resync', {
          url: '/resync',          
          templateUrl: 'resync.html',
          controller: 'Resync'
        })
  }]);

})();