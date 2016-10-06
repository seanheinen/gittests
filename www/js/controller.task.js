angular.module('epicmobile.controller.task', ['ngCordova'])

  .config(function($ionicConfigProvider) {    
    // put tabs at the bottom
    $ionicConfigProvider.tabs.position('bottom');

  })  

  // this filters the task status departmentally
  .filter('taskStatusFilter', function () {

    return function (statuses, departmentShort, currentStatus) {      

      function getStatusOrder(statusId){
        var statusOrder = "";
        for (var i = 0; i < statuses.length; i++) {
          var status = statuses[i];          
          if(statusId === status.id){
            statusOrder = status.order        
          }
        }
        return statusOrder;
      }

      var filtered = [];
      for (var i = 0; i < statuses.length; i++) {
        var status = statuses[i];

        // filter out statuses that have passed including current status
        if(status.order >= getStatusOrder(currentStatus) && status.id !== currentStatus && (status.order - getStatusOrder(currentStatus)) < 2){          
          
          // filter department specific status
          if(status.departmentsShort.length < 1){
            filtered.push(status);
          } else {
            for(var departmentIndex = 0; departmentIndex < status.departmentsShort.length; departmentIndex++){            
              var statusDepartmentShort = status.departmentsShort[departmentIndex];
              if (departmentShort === statusDepartmentShort) {
                filtered.push(status);
                break;
              }
            }  
          }          
        }                  
      }
      return filtered;
    };
  })

  .controller("Task", function(
    $scope, 
    $state, 
    $ionicPlatform,
    $sapRequest, 
    $ionicPopup, 
    $ionicLoading, 
    $timeout, 
    $cordovaCapture, 
    $cordovaCamera, 
    $cordovaFile, 
    $cordovaGeolocation, 
    $ionicModal, 
    $db, 
    $epic,     
    $offlineStorage,     
    $cordovaLaunchNavigator, 
    $cordovaFileOpener2,
    $cordovaFileTransfer/*,
    uiGmapGoogleMapApi*/){

    /********************************************************************************
    TASK INITIATE
    ********************************************************************************/    
    loadTask();    
    function loadTask(){
      // load active task
      var storageTask = JSON.parse(localStorage.getItem("ActiveTask"));
      var thisTask = storageTask.TaskID;    
      $scope.task = {};

      // check if task was just accepted
      if(storageTask.JustAccepted){
        // task screen opened for the first time for this task
        // start status timer and set accepted status
        $timeout(function(){
          $scope.task.ActiveStatus = "Accepted";    
        });
        storageTask.JustAccepted = false;
        localStorage.setItem("ActiveTask", JSON.stringify(storageTask));
      }

      // get department short name
      var query = 'SELECT UnitTask.*, ' +
      'Department.Short AS DepartmentShort ' +
      'FROM UnitTask '+ 
      'LEFT OUTER JOIN Department ON UnitTask.DepartmentId = Department.Id ' +
      'WHERE TaskID = "' + thisTask + '"';

      $db.read(query, function(task){
        $scope.task = task;

        renderTask();        
      });      
    }

    function renderTask(){

      // check current role for incident
      var currentPartner = JSON.parse(localStorage.getItem("User")).Partner;

      // check incident role
      if($epic.checkRole()){
        $scope.task.role = "UNIT COMMANDER";
        if(currentPartner === $scope.task.IncidentCommander){
          $scope.task.role = "INCIDENT COMMANDER";
        }
      } else {
        $scope.task.role = "UNIT MEMBER";        
      }            

      // format time and date
      $scope.task.FormatDate = $epic.convertSAPDate($scope.task.SRCreatedDate.toString());
      $scope.task.FormatTime = $epic.convertSAPTime($scope.task.SRCreatedTime.toString());

      // get icons, timestamps and other unit status descriptions for tasks                
      $scope.task.CategoryIcon = $epic.getTaskCategoryIcon($scope.task.ProcessType);                          
      $scope.task.TaskStatusName = $epic.getStatusName($scope.task.Status);
      $scope.task.Timestamp = $epic.getTimestamp($epic.convertSAPDate($scope.task.SRCreatedDate), $epic.convertSAPTime($scope.task.SRCreatedTime));     

      // get task units            
      $scope.taskUnits = {};
      var query = 'SELECT * FROM UnitTaskUnit WHERE TaskID = "' + $scope.task.TaskID + '"';
      $db.select(query, function(units){
        for(var unitInd = 0; unitInd < units.length; unitInd++){
          units[unitInd].ActiveTaskStatusDescription = $epic.getStatusName(units[unitInd].ActiveTaskStatus);  
        }      
        $scope.taskUnits = units;
      });    

      // get task media
      $scope.mediaItems = [];
      var query = 'SELECT * FROM UnitTaskMedia WHERE TaskID = "' + $scope.task.TaskID + '"';
      $db.select(query, function(mediaItems){                
        $scope.mediaItems = mediaItems;
      });          

      // get task notes        
      var renderNotes = [];
      var query = 'SELECT * FROM UnitTaskNote WHERE TaskID = "' + $scope.task.TaskID + '" ORDER BY Header';
      $db.select(query, function(headernotes){                        

        if(headernotes.length < 1){
          return;
        }

        //format notes        
        var prevHeader = headernotes[0].Header; // use first header as starter
        var notes = [];
        for(var noteInd = 0; noteInd < headernotes.length; noteInd++){
          
          
          var thisNote = headernotes[noteInd];

          // check if header is new
          if(thisNote.Header !== prevHeader){
            // new header
            renderNotes.push({
              header: prevHeader,
              notes: notes
            });

            notes = [];
          }

          // add notes to rendernotes
          notes.push(thisNote.Content);
          
          //last iteration
          if(noteInd == (headernotes.length - 1)){
              renderNotes.push({
              header: prevHeader,
              notes: notes
            });
          }
          
          
        }
        $scope.renderNotes = renderNotes;

        //$scope.taskNotes = notes;        
        //$scope.taskNotes = renderNotes;
      });    

      // get task form    
      var query = 'SELECT * FROM UnitTaskForm WHERE TaskID = "' + $scope.task.TaskID + '"';
      $db.read(query, function(form){                        

        if(form === null){
          return;
        }

        try{
          if($scope.displayFireForm()){        
            $scope.fireForm = JSON.parse(form.Form);
          }
          if($scope.displayDRMForm()){
            $scope.drmForm = JSON.parse(form.Form);
          }
          if($scope.displayPoliceForm()){        
            $scope.policeForm = JSON.parse(form.Form);
          }
        } catch(ex){

        }
      });    

    }

    /********************************************************************************
    TASK METHODS
    ********************************************************************************/
    // init change status modal
    $ionicModal.fromTemplateUrl('changeTaskStatus.html', {
      scope: $scope,
      animation: 'none'
    }).then(function(modal) {
      $scope.StatusModal = modal;

    });            
    $scope.changeStatus = function(){      
      $scope.StatusModal.show();
    }
    $scope.setStatus = function(status, statusId){
      
      // write to sql db
      var userDetails = JSON.parse(localStorage.getItem("User"));
      var unitID = userDetails.UnitID;

      $scope.StatusModal.hide();

      // UPDATE TASK STATUS IN SAP
      function updateTask(latitude, longitude){

        // get date and time
        var currentdate = new Date();    
        var thisDate = $epic.convertToSAPDate(currentdate);
        var thisTime = $epic.convertToSAPTime(currentdate);

        // pack POST payload
        var changeTaskStatus = {
          "d" : {
            "IncidentID" : $scope.task.IncidentId.toString(),
            "UnitID" : JSON.parse(localStorage.getItem("User")).UnitID.toString(),
            "TaskID" : $scope.task.TaskID.toString(),
            "Status" : statusId.toString(),
            "GeoX" : latitude.toString(),
            "GeoY" : longitude.toString(),
            "Date" : thisDate.toString(),
            "Time" : thisTime.toString()            
          }
        };
        
        // POST task update
        $sapRequest.request({
          method: "POST",
          requestUri: "TaskStatusSet",
          data: changeTaskStatus
        }, 
        function(data){
          $ionicLoading.show({ 
            template: "Task status change sent",
            duration: 2000
          });
          
          $scope.task.Status = statusId;
          $scope.task.TaskStatusName = status;  

          // update task status row
          var cols = [ "Status" ];
          var vals = [ statusId ];
          $db.update("UnitTask", ["TaskID"], [$scope.task.TaskID], cols, vals);                

          // check if status is closed or complete and continue to resolution
          if(status === "Complete"){              
            // only go resolution if incident commander
            if($scope.task.role === "INCIDENT COMMANDER"){
              $timeout(function(){
                $scope.goResolution();
              }, 2000);                
            }            
          }          
        }, function(err){
          $ionicPopup.alert({
            title: 'Error',
            template: err
          });
        }, "Task Status update");          
      }

      // delay for modal to hide
      $timeout(function(){
        // get photo geolocation and update sap with task status
        if(window.cordova){            
          $ionicLoading.show({ template: "Retrieving location" });
          $cordovaGeolocation.getCurrentPosition({ timeout: 5000, enableHighAccuracy: true }).then(function (position) {              
            $ionicLoading.hide();
            updateTask(position.coords.latitude, position.coords.longitude);              
          }, function(err) {
            $ionicLoading.hide();
            updateTask("", "");                        
          });
        } else {        
          updateTask("", "");
        }
      },500)
    }        

    $scope.showResolveButton = function(){
      if($scope.task.TaskStatusName === 'Cancel' || $scope.task.TaskStatusName === 'Complete'){
        return true;
      }
      return false;
    }
    $scope.goResolution = function(){

      //if($scope.task.Resolved === "false"){
      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Would you like to resolve this task now?'
      }).then(function(res) {
        if (res) {
          syncTask(function(){
            // clear resolution
            localStorage.setItem("Resolution", "");
            $state.go("resolution");
          });          
        }
      });                            

      /*} else {

        $ionicPopup.alert({
          title: 'Alert',
          template: "Task is already resolved."
        }); 

      }*/
    
    }
    

    $scope.getGeolocation = function(){
      // get photo geolocation and update asynchronously
      if(window.cordova){
        $ionicLoading.show({ template: "Retrieving Location" });
        $cordovaGeolocation.getCurrentPosition({ timeout: 5000, enableHighAccuracy: true })
          .then(function (position) {
            $ionicLoading.hide();
            $timeout(function(){
              $scope.task.GeoX = position.coords.latitude;
              $scope.task.GeoY = position.coords.longitude;
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

    $scope.addComment = function(){
      
      $scope.commentData = {};

      var commentPopup = $ionicPopup.show({
        template: '<textarea rows="5" ng-model="commentData.comment"></textarea>',
        cssClass: "comment-popup",
        title: 'Comment',        
        scope: $scope,
        buttons: [
          { text: 'Cancel' },
          {
            text: '<b>Submit</b>',
            type: 'button-positive',
            onTap: function(e) {
              //don't allow the user to close unless he enters comment
              if (!$scope.commentData.comment) {                
                e.preventDefault();
              } else {
                return $scope.commentData.comment;
              }
            }
          }
        ]
      });

      commentPopup.then(function(comment) {
        if(!comment) return;

        // pack POST payload
        var commentPOST = {
          "d" : {
            "TaskID" : $scope.task.TaskID.toString(),
            "IncidentID" : $scope.task.IncidentId.toString(),
            "Comment": comment
          }
        };
      
        // POST task update
        var request = {
          method: "POST",
          requestUri: "TaskSet",
          data: commentPOST
        }
        var requestType = "Submit Comment";
        $sapRequest.request(request, 
        function(data){
          $ionicLoading.show({ 
            template: "Comment submitted",
            duration: 2000
          });
        }, function(err){
          request.requestUri = "TaskSet";
          $offlineStorage.storeOffline(request, requestType, err);
          $ionicPopup.alert({
            title: 'Error',
            template: err
          });
        }, requestType);                          
      });
    }

    $scope.saveTask = function(){
      // save task information
      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to sync this task?'
      }).then(function(res) {
        if (res) {
          syncTask();
        }
      })      
    }

    function syncTask(success){

      // pack POST payload
      var changeTaskDetails = {
        "d" : {
          "TaskID" : $scope.task.TaskID.toString(),
          "IncidentID" : $scope.task.IncidentId.toString(),
          "Location" : $scope.task.Location.toString(),
          "AddLocation" : $scope.task.AddLocation.toString(),
          "Street" : $scope.task.Street.toString(),
          "StreetNo" : $scope.task.StreetNo.toString(),
          "Suburb" : $scope.task.Suburb.toString(),
          "Town" : $scope.task.Town.toString(),
          "GeoX" : $scope.task.GeoX.toString(),
          "GeoY" : $scope.task.GeoY.toString()
        }
      };

      var syncSuccess = function(){

        $ionicLoading.hide();

        if(syncErrorFlag){
          $ionicPopup.alert({
            title: 'Error',
            template: syncErrorMessage
          });
          return;
        }

        $ionicLoading.show({ 
          template: "Task Sync Complete",
          duration: 2000
        });

        $timeout(function(){
          if(success){
            success();    
          }          
        }, 2000);
      }
      var syncError = function(){
        $ionicLoading.hide();

        $ionicPopup.alert({
          title: 'Unable to Sync Task',
          template: syncErrorMessage
        });      
      }

      // TASK SYNC
      var syncErrorFlag = false;
      var syncErrorMessage = "";

      // only save if incident commander
      if($scope.task.role === "UNIT MEMBER"){
        // just retrive details
        $ionicLoading.show({ template: "Syncing Task" });
        getLatestTaskDetails(syncSuccess, syncError)
        return;        
      }

      var request = {
        method: "POST",
        requestUri: "TaskSet",
        data: changeTaskDetails
      }
      $ionicLoading.show({ template: "Syncing Task" });

      // do requests
      $sapRequest.request(request, 
      function(data){

        saveClosureForm(function(){
          getLatestTaskDetails(syncSuccess, syncError);
        }, function(err){

          // flag error
          syncErrorFlag = true;
          syncErrorMessage = err;              

          getLatestTaskDetails(syncSuccess, syncError);
        });
        
      }, function(err){

        // flag error
        syncErrorFlag = true;
        syncErrorMessage = err;

        // store in unsent
        request.requestUri = "TaskSet";
        $offlineStorage.storeOffline(request, "Task Details update", err);

        // carry on
        saveClosureForm(function(){
          getLatestTaskDetails(syncSuccess, syncError);
        }, function(err){

          // flag error
          syncErrorFlag = true;
          syncErrorMessage = err;

          getLatestTaskDetails(syncSuccess, syncError);
        })
    
      });

    }

    function getLatestTaskDetails(success, error){
      // GET task updates      
      $sapRequest.request({
        method: "GET",
        requestUri: "TaskSet(TaskID='" + $scope.task.TaskID + "',IncidentID='" + $scope.task.IncidentId + "')?$expand=TaskToTaskUnit/TaskUnitToUnit/UnitToUnitEmployee"
      }, 
      function(newDetails){

        // new task details
        var newTask = newDetails;
        newTask.UnitId = newDetails.UnitID;
        newTask.IncidentId = newDetails.IncidentID;
        newTask.Status = newDetails.TaskStatus;
        newTask.Resolved =(newDetails.Resolved === "X") ? "true" : "false";

        $scope.task = newDetails;

        // update task details in db
        var cols = [             
          "TaskID",
          "IncidentID",
          "Location",
          "AddLocation",
          "Street",
          "StreetNo",
          "Suburb",
          "Town",
          "GeoX",
          "GeoY",
          "Status",
          "Resolved",
          "IncidentCommander"
        ];
        var vals = [ 
          $scope.task.TaskID,
          $scope.task.IncidentId,
          $scope.task.Location,
          $scope.task.AddLocation,
          $scope.task.Street,
          $scope.task.StreetNo,
          $scope.task.Suburb,
          $scope.task.Town,
          $scope.task.GeoX,
          $scope.task.GeoY,
          $scope.task.Status,
          $scope.task.Resolved,
          $scope.task.IncidentCommander
        ];
        $db.update("UnitTask", ["TaskID"], [$scope.task.TaskID], cols, vals);

        var unitColumns = [
          "TaskID",
          "ActiveTaskID",
          "ActiveTaskStatus",
          "UnitId",            
          "UnitName",
          "UnitType",
          "Description",
          "DirectorateID",
          "DirectorateName",
          "DepartmentID",
          "DepartmentName",
          "SectionID",
          "SectionName",
          "SubSectionID",
          "SubSectionName",
          "DistrictID",
          "DistrictName",
          "BaseID",
          "BaseName",
          "Status"
        ];            
        var incidentEmployeeColumns = [
          "IncidentId",
          "Partner"
        ];
        
        // do unit tasks and unit employees              
        var unitValues = [];
        var incidentEmployeeValues = [];

        // do task units            
        for(var taskUnitInd = 0; taskUnitInd < newDetails.TaskToTaskUnit.results.length; taskUnitInd++){
          var taskUnit = newDetails.TaskToTaskUnit.results[taskUnitInd];   

          // check if partner already there
          var duplicateUnitFlag = false;
          for(var i = 0; i < unitValues.length; i++){
            if(taskUnit.TaskUnitToUnit.UnitID === unitValues[i][3]){
              duplicateUnitFlag = true;
              break;
            }
          }         
          if(!duplicateUnitFlag){
            unitValues.push([
              taskUnit.TaskID,
              taskUnit.ActiveTaskID,
              taskUnit.ActiveTaskStatus,
              taskUnit.TaskUnitToUnit.UnitID,            
              taskUnit.TaskUnitToUnit.UnitName,
              taskUnit.TaskUnitToUnit.UnitType,
              taskUnit.TaskUnitToUnit.Description,
              taskUnit.TaskUnitToUnit.DirectorateID,
              taskUnit.TaskUnitToUnit.DirectorateName,
              taskUnit.TaskUnitToUnit.DepartmentID,
              taskUnit.TaskUnitToUnit.DepartmentName,
              taskUnit.TaskUnitToUnit.SectionID,
              taskUnit.TaskUnitToUnit.SectionName,
              taskUnit.TaskUnitToUnit.SubSectionID,
              taskUnit.TaskUnitToUnit.SubSectionName,
              taskUnit.TaskUnitToUnit.DistrictID,
              taskUnit.TaskUnitToUnit.DistrictName,
              taskUnit.TaskUnitToUnit.BaseID,
              taskUnit.TaskUnitToUnit.BaseName,
              taskUnit.TaskUnitToUnit.Status
            ]);
          }

          // do task units employees              
          for(var incidentEmployeeInd = 0; incidentEmployeeInd < taskUnit.TaskUnitToUnit.UnitToUnitEmployee.results.length; incidentEmployeeInd++){
            var incidentEmployee = taskUnit.TaskUnitToUnit.UnitToUnitEmployee.results[incidentEmployeeInd];
            
            // check if partner already there
            var duplicateEmployeeFlag = false;
            for(var i = 0; i < incidentEmployeeValues.length; i++){
              if(incidentEmployee.Partner === incidentEmployeeValues[i][1]){
                duplicateEmployeeFlag = true;
                break;
              }
            }         
            if(!duplicateEmployeeFlag){
              incidentEmployeeValues.push([
                newDetails.IncidentID,
                incidentEmployee.Partner
              ]);
            }
          }          
        }

        // delete all smet tables
        $db.clear('UnitTaskUnit');
        $db.clear('IncidentEmployee');        

        if(incidentEmployeeValues.length > 0){        
          $db.insertMany("IncidentEmployee", incidentEmployeeColumns, incidentEmployeeValues);  
        }
        if(unitValues.length > 0){
          $db.insertMany("UnitTaskUnit", unitColumns, unitValues, function(result){ });
        }

        success()
        loadTask();
        
      }, function(err){
        syncErrorFlag = true;
        syncErrorMessage = err;
        error(err);        
      });
    }


    /********************************************************************************
    TASK NAVIGATION
    ********************************************************************************/    
    // do Google map stuff
    // this loads API runtime and then..
    /*
    $scope.showMap = false;    
    $scope.getMap = function(){
      uiGmapGoogleMapApi.then(function(maps) {
        // this stuff sorts out version descrepencies between angular and maps api using alias
        if( typeof _.contains === 'undefined' ) {
          _.contains = _.includes;
        }
        if( typeof _.object === 'undefined' ) {
          _.object = _.zipObject;
        }

        // get task geolocation
        var latitude = $scope.task.GeoX;
        var longitude = $scope.task.GeoY;

        // fake it till you make it
        latitude = -33.9354233
        longitude = 18.865463
        
        // create marker
        var markers = [
          {
            id: Date.now(),
            coords: {
              latitude: latitude, 
              longitude: longitude
            }
          }
        ];

        // create map object to center map around marker
        $scope.map = { 
          center: { 
            latitude: latitude, 
            longitude: longitude
          }, 
          zoom: 14,
          markers: markers
        };
        $timeout(function(){
          $scope.showMap = true;  
        })        
      });       
    }
    $scope.getMap();

    // navigation - opens google maps
    $scope.navigateTo = function(){
      if (!window.cordova) {
        return;
      }
      var latitude = $scope.task.Location.split(",")[0];
      var longitude = $scope.task.Location.split(",")[1];
      var destination = [latitude, longitude];      
      $cordovaLaunchNavigator.navigate(destination, null)
        .then(function() { 

        }, function (err) {    

        });    
    }

    */


    /********************************************************************************
    TASK MEDIA
    ********************************************************************************/    
    
    // get geolocation asynchronously since it could take some time
    // didnt want to delay the media list item append
    // later added insert media item into DB (wanted to wait for geolocaiton)
    function getMediaGeolocation(media, cb){
      
      if(window.cordova){            
        $ionicLoading.show({ template: "Retrieving location" });
        $cordovaGeolocation.getCurrentPosition({ timeout: 5000, enableHighAccuracy: true }).then(function (position) {
          $timeout(function(){
            $ionicLoading.hide();          
            media.Latitude = position.coords.latitude;
            media.Longitude = position.coords.longitude;
            cb(media);              
          }, 500)
          
        }, function(err) {
          $timeout(function(){
            $ionicLoading.hide();
            media.Latitude = "";
            media.Longitude = "";   
            cb(media);                        
          }, 500)
        });
      } else {        
        $timeout(function(){
          $ionicLoading.hide();          
          media.Latitude = "";
          media.Longitude = "";   
          cb(media);
        }, 500)
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

    // init filename popup vars
    $scope.media = {};
    $scope.media.thisFilename = "";

    $scope.changeFileName = function(media, cb){

      // get current filename
      var extension = media.FullPath.substring(media.FullPath.lastIndexOf('.')+1);

      $scope.media.thisFilename = media.FileName.substring(0, media.FileName.indexOf('.')-1);

      // override popup
      var myNullAction = $ionicPlatform.registerBackButtonAction(function(){
          return; // do nothing
      }, 401);

      // filename popup
      var filenamePopup = $ionicPopup.show({
        template: '<input select-on-click ng-model="media.thisFilename" ng-pattern="/^[a-zA-Z0-9]*$/"></input> <div class="filename-validation">Filename may only have alphanumeric characters.</div>',
        cssClass: "comment-popup",
        title: 'Filename',        
        scope: $scope,
        buttons: [          
          {
            text: '<b>Save</b>',
            type: 'button-positive',
            onTap: function(e) {
              //don't allow the user to close unless he enters comment
              if (!$scope.media.thisFilename) {                
                e.preventDefault();
              } else {
                return $scope.media.thisFilename + '.' + extension;
              }
            }
          }
        ]
      });

      filenamePopup.then(function(filename) {

        // override back button
        myNullAction();

        if(!filename) return;

        //swap all spaces
        filename = filename.replace(" ","");
        var filename = filename.replace(/[|&;$%@"<>()+,]/g, "");


        var columns = [ "FileName" ];        
        var values = [ filename ];
        $db.update("UnitTaskMedia", ["MediaId"], [media.MediaId], columns, values);

        // return new filename
        media.FileName = filename;
        if(cb) cb(media);
      });

    }

    function insertMediaItemDB(media, cb){

      // get current filename
      media.FileName = media.FullPath.substring(media.FullPath.lastIndexOf('/')+1);

      // add to list
      $scope.mediaItems.push(media); 

      var columns = [
        "TaskId",
        "UnitId",          
        "Source",
        "FullPath",
        "DisplayPath",
        "Longitude",
        "Latitude",            
        "Date",
        "Time",
        "Type",
        "Uploaded",
        "FileName"
      ];
      
      var values = [
        $scope.task.TaskID,          
        $scope.task.UnitId,          
        media.Source,          
        media.FullPath,
        media.DisplayPath,
        media.Longitude,
        media.Latitude,
        media.Date,
        media.Time,
        media.Type,
        "false",
        media.FileName
      ];          

      $db.insert("UnitTaskMedia", columns, values, function(result){
        media.MediaId = result.insertId;
        cb(media);
      });
    }

    $scope.addMedia = function(){
      // Media type select
      var myPopup = $ionicPopup.show({
        template: 'Please select the type of Media you would like to add.',
        title: 'Add Media',        
        scope: $scope,
        buttons: [          
          {
            text: '<div class="icon ion-camera"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "photo";
            }
          },
          {
            text: '<div class="icon ion-ios-videocam"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "video";
            }
          },
          {
            text: '<div class="icon ion-android-microphone"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "sound";
            }
          }
        ]
      });

      myPopup.then(function(selection) {   

        if( typeof selection !== 'undefined' ) { // if user cancels media choice
          $ionicLoading.show({ template: "Capturing Media" });       
        }        
        switch(selection){
          case "photo":
            capturePhoto();
            break;
          case "video":
            captureVideo();
            break;
          case "sound":
            captureSound();
            break;
        }
      });
    }

    // do photos    
    function capturePhoto(){    
      var cameraOptions = {
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.CAMERA,        
        encodingType: Camera.EncodingType.JPEG,        
        saveToPhotoAlbum: false,
        correctOrientation:true
      }
      $cordovaCamera.getPicture(cameraOptions).then(function(imageURI) {

        var currentMediaIndex;

        // update timestamp on media
        //$timeout(function(){
        var newPhoto = {
          Source: decodeURI(imageURI),
          FullPath: decodeURI(imageURI),
          DisplayPath: "img/photo.svg",
          Date: getCurrentDate(),
          Time: getCurrentTime(),
          Type: "image/jpeg"
        }

        $ionicLoading.hide();
        // get geolocation
        getMediaGeolocation(newPhoto, function(media){        
          // insert and wait for insert before update filename  
          insertMediaItemDB(media, function(media){          
            $scope.changeFileName(media, function(media){
              // add to list
              //$scope.mediaItems.push(media);  
              // add to offline
              $offlineStorage.addMedia(media, "Photo");
            });          
          });        
        });
                      
        //});          
      }, function(err) {    
        $timout(function(){
          $ionicLoading.hide();  
        })        
      });
    }

    function captureVideo(){
      $cordovaCapture.captureVideo({}).then(function(videoData) {

        // update timestamp on media
        //$timeout(function(){          
        var newVideo = {
          Source: decodeURI(videoData[0].localURL), //cordovaFileOpener uses localURL
          FullPath: decodeURI(videoData[0].fullPath), //cordovaFile.remove uses fullURL
          DisplayPath: "img/video.svg",
          Date: getCurrentDate(),
          Time: getCurrentTime(),
          Type: videoData[0].type
        }        

        // get geolocation
        getMediaGeolocation(newVideo, function(media){        
          // insert and wait for insert before update filename  
          insertMediaItemDB(media, function(media){          
            $scope.changeFileName(media, function(media){
              // add to list
              //$scope.mediaItems.push(media);  
              // add to offline
              $offlineStorage.addMedia(media, "Video");              
            });          
          });        
        });
        //});
      }, function(err) {        
        $timout(function(){
          $ionicLoading.hide();  
        })        
      });    
    }

    function captureSound(){    
      $cordovaCapture.captureAudio({}).then(function(audioData) {

        var currentMediaIndex;

        // update timestamp on media
        //$timeout(function(){       
        var newSound = {
          Source: decodeURI(audioData[0].localURL), //cordovaFileOpener uses localURL
          FullPath: decodeURI(audioData[0].fullPath), //cordovaFile.remove uses fullURL
          DisplayPath: "img/sound.svg",
          Date: getCurrentDate(),
          Time: getCurrentTime(),
          Type: audioData[0].type
        }
        
        // get geolocation
        getMediaGeolocation(newSound, function(media){        
          // insert and wait for insert before update filename  
          insertMediaItemDB(media, function(media){          
            $scope.changeFileName(media, function(media){
              // add to list
              //$scope.mediaItems.push(media);  
              // add to offline
              $offlineStorage.addMedia(media, "Sound");              
            });          
          });        
        });
        //});        
      }, function(err) {
        $timout(function(){
          $ionicLoading.hide();  
        })        
      });
    }

    $scope.mediaSettings = function(index, media){

      // read media item from db and update just in case sent already      
      var query = 'SELECT * FROM UnitTaskMedia WHERE MediaId = ' + media.MediaId;
      $db.read(query, function(updatedMedia){
        if(updatedMedia === null){
          //delete this transaction since it doesnt exist? not sure why this is here
          return;
        }
        // update this media item
        $scope.mediaItems[index] = updatedMedia;
      });

      // Media type select
      var settings = $ionicPopup.show({
        template: 'What would you like to do?',
        title: 'Media Settings',        
        scope: $scope,
        buttons: [          
          {
            text: '<div class="icon ion-upload"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "upload";
            }
          },
          {
            text: '<div class="icon ion-trash-a"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "delete";
            }
          },
          {
            text: '<div class="icon ion-edit"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "edit";
            }
          },
          {
            text: '<div class="icon ion-search"></div>',
            type: 'button-positive',
            onTap: function(e) {            
              return "view";
            }
          }          
        ]
      });

      settings.then(function(selection) {        
        switch(selection){
          case "upload":
            $scope.uploadMediaItem(index, media);
            break;
          case "delete":
            $scope.deleteMedia(index, media);
            break;
          case "edit":
            $scope.changeFileName(media);
            break;
          case "view":
            $scope.viewMedia(media);
            break;
        }
      });
    }
  
    $scope.viewMedia = function(media){
      $cordovaFileOpener2.open(
        media.Source,
        media.Type
      ).then(function() {
          // Success!
      }, function(err) {
        // error
        $ionicPopup.alert({
          title: 'Error',
          template: 'Unable to view media. File already uploaded and deleted from local storage.'
        });            
      });      
    }

    $scope.deleteMedia = function(index, media){

      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to delete this media item?'
      }).then(function(res) {
        if (res) {
          
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
            $cordovaFile.removeFile(getPath(media.FullPath), getFilename(media.FullPath)).then(function (success) {
              // delete db row          
              $db.delete("UnitTaskMedia", ["MediaId"], [media.MediaId], function(){              

                // remove from list
                $scope.mediaItems.splice(index, 1);         

                // remove from offline storage
                $offlineStorage.removeMedia(media.MediaId);

                $ionicLoading.show({ 
                  template: "Media deleted",
                  duration: 2000
                });
              });            
            }, function (error) {
              // error
              $ionicPopup.alert({
                title: 'Error',
                template: 'Unable to delete media at "' + media.FullPath + '" ERROR: ' + JSON.stringify(error)
              });            
            });
          } else {
            // delete db row          
            $db.delete("UnitTaskMedia", ["MediaId"], [media.MediaId], function(){              
              $scope.mediaItems.splice(index, 1);         
              $ionicLoading.show({ 
                template: "Media deleted",
                duration: 2000
              });
            });
          }          
        }
      });
    }

    $scope.uploadMediaItem = function(index, media){

      // read media item from db and update just in case sent already      
      var query = 'SELECT * FROM UnitTaskMedia WHERE MediaId = ' + media.MediaId;
      $db.read(query, function(updatedMedia){
        if(updatedMedia === null){
          //delete this transaction since it doesnt exist? not sure why this is here
          return;
        }

        // update this media item
        $scope.mediaItems[index] = updatedMedia;

        if(updatedMedia.Uploaded === "true"){
          $ionicLoading.show({ 
            template: "Media already uploaded",
            duration: 2000
          });
          return;
        }

        // otherwise prompt user
        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to upload this media item?'
        }).then(function(res) {
          if (res) {
            uploadMedia();
          }
        });
      });

      function uploadMedia(){

        $ionicLoading.show({ template: "Uploading Media" });

        // get token first
        $sapRequest.getToken(function(token){

          var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));      
          var url = applicationContext.applicationEndpointURL + "/FileSet(FileName='" + media.FileName + "',IncidentID='" + $scope.task.IncidentId + "')/$value";                  
          var targetPath = media.FullPath;
          var trustHosts = true;
          
          function win(r) {
            $ionicLoading.hide();          
            $ionicLoading.show({ 
              template: "Media uploaded",
              duration: 2000
            });

            // flag as uploaded
            media.Uploaded = "true";
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

            // remove from unsent
            $offlineStorage.removeMedia(media.MediaId);
          }
          function fail(error) {
            // this sets it for sync when app is refreshed
            $offlineStorage.uploadMediaFail(media.MediaId);

            $ionicLoading.hide();                 
            $ionicPopup.alert({
              title: 'Error',
              template: JSON.stringify(error)
            });
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
          ft.onprogress = function(progressEvent) {

          };
          
          ft.upload(targetPath, url, win, fail, options);
        }, function(err){
          // this sets it for sync when app is refreshed
          $offlineStorage.uploadMediaFail(media.MediaId);

          $ionicLoading.hide();                 
          $ionicPopup.alert({
            title: 'Error',
            template: "Error retrieving authentication token. Please ensure that you have a connection."
          });
        });
      }
      /*
      return;
      $cordovaFileTransfer.upload(url, targetPath, options, trustHosts)
          .then(function(result) {
            $ionicLoading.hide();
            alert("Uplaoded: " + JSON.stringify(result));
            // Success!
          }, function(err) {
            // Error
            $ionicLoading.hide();
            alert("not Uplaoded: " + err);
            alert("not Uplaoded: " + JSON.stringify(err));
          }, function (progress) {
            $timeout(function () {

              $scope.downloadProgress = (progress.loaded / progress.total) * 100;
            });
          });
     
        return;
        */
    }

    /********************************************************************************
    TASK SHORT FORM STUFF
    ********************************************************************************/        
    // check current department vs closure form
    $scope.displayPoliceForm = function(){            
      //Police
      if($scope.task.DepartmentShort === 'LE' || $scope.task.DepartmentShort === 'TS' || $scope.task.DepartmentShort === 'MP' || $scope.task.DepartmentShort === 'SAPS' || $scope.task.DepartmentShort === 'PR'){
        return true;
      }      
      return false;
      
    }        
    $scope.displayFireForm = function(){                  
      //fire
      if($scope.task.DepartmentShort === 'PE' || $scope.task.DepartmentShort === 'EMS' || $scope.task.DepartmentShort === 'FR'){
        return true;
      }
      return false;
    }    
    $scope.displayDRMForm = function(){  
      //DRM
      if($scope.task.DepartmentShort === 'SD' || $scope.task.DepartmentShort === 'DR'){
        return true;
      }
      return false;
    }

    // DRM CLOSRUE FORM
    $scope.drmForm = {
      structures: "",
      people: "",
      males: "",
      females: "",
      maleAdults: "",
      femaleAdults: "",
      maleChildren: "",
      femaleChildren: "",      
      maleInfants: "",
      femaleInfants: "",
      dead: "",
      relief: "",
      reliefDays: "",
      reliefItems: [
        {
          needed: false,
          description : "Blankets",                  
          quantity : ""        
        },
        {
          needed: false,
          description : "Food Parcels",                  
          quantity : ""        
        },
        {
          needed: false,
          description : "Matresses",                  
          quantity : ""        
        },
        {
          needed: false,
          description : "Housing Kits",                  
          quantity : ""        
        },
        {
          needed: false,
          description : "Breakfast",
          quantity : ""        
        },
        {
          needed: false,
          description : "Brunch",
          quantity : ""        
        },
        {
          needed: false,
          description : "Supper",
          quantity : ""        
        },
        {
          needed: false,
          description : "Baby Packs",                  
          quantity : ""        
        },
        {
          needed: false,
          description : "Vanity Packs Female",
          quantity : ""        
        },
        {
          needed: false,
          description : "Vanity Packs Male",                  
          quantity : ""        
        }
      ]      
    };

    // form calculations
    // if empty string treat as 0
    function convertToNumber(num){
      var temp = parseInt(num);
      return temp > -1 ? temp : 0;            
    }      
    $scope.$watch(function () {      
      return {
        people: $scope.drmForm.people,
        structures: $scope.drmForm.structures,
        reliefDays: $scope.drmForm.reliefDays,
        maleAdults: $scope.drmForm.maleAdults,
        femaleAdults: $scope.drmForm.femaleAdults,
        maleChildren: $scope.drmForm.maleChildren,
        femaleChildren: $scope.drmForm.femaleChildren,            
        maleInfants: $scope.drmForm.maleInfants,
        femaleInfants: $scope.drmForm.femaleInfants,
        males: $scope.drmForm.males,
        females: $scope.drmForm.females
      };
    }, function (newVal, oldVal) {
      // auto populate relief count quantities
      $scope.drmForm.males = convertToNumber(newVal.maleAdults) + convertToNumber(newVal.maleChildren) + convertToNumber(newVal.maleInfants);
      $scope.drmForm.females = convertToNumber(newVal.femaleAdults) + convertToNumber(newVal.femaleChildren) + convertToNumber(newVal.femaleInfants);      
      $scope.drmForm.people = $scope.drmForm.males + $scope.drmForm.females;

      //iterate through relief items and auto populate
      for(var reliefInd = 0; reliefInd < $scope.drmForm.reliefItems.length; reliefInd++){
        var item = $scope.drmForm.reliefItems[reliefInd];

        if(item.description === "Blankets"){
          item.quantity = newVal.people;
        }

        if(item.description === "Food Parcels"){
          item.quantity = newVal.structures;
        }

        if(item.description === "Matresses"){
          item.quantity = newVal.people;
        }

        if(item.description === "Housing Kits"){
          item.quantity = newVal.structures;
        }

        if(item.description === "Breakfast"){
          item.quantity = convertToNumber(newVal.people) * convertToNumber(newVal.reliefDays);
        }

        if(item.description === "Brunch"){
          item.quantity = convertToNumber(newVal.people) * convertToNumber(newVal.reliefDays);
        }

        if(item.description === "Supper"){
          item.quantity = convertToNumber(newVal.people) * convertToNumber(newVal.reliefDays);
        }

        if(item.description === "Baby Packs"){
          item.quantity = convertToNumber(newVal.maleInfants) + convertToNumber(newVal.femaleInfants);
        }

        if(item.description === "Vanity Packs Female"){
          //item.quantity = newVal.females;
          item.quantity = convertToNumber(newVal.femaleAdults) + convertToNumber(newVal.femaleChildren);
        }

        if(item.description === "Vanity Packs Male"){
          //item.quantity = newVal.males;
          item.quantity = convertToNumber(newVal.maleAdults) + convertToNumber(newVal.maleChildren);
        }
      }
    }, true);

    $scope.addRelief = function(){
      $scope.drmForm.reliefItems.push({
          needed: false,        
          description: "",
          quantity: ""          
      });
    }

    // FIRE AND RESCUE CLOSRUE FORM
    $scope.fireForm = {
      comment: ""      
    };

    // POLICING CLOSRUE FORM
    $scope.policeForm = {
      people: "",
      arrests: "",
      contraventions: "",
      fines: "",
      vehicles: "",
      confiscations: [
        {
          confiscated: false,        
          description: "Alcohol",
          quantity: "", 
          unitCode: "",
          unit: "Unit"
        },
        {
          confiscated: false,        
          description: "Narcotics",
          quantity: "",        
          unitCode: "",
          unit: "Unit"
        },
        {
          confiscated: false,        
          description: "Weapons",
          quantity: "",
          unitCode: "",        
          unit: "Unit"
        },
        {
          confiscated: false,        
          description: "Counterfeit",
          quantity: "",
          unitCode: "",        
          unit: "Unit"
        }
      ]
    };

    $scope.changeConfiscationUnit = function(confiscation){
      
      // get department list
      var query = 'SELECT * FROM ConfiscationUnit'
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Confiscations Units', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Unit",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(unit){ 

            confiscation.unitCode = unit.Code;
            confiscation.unit = unit.Code;

            // save form data to storage
            var unitId = JSON.parse(localStorage.getItem("User")).UnitID;
            $db.delete("UnitTaskForm", ["UnitId"], [unitId], function(){
              
              var columns = [
                "TaskID",
                "UnitId",
                "Form"
              ]

              var values = [
                $scope.task.TaskID,
                unitId,
                JSON.stringify($scope.policeForm)
              ]      
              $db.insert("UnitTaskForm", columns, values);
            }); 
                      
            window.history.back();
          }
        });
      });                 
    }

    $scope.addConfiscation = function(){
      $scope.policeForm.confiscations.push({
          confiscated: false,        
          description: "",
          quantity: "",        
          unit: ""
      })
    }

    function packClosureData(){

      // check department
      if($scope.displayPoliceForm()){

        $scope.task.shortFormData = $scope.policeForm;

        // pack Police POST payload
        var policeFormData = {
          "d" : {
            "TaskID" : $scope.task.TaskID,
            "Department" : $scope.task.DepartmentId,
            "Text" : "",
            "ResolutionToMetro" : {
              "TaskID" : $scope.task.TaskID,
              "Department" : $scope.task.DepartmentId,
              "People" : $scope.policeForm.people.toString(),
              "Arrests" : $scope.policeForm.arrests.toString(),
              "Contraventions" : $scope.policeForm.contraventions.toString(),
              "Fines" : $scope.policeForm.fines.toString(),
              "Vehicles" : $scope.policeForm.vehicles.toString(),              
              "ResMetroToConf": []
            }
          }
        };

        for(var confiscationInd = 0; confiscationInd < $scope.policeForm.confiscations.length; confiscationInd++){

          var contravention = {
            "TaskID" : $scope.task.TaskID,
            "Department" : $scope.task.DepartmentId,
            "Name" : $scope.policeForm.confiscations[confiscationInd].description,
            "Confiscated" : ($scope.policeForm.confiscations[confiscationInd].confiscated) ? "X" : "",
            "Quantity" : $scope.policeForm.confiscations[confiscationInd].quantity.toString(),
            "Unit" : ($scope.policeForm.confiscations[confiscationInd].unitCode === "Unit") ? "" : $scope.policeForm.confiscations[confiscationInd].unitCode
          }
          policeFormData.d.ResolutionToMetro.ResMetroToConf.push(contravention);          
        }
        return policeFormData;        
      }

      if($scope.displayDRMForm()){

        $scope.task.shortFormData = $scope.drmForm;

        // pack DRM Form POST payload
        var drmFormData = {
          "d" : {
            "TaskID" : $scope.task.TaskID,
            "Department" : $scope.task.DepartmentId,
            "Text" : "",
            "ResolutionToDRM" : {
              "TaskID" : $scope.task.TaskID,
              "Department" : $scope.task.DepartmentId,
              "Structures" : $scope.drmForm.structures.toString(),
              "People" : $scope.drmForm.people.toString(),
              "Male" : $scope.drmForm.males.toString(),
              "Female" : $scope.drmForm.females.toString(),
              "AdultMale" : $scope.drmForm.maleAdults.toString(),
              "AdultFemale" : $scope.drmForm.femaleAdults.toString(),
              "ChildrenMale" : $scope.drmForm.maleChildren.toString(),
              "ChildrenFemale" : $scope.drmForm.femaleChildren.toString(),
              "InfantMale" : $scope.drmForm.maleInfants.toString(),
              "InfantFemale" : $scope.drmForm.femaleInfants.toString(),
              "Fatalities" : $scope.drmForm.dead.toString(),
              "ReliefRequired" : ($scope.drmForm.relief) ? "X" : "",
              "ReliefDays" : $scope.drmForm.reliefDays.toString(),
              "ResDRMToRelief": []
            }
          }
        };

        for(var reliefInd = 0; reliefInd < $scope.drmForm.reliefItems.length; reliefInd++){

          var reliefItem = {          
            "TaskID" : $scope.task.TaskID,
            "Department" : $scope.task.DepartmentId,
            "Name" : $scope.drmForm.reliefItems[reliefInd].description.toString(),
            "Relieved" : ($scope.drmForm.reliefItems[reliefInd].needed) ? "X" : "",
            "Quantity" : $scope.drmForm.reliefItems[reliefInd].quantity.toString(),            
            "Unit" : ""
          }           
          drmFormData.d.ResolutionToDRM.ResDRMToRelief.push(reliefItem);          
        }
        return drmFormData;

      }
      if($scope.displayFireForm()){

        $scope.task.shortFormData = $scope.fireForm;

        // pack DRM Form POST payload
        var fireFormData = {
          "d" : {
            "TaskID" : $scope.task.TaskID,
            "Department" : $scope.task.DepartmentId,
            "Text" : $scope.fireForm.comment,
            "ResolutionToFire" : {
              "TaskID" : $scope.task.TaskID,
              "Department" : $scope.task.DepartmentId,
              "Structures" : "",
              "People" : "",
              "Male" : "",
              "Female" : "",
              "AdultMale" : "",
              "AdultFemale" : "",
              "ChildrenMale" : "",
              "ChildrenFemale" : "",
              "InfantMale" : "",
              "InfantFemale" : "",
              "Fatalities" : ""
            }
          }
        };

        return fireFormData;
      }
    }

    function saveClosureForm(success, error){

      var formData = packClosureData();

      // save form data to storage
      var unitId = JSON.parse(localStorage.getItem("User")).UnitID;
      $db.delete("UnitTaskForm", ["UnitId"], [unitId], function(){
        
        var columns = [
          "TaskID",
          "UnitId",
          "Form"
        ]

        var values = [
          $scope.task.TaskID,
          unitId,
          JSON.stringify($scope.task.shortFormData)
        ]      
        $db.insert("UnitTaskForm", columns, values);
      });

      // POST closure form
      var request = {
        method: "POST",
        requestUri: "ResolutionSet",
        data: formData
      }
      $sapRequest.request(request, 
      function(data){
        success();
      }, function(err){
        request.requestUri = "ResolutionSet";
        $offlineStorage.storeOffline(request, "Submit Short Form", err);        
        error(err);          
      });          

    }    

      
    /********************************************************************************
    TASK ACTIONS
    ********************************************************************************/

    $scope.checkRole = function(){
      /*
      if($scope.task.role === "INCIDENT COMMANDER"){
        return true;
      }
      */

      // first check if its status user is allowed to change            
      if($scope.task.Status === "E0009" ||
        $scope.task.Status === "E0011" ||
        $scope.task.Status === "E0013" ||
        $scope.task.Status === "E0014"){
        
        return false;
      }

      // if COMMANDER return true, else false
      return $epic.checkRole();
    }

    $scope.checkIncidentRole = function(){
      if($scope.task.role === "INCIDENT COMMANDER"){
        return false;
      } else {
        return true;
      }
    }

    //Incident Submission
    $scope.overviewToggle = true;
    $scope.overviewToggleIconClass = "ion-android-remove-circle";
    $scope.toggleOverview = function(){

      if($scope.overviewToggle){
        $scope.overviewToggle = false;
        $scope.overviewToggleIconClass = "ion-android-add-circle";
      } else {
        $scope.overviewToggle = true;  
        $scope.overviewToggleIconClass = "ion-android-remove-circle";
      }
    }

    $scope.completeTask = function(){        
      $ionicPopup.confirm({
          title: 'Submission',
          template: 'Are you sure you would like to submit this task?'
        }).then(function(res) {
          if (res) {
            $state.go('closure');
          }
        });
    }
      


    $scope.exitTask = function(){
      $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to exit this task?'
        }).then(function(res) {
          if (res) {
            $state.go('tasklist');
          }
        });
    }


      // UI stuff
    $scope.getPriorityClass = function(){        
      
      return $epic.getPriorityClass($scope.task);
    }


    $scope.taskSystemStatus = $epic.getStatusList();

  });
