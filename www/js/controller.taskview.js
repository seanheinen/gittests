angular.module('epicmobile.controller.taskview', [])
  
  .controller("TaskView", function($scope, $rootScope, $state, $ionicPopup, $db, $controller, $epic, $sapRequest, $ionicLoading, $cordovaGeolocation){

    // load active task
    var storageTask = JSON.parse(localStorage.getItem("ViewTask"));
    var thisTask = storageTask.TaskID;    
    $scope.task = {};
    var query = 'SELECT * FROM UnitTask WHERE TaskID = "' + thisTask + '"';
    $db.read(query, function(task){
      $scope.task = task;
      loadTask();
    });      

    function loadTask(){

      // check current role for incident
      var currentPartner = JSON.parse(localStorage.getItem("User")).Partner;
      // check incident role
      if(currentPartner === $scope.task.IncidentCommander){
        $scope.task.role = "INCIDENT COMMANDER";
      } else {
        if($epic.checkRole){
          $scope.task.role = "UNIT COMMANDER";
        } else {
          $scope.task.role = "UNIT MEMBER";
        }        
      }
      // format time and date
      $scope.task.FormatDate = $epic.convertSAPDate($scope.task.SRCreatedDate.toString());
      $scope.task.FormatTime = $epic.convertSAPTime($scope.task.SRCreatedTime.toString());

      // get icons, timestamps and other unit status descriptions for tasks                
      $scope.task.CategoryIcon = $epic.getTaskCategoryIcon($scope.task.DepartmentId);                          
      $scope.task.TaskStatusName = $epic.getStatusName($scope.task.Status);
      $scope.task.Timestamp = $epic.getTimestamp($epic.convertSAPDate($scope.task.SRCreatedDate), $epic.convertSAPTime($scope.task.SRCreatedTime));     

      // get task units            
      $scope.taskUnits = {};
      var query = 'SELECT * FROM UnitTaskUnit WHERE TaskID = "' + thisTask + '"';
      $db.select(query, function(units){        
        for(var unitInd = 0; unitInd < units.length; unitInd++){
          units[unitInd].ActiveTaskStatusDescription = $epic.getStatusName(units[unitInd].ActiveTaskStatus);  
        }      
        $scope.taskUnits = units;
      });      

      // get task notes  
      $scope.taskNotes = {};
      var query = 'SELECT * FROM UnitTaskNote WHERE TaskID = "' + thisTask + '"';
      $db.select(query, function(notes){                        
        $scope.taskNotes = notes;
      });    
    }

    $scope.openTask = function(){

      var task = $scope.task;

      // check if not unit commander, then just open task
      if(!$epic.checkRole){
        localStorage.setItem("ActiveTask",JSON.stringify(task));
        $state.go("task.details");
        return;
      }

      // check if task has already been accepted
      if(task.Status !== "E0001" && task.Status !== "E0002"){
        localStorage.setItem("ActiveTask",JSON.stringify(task));
        $state.go("task.details");
        return;
      }

      gotoTask();


      /* basically this logic checks the following:
          if there is a task above accepted status it is considered active
          if there is a task that is active and not this one, prompt the user to set the active one back to accpeted and lose data
          if the selected task is the active task, just open the task       
      */
      /*
      var activeTask;

      // check if task has a status higher than accepted and then assume that is the active task      
      if($epic.getStatusOrder(task.Status) > 2){
        activeTask = task;
        localStorage.setItem("ActiveTask", JSON.stringify(activeTask));
      } else {
        // otherwise just use active task in localstorage if there is one
        activeTask = localStorage.getItem("ActiveTask");
        if(activeTask === null || activeTask === ""){          
          activeTask = "";
        } else {
          activeTask = JSON.parse(activeTask);
        }
      }      

      // if there isnt a active task consider this task the first task been made active
      if(activeTask.length < 1){
        // set empty strings for active task checks
        activeTask = {};
        activeTask.TaskID = "";
        activeTask.TaskStatus = "";
        gotoTask();
        return;
      }  

      // check if active task is still assigned to me (dont want to update a task status for a task i dont have)      
      var query = 'SELECT * FROM UnitTask WHERE UnitId = "' + $scope.unitId + '" AND TaskID = "' + activeTask.TaskID + '"';
      $db.read(query, function(task){        
        if(task === null){
          // set empty strings for active task checks
          activeTask = {};
          activeTask.TaskID = "";
          activeTask.TaskStatus = "";
          gotoTask();
          return;   

        } else {

          // check if this task is same as active task and if not prompt user to revert previous active back to accepted
          if(task.TaskID !== activeTask.TaskID){
            $ionicPopup.confirm({
              title: 'Confirmation',
              template: 'You are already in progress with another Task. Are you sure you would like to accept this task and reset the previous?'
            }).then(function(res) {
              if (res) {    
                // set active task back to accepted
                // update old task status
                var cols = [ "Status" ];
                var vals = [ "E0003" ];
                $db.update("UnitTask", ["TaskID"], [activeTask.TaskID], cols, vals);

                if(window.cordova){
                  $cordovaGeolocation.getCurrentPosition({ timeout: 5000 }).then(function (position) {                              
                    updateOldTask(position.coords.latitude, position.coords.longitude);              
                  }, function(err) {
                    updateOldTask("", "");
                  });
                } else {
                  updateOldTask("", "");
                }

                function updateOldTask(latitude, longitude){
                  // get date and time
                  var currentdate = new Date();    
                  var thisDate = $epic.convertToSAPDate(currentdate);
                  var thisTime = $epic.convertToSAPTime(currentdate);

                  // pack POST payload
                  var changeTaskStatus = {
                    "d" : {
                      "IncidentID" : activeTask.IncidentId.toString(),
                      "UnitID" : JSON.parse(localStorage.getItem("User")).UnitID.toString(),
                      "TaskID" : activeTask.TaskID.toString(),
                      "Status" : "E0003",
                      "GeoX" : latitude.toString(),
                      "GeoY" : longitude.toString(),
                      "Time" : thisTime.toString(),
                      "Date" : thisDate.toString()
                    }
                  };
                
                  // POST task update
                  $sapRequest.request({
                    method: "POST",
                    requestUri: "TaskStatusSet",
                    data: changeTaskStatus
                  }, 
                  function(data){
                    gotoTask();   
                  }, function(err){
                    $ionicPopup.alert({
                      title: 'Error',
                      template: err
                    });
                  }, "Task Status update");          
                }            
              }
            });
          } else {
            gotoTask();          
          }   
             
        }
      });      
      */
      function gotoTask(){        
        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to accept this task?'          
        }).then(function(res) {
          if (res) {          

            function updateTask(latitude, longitude){

              // update task status
              var cols = [ "Status" ];
              var vals = [ "E0003" ];
              $db.update("UnitTask", ["TaskID"], [task.TaskID], cols, vals);

              // get date and time
              var currentdate = new Date();    
              var thisDate = $epic.convertToSAPDate(currentdate);
              var thisTime = $epic.convertToSAPTime(currentdate);

              // pack POST payload
              var changeTaskStatus = {
                "d" : {
                  "IncidentID" : task.IncidentId.toString(),
                  "UnitID" : JSON.parse(localStorage.getItem("User")).UnitID.toString(),
                  "TaskID" : task.TaskID.toString(),
                  "Status" : "E0003",
                  "GeoX" : latitude.toString(),
                  "GeoY" : longitude.toString(),
                  "Time" : thisTime.toString(),
                  "Date" : thisDate.toString()
                }
              };
            
              // POST task update
              $sapRequest.request({
                method: "POST",
                requestUri: "TaskStatusSet",
                data: changeTaskStatus
              }, 
              function(data){
                localStorage.setItem("ActiveTask", JSON.stringify(task));
                $state.go("task.details");                
              }, function(err){
                $ionicPopup.alert({
                  title: 'Error',
                  template: err
                });
              }, "Task Status update");          
            }            

            // get photo geolocation and update sap with task status
            if(window.cordova){
              $ionicLoading.show({ template: "Retrieving location" });
              $cordovaGeolocation.getCurrentPosition({ timeout: 5000 }).then(function (position) {                              
                $ionicLoading.hide();
                updateTask(position.coords.latitude, position.coords.longitude);              
              }, function(err) {
                $ionicLoading.hide();
                updateTask("", "");                        
              });
            } else {
              updateTask("", "");
            
}          }
        });
      }
 
    }


    // UI stuff
    
    $scope.getTasklistAction = function(){

      // check if not unit commander, then just open task
      if(!$epic.checkRole){        
        return "Open";
      }

      // just task status
      if($scope.task.Status === "E0002" || $scope.task.Status === "E0001"){
        return "Accept";
      } else {
        return "Open";
      }
    }      

    $scope.checkIncidentRole = function(){
      if($scope.task.role === "INCIDENT COMMANDER"){
        return false;
      } else {
        return true;
      }
    }

    $scope.getPriorityClass = function(){        
      
      return $epic.getPriorityClass($scope.task);
    }    

  });  