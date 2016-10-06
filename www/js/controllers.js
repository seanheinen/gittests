// Ionic EpicMobile Global Controllers

angular.module('epicmobile.controllers', [])

  .config(function($ionicConfigProvider) {
    
    // put tabs at the bottom
    //$ionicConfigProvider.tabs.position('bottom');

  })  

  .run(function($db) {

  })

  // global stuff
  .controller('AppCtrl', ['$scope', '$state', '$interval', '$sapRequest', '$db', '$cordovaFile', function($scope, $state, $interval, $sapRequest, $db, $cordovaFile) {


    /********************************************************************************
    SEND DATA
    ********************************************************************************/
    // interval to send unsent data
    var appInterval = $interval(function() {      

      // get offline count
      $db.getCount('Offline', function(res){
        $scope.unsentCount = res;
        if(res > 0){

          // check for strong network
          var currentNetwork = localStorage.getItem("Network");
          if(currentNetwork === "wifi" || currentNetwork === "3g" || currentNetwork === "4g"){
            // auto push
            autoPushOffline();  
          }          
        }
      });

      // delete all media for tasks not on this phone anymore
      removeOldMedia()
      removeOldTasks()
      refreshUserDetails();
      
    }, 60000);

    function removeOldMedia(){

      // get all task media        
      var query = 'SELECT * FROM UnitTaskMedia';
      $db.select(query, function(mediaItems){

        for(var mediaInd = 0; mediaInd < mediaItems.length; mediaInd++){
          var mediaItem = mediaItems[mediaInd];

          if(mediaItem.UploadedDate === null){
            break;
          }

          // check if upload was 24 hours ago
          var uploadedDateArr = mediaItem.UploadedDate.split("/");
          var uploadedTimeArr = mediaItem.UploadedTime.split(":");
          var uploadedDate = new Date(uploadedDateArr[0], (uploadedDateArr[1] - 1), uploadedDateArr[2], uploadedTimeArr[0], uploadedTimeArr[1], 0);

          var now = new Date();

          // check if day is this week
          var msDiff = Math.abs(now-uploadedDate);
          var dayDiff = msDiff/1000/60/60/24;

          if(dayDiff >= (1/24)){ // older than hour
            deleteOldMediaItem();
          }   
          function deleteOldMediaItem(){    

            // delete media from phone
            // param1: folder
            // param2: filename
            function getFilename (url) {
              return url.split('\\').pop().split('/').pop();
            }
            function getPath (url) {
              return url.substring(0,url.lastIndexOf("/"));  
            }

            if(window.cordova){
              $cordovaFile.removeFile(getPath(mediaItem.FullPath), getFilename(mediaItem.FullPath)).then(function (success) {
                // delete from db        
                $db.delete("UnitTaskMedia", ["MediaId"], [mediaItem.MediaId]);
                console.log("Media item cleaned up");
              }, function (error) {
                console.log("Unable to cleanup media item");
              });
            }
          }   
        }
      });
    }

    function removeOldTasks(){
      // get all tasks
      var query = 'SELECT * FROM UnitTask';
      $db.select(query, function(tasks){

        for(var taskInd = 0; taskInd < tasks.length; taskInd++){
          var task = tasks[taskInd];

          if(task.TaskDateTo === ""){
            break;
          }

          // check if upload was 24 hours ago
          var checkDate = new Date(task.TaskDateTo.substring(0,4), (task.TaskDateTo.substring(4,6) - 1), task.TaskDateTo.substring(6,8), 0, 0, 0);
          var now = new Date();

          // check if day is this week
          var msDiff = Math.abs(now-checkDate);
          var dayDiff = msDiff/1000/60/60/24;

          if(dayDiff >= 3){

            // delete all related task transactions
            $db.delete("UnitTaskUnit", ["TaskID"], [task.TaskID]);            
            $db.delete("UnitTaskForm", ["TaskID"], [task.TaskID]);            
            $db.delete("UnitTaskNote", ["TaskID"], [task.TaskID]);            

            // delete from db        
            $db.delete("UnitTask", ["TaskID"], [task.TaskID]);            
          }   
        }
      });

    }

    function refreshUserDetails(){

      // if prepare or login dont refresh user details
      if( $state.current.name === "login" || $state.current.name === "prepare" ){        
        return;
      }

      var username;
      try{
        var userDetails = JSON.parse(localStorage.getItem("User"));     
        username = userDetails.username; 
      } catch(ex){
        return;
      }

      $sapRequest.request({
        method: "GET",
        requestUri: "UserSet('" + userDetails.username + "')?$expand=UserToUserUnit/UserUnitToUnit,UserToEmployee"
      }, 
      function(data){

        // get logged in employee details
        var employeeInfo = data.UserToEmployee;

        if(typeof employeeInfo == "undefined" || employeeInfo === null){
          return;
        }

        // set logged in user details
        userDetails.UserID = data.UserID;
        userDetails.UserFirstName = data.FirstName;
        userDetails.UserLastName = data.LastName;
        userDetails.Partner = data.Partner;        
        userDetails.PersalNr = employeeInfo.PersalNr;
        userDetails.EmployeeType = employeeInfo.EmployeeType;
        userDetails.IDNR = employeeInfo.IDNR;
        userDetails.DepartmentID = employeeInfo.DepartmentID;
        userDetails.SectionID = employeeInfo.SectionID;
        userDetails.SubSectionID = employeeInfo.SubSectionID;
        userDetails.DistrictID = employeeInfo.DistrictID;
        userDetails.BaseID = employeeInfo.BaseID;

        // get current unit and check user role
        for(var unitInd = 0; unitInd < data.UserToUserUnit.results.length; unitInd++){
          var thisUnit = data.UserToUserUnit.results[unitInd];

          if(thisUnit.UnitID === userDetails.UnitID){
            //$scope.apply(function(){
              userDetails.Role = thisUnit.Role;  
            //});            
            break;
          }
        }

        localStorage.setItem("User", JSON.stringify(userDetails));

      }, function(err){

      });
    }    

    function autoPushOffline(){
      var query = 'SELECT * FROM Offline WHERE Sync = "true"';
      $db.select(query, function(list){
        // double check if there are items        
        if(list < 1){                  
          return;
        }
        uploadUnsent(list);
      });

      function uploadUnsent(list){

        var requestInd = 0;
        iterateRequest();
        function iterateRequest(){

          // check if requests are done
          if(requestInd === list.length){            
            return;
          }

          doRequest(list[requestInd], function(){
            // success
            requestInd++;
            iterateRequest();
          }, function(err){            

          });
        }

        function doRequest(transaction, success, error){
      
          if(transaction.Type === "Photo" || transaction.Type === "Video" || transaction.Type === "Sound"){
            // get media items associated task
            var mediaItem = JSON.parse(transaction.Payload);

            var query = 'SELECT *, ' + 
            'UnitTask.IncidentId ' +
            'FROM UnitTaskMedia ' + 
            'LEFT OUTER JOIN UnitTask ON UnitTaskMedia.TaskId = UnitTask.TaskID ' +
            'WHERE MediaId = ' + mediaItem.MediaId;
            $db.read(query, function(media){
              if(media === null){
                //delete this transaction since it doesnt exist? not sure why this is here
                return;
              }            
              uploadMedia(media, transaction, function(){
                success();
              }, function(){
                error();
              });  
            });            
          } else {
            // sync transactional data       
            $sapRequest.request(JSON.parse(transaction.Payload), function(data){
              
              $scope.sentCount++;

              // delete trans from DB            
              $db.delete("Offline", ["TransId"], [transaction.TransId], function(){                              
                success();   
              });              
            }, function(){   

            });
          }

        }
      }

      function getCurrentDate(){
        // get date and time
        var date = new Date();

        var pad = "00";
        var month = pad.substring(0, pad.length - (date.getMonth()+1).toString().length) + (date.getMonth()+1).toString()
        var day = pad.substring(0, pad.length - date.getDate().toString().length) + date.getDate().toString()
        var formattedDate = date.getFullYear().toString() + '/' + month + '/' + day
        return formattedDate;
      }

      function getCurrentTime(){
        // get date and time
        var date = new Date();

        var pad = "00";      
        var hour = pad.substring(0, pad.length - date.getHours().toString().length) + date.getHours().toString();
        var minute = pad.substring(0, pad.length - date.getMinutes().toString().length) + date.getMinutes().toString();
        var second = pad.substring(0, pad.length - date.getSeconds().toString().length) + date.getSeconds().toString();
        var formattedTime = hour+ ':' + minute      
        return formattedTime;
      }
      
      function uploadMedia(media, transaction, success, error){
        
        // get token first
        $sapRequest.getToken(function(token){

          var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));      
          var url = applicationContext.applicationEndpointURL + "/FileSet(FileName='" + media.FileName + "',IncidentID='" + media.IncidentId + "')/$value";                  
          var targetPath = media.FullPath;
          var trustHosts = true;
          
          function win(r) {      

            $scope.sentCount++;    

            // flag as uploaded
            var columns = [ 
              "Uploaded",
              "UploadedDate",
              "UploadedTime",
            ];        
            var values = [ 
              "true",
              getCurrentDate(),
              getCurrentTime(),
            ];           
            $db.update("UnitTaskMedia", ["MediaId"], [media.MediaId], columns, values);

            // delete trans from DB
            $db.delete("Offline", ["TransId"], [transaction.TransId], function(){                          
              transaction.sent = true;
              success();      
            });              
          }
          function fail(error) {
            error();
          }

          var options = new FileUploadOptions();
          options.fileKey = "file";
          options.fileName = media.FileName;
          options.mimeType = media.Type;
          options.chunkedMode = false;
          options.httpMethod = "PUT"; 
          options.trustAllHosts = true;

          var credentials = localStorage.getItem("Credentials");
          var headers = { 
            "Authorization" : credentials,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': media.Type,
            'X-CSRF-Token': token
          };      
          options.headers = headers;                  

          var ft = new FileTransfer();
          
          ft.upload(targetPath, url, win, fail, options);

        }, function(err){
          error();
        });
      }
    }


    // back history
    $scope.$back = function() { 
      window.history.back();      
    };
  }])

  // dropdown controller
  .controller("Dropdown", function($scope, $state, $stateParams, $epic){
  
    // set scope
    $scope.dropdownTitle = $stateParams.dropdownTitle;
    $scope.dropdownScope = $stateParams.dropdownScope;    
    $scope.displayField = $stateParams.displayField;
    $scope.resultTemplate = $stateParams.resultTemplate;

        // employee photo logic
    $scope.getUnitEmployeePhoto = $epic.getUnitEmployeePhoto;

    // do search filter
    $scope.searchFilter = {};
    $scope.$watch(function () {
      return [$scope.dropdownInput];
    }, function () {
      $scope.searchFilter = {};
      if ($scope.dropdownInput) {
        $scope.searchFilter[$scope.displayField] = $scope.dropdownInput;
      }
    }, true);

    // click result action
    $scope.dropdownClick = $stateParams.clickAction;
  })  

  // side menu controller
  .controller("epic-sidemenu", function($scope, $state, $stateParams, $ionicPopup, $epic, $db, $cordovaNetwork, $smp, $ionicLoading, $timeout, $interval){

    // android network quirk
    var networkChangeFiredAlready = false;

    $scope.sidemenuMarkup = "sidemenu.html";

    // do online/Offline
    if (window.cordova) {
      var currentNetwork = $cordovaNetwork.getNetwork();
      localStorage.setItem("Network", currentNetwork);      

      $scope.networkStatusClass = "network-status-online";
      $scope.networkStatus = "Online - " + currentNetwork;
     
      // listen for Online event
      $scope.$on('$cordovaNetwork:online', function(event, networkState){        

        // android quirk - ensure this runs only once
        if(networkChangeFiredAlready){
          return;
        }
        networkChangeFiredAlready = true;

        // set change event check back to false after 10 seconds (dirty but works)
        $timeout(function(){
          networkChangeFiredAlready = false;
        }, 10000);
        
        localStorage.setItem("Network", $cordovaNetwork.getNetwork());
        switch(networkState){          
          case "2g":
            $scope.networkStatusClass = "network-status-limited";  
            $scope.networkStatus = "Limited - " + networkState;          
            break
          case "wifi":
            $scope.networkStatusClass = "network-status-online";
            $scope.networkStatus = "Online - " + networkState;

            if($scope.unsentCount > 0){
              // prompt user to go to offline data
              $ionicPopup.confirm({
                title: 'Confirmation',
                template: 'You have unsent data. Would you like to go to manage your unsent data?'
              }).then(function(res) {
                if (res) {
                  $state.go("offline");                
                }
              });
            }            

            break;
          default:
            $scope.networkStatusClass = "network-status-online";  
            $scope.networkStatus = "Online - " + networkState;  
            break;
        }
      })

      // listen for Offline event
      $scope.$on('$cordovaNetwork:offline', function(event, networkState){
        localStorage.setItem("Network", $cordovaNetwork.getNetwork());
        $scope.networkStatusClass = "network-status-offline";
        $scope.networkStatus = "Offline"; 
      })

    } else {
      $scope.networkStatusClass = "network-status-limited";
      $scope.networkStatus = "Unknown"; 
    }
    
    // set user details for side menu  
    $scope.userDetails = JSON.parse(localStorage.getItem("User"));
    $scope.userPhoto = $epic.getUnitEmployeePhoto($scope.userDetails);


    $scope.goHelp = function(){
      $state.go("help");  
    }
    
    // view person - profile pages
    $scope.goProfile = function(item){            

      var query = 'SELECT * FROM Employee WHERE Partner = "' + item.Partner + '"'
      $db.read(query, function(employeeInfo){
        if(!employeeInfo)
          return;

        $state.go("person", {
          person: employeeInfo
        });
      });
    }

    $scope.goOffline = function(){      
      $state.go("offline");      
    }

    $scope.goStatus = function(){
      $state.go("status");  
    }

    // side menu navigation
    $scope.goTaskList = function(){
      $state.go("tasklist"); 
    }

    $scope.goUnit = function(){
      $state.go("checkin.overview");  
    }

    $scope.Logout = function(){
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
    }

    $scope.SelfStart = function(){
      if(JSON.parse(localStorage.getItem("User")).Role === "COMMANDER"){
        $state.go("selfstart");  
      } else {
        $ionicPopup.alert({
          title: 'Insufficient Permissions',
          template: "You do not have sufficient rights to Self Start an Incident as a Unit Member."
        });
      }      
    }

    $scope.RefreshAll = function(){

      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to resync the application?'
      }).then(function(res) {
        if (res) {

          $state.go("resync");

          var currentTimestap = new Date();          
          localStorage.setItem("LastSyncTime", currentTimestap);

          return;

          // do refresh          
          $state.go("prepare");

          // set last synces time
          var currentTimestap = new Date();
          //currentTimestap = JSON.stringify(currentTimestap);              
          localStorage.setItem("LastSyncTime", currentTimestap);
          localStorage.setItem("PrepRefresh","false");
          localStorage.setItem("RefreshApp", "true");

        }
      });
      
    }

    // interval to calculate whether there is unsent data/tasks    
    var sidemenuInterval = $interval(function() {      
      doLastTimeSync();
    }, 10000);

    // run check when changing screen (since there are UI aspects that need refreshing)
    doLastTimeSync();
    function doLastTimeSync(){

      // check unit id is defined
      try{
        var unitId = JSON.parse(localStorage.getItem("User")).UnitID;
      } catch(ex){
        return;
      }

      getUnitStatus(unitId);

      // DO LAST REFRESH CALCULATION
      // check time difference in last sync
      var lastTimeSync = new Date(localStorage.getItem("LastSyncTime"));

      // check current time with last refresh time
      var now = new Date();
      var timeDiff = Math.abs(now-lastTimeSync);

      $scope.lastRefresh = {};    
      var minute = Math.floor(timeDiff/1000/60);
      minute = minute % 60;
      var hour = Math.floor(timeDiff/1000/60/60);
      hour = hour % 60;
      var day = Math.floor(timeDiff/1000/60/60/24);          

      $scope.lastRefresh.minute = minute;
      $scope.lastRefresh.hour = hour;
      $scope.lastRefresh.day = day;

      // get offline count
      $db.getCount('Offline', function(res){
        $scope.unsentCount = res;
      });

      // get task count
      var query = 'SELECT rowid, Resolved FROM UnitTask WHERE UnitId = "' + unitId + '"';
      $db.select(query, function(tasks){
        var activeTaskCount = 0;
        for(var taskInd = 0; taskInd < tasks.length; taskInd++){
          var task = tasks[taskInd];
          if(task.Resolved === "false"){
            activeTaskCount++;  
          }          
        }
        $scope.taskCount = activeTaskCount;          
      });    

    }

    // get unit status  
    function getUnitStatus(unitId){

      var query = 'SELECT * FROM Unit WHERE Unit.UnitId = ' + unitId;
      $db.read(query, function(unit){
        if(!unit) return;
        $scope.unitData = unit;
        $scope.unit = unit;
        $scope.unit.StatusDescription = $epic.getUnitStatusName(unit.Status);
      });                  

      var retClass = "";
      $scope.getStatusClass = function(status){
        switch(status){
          case 'E0001':
            retClass = 'status-inactive';
            break;
          case 'E0002':
            retClass = 'status-available';
            break;
          case 'E0003':
            retClass = 'status-available-at-base';
            break;
          case 'E0009':
            retClass = 'status-available-at-base';
            break;
          default:
            retClass = 'status-busy';
            break;
        }
        return retClass;
      }
    }

  })

  // employee profile
  .controller("PersonProfile", function($scope, $state, $stateParams, $epic){
  
    $scope.person = $stateParams.person;

    // get user profile pic
    $scope.userPhoto = $epic.getUnitEmployeePhoto($scope.person);

    // get organisation descriptions       
    $epic.getDescription("Directorate", $scope.person.DirectorateId, function(description){
      $scope.person.directorate = description;
    });
    $epic.getDescription("Department", $scope.person.DepartmentId, function(description){
      $scope.person.department = description;
    });
    $epic.getDescription("Section", $scope.person.SectionId, function(description){
      $scope.person.section = description;
    });
    $epic.getDescription("Subsection", $scope.person.SubsectionId, function(description){
      $scope.person.subsection = description;
    });
    $epic.getDescription("District", $scope.person.DistrictId, function(description){
      $scope.person.district = description;
    });
    $epic.getDescription("Base", $scope.person.BaseId, function(description){
      $scope.person.base = description;
    });

  })
  // vehicle profile
  .controller("VehicleProfile", function($scope, $state, $stateParams, $epic){
    $scope.vehicle = $stateParams.vehicle;

    // get organisation descriptions      
    $epic.getDescription("Directorate", $scope.vehicle.DirectorateId, function(description){
      $scope.vehicle.directorate = description;
    });
    $epic.getDescription("Department", $scope.vehicle.DepartmentId, function(description){
      $scope.vehicle.department = description;
    });
    $epic.getDescription("Section", $scope.vehicle.SectionId, function(description){
      $scope.vehicle.section = description;
    });
    $epic.getDescription("Subsection", $scope.vehicle.SubsectionId, function(description){
      $scope.vehicle.subsection = description;
    });
    $epic.getDescription("District", $scope.vehicle.DistrictId, function(description){
      $scope.vehicle.district = description;
    });
    $epic.getDescription("Base", $scope.vehicle.BaseId, function(description){
      $scope.vehicle.base = description;
    });
  });

  


