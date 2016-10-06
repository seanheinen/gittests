angular.module('epicmobile.controller.tasklist', [])

  // this filters the task status departmentally
  .filter('tasklistFilter', function () {

    return function (tasks, status) {      

      var filtered = [];
      for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        
        if(status === "active"){

          // display in progress tasks
          if(task.Resolved === "false"){
          //if(task.Status === "E0001" || task.Status === "E0002" || task.Status === "E0003" || task.Status === "E0007" || task.Status === "E0010" || task.Status === "E0012" || task.Status === "E0011"){          
            filtered.push(task);
          }
        } else {
          // display inactive tasks
          if(task.Resolved === "true"){
          //if(task.Status !== "E0001" && task.Status !== "E0002" && task.Status !== "E0003" && task.Status !== "E0007" && task.Status !== "E0010" && task.Status !== "E0012" && task.Status !== "E0011"){          
            filtered.push(task);
          }           
        }
      }
      return filtered;
    };
  })

  
  .controller("TaskList", function($scope, $rootScope, $state, $ionicLoading, $timeout, $ionicPopup, $db, $sapRequest, $epic, $cordovaGeolocation){  


    /********************************************************************************
    TASK LIST INITIATE
    ********************************************************************************/    
    $scope.tasks = [];    
    $scope.completedTasks = [];
    $scope.task = null;
    $scope.refreshList = false;    

    /********************************************************************************
    TASK LIST METHODS
    ********************************************************************************/      
    // this refresh task method refreshes new tasks and closed tasks:
    // new tasks are retrieved from the backend
    // closed tasks are retrieved from the local DB - if a closed task is older than 24 hours it is removed
    $scope.refreshTasks = function(loader){
      $scope.refreshList = true;

      // get unit id
      $scope.unitId = JSON.parse(localStorage.getItem("User")).UnitID;            
      if(!$scope.unitId){
        $timeout(function(){            
          $scope.refreshList = false;
        });
        return;
      } 

      getNewTasks();
      function getNewTasks(){

        // get all task notes
        $sapRequest.request({
          method: "GET",
          requestUri: "UnitSet('" + $scope.unitId + "')?$expand=UnitToTaskList/TaskListToTask/TaskToNoteHeader/NoteHeaderToLine"
        }, 
        function(data){ 

          var notes = [];
          for(var taskInd = 0; taskInd < data.UnitToTaskList.results.length; taskInd++){
            var task = data.UnitToTaskList.results[taskInd].TaskListToTask;

            for(var headerInd = 0; headerInd < task.TaskToNoteHeader.results.length; headerInd++){
              var header = task.TaskToNoteHeader.results[headerInd];
              
              for(var noteInd = 0; noteInd < header.NoteHeaderToLine.results.length; noteInd++){
                var note = header.NoteHeaderToLine.results[noteInd];
                note.HeaderID = headerInd + 1;
                notes.push(note);
              }
            }
          }    

          // build task note rows
          var columns = [
            'TaskId',
            'UnitId',
            'Header',
            'Content'
          ]
          // do note values
          var values = [];          
          for(var noteInd = 0; noteInd < notes.length; noteInd++){
            var note = notes[noteInd];                      
            values.push([
              note.TaskID,
              $scope.unitId,
              note.Header,
              note.Content
            ]);
          }
          
          $db.delete("UnitTaskNote", ["UnitId"], [$scope.unitId], function(){
            if(values.length < 1) return;
            $db.insertMany("UnitTaskNote", columns, values, function(result){ });
          });

        }, function(err){ console.log(err); });

        // do sap request
        $sapRequest.request({
          method: "GET",
          requestUri: "UnitSet('" + $scope.unitId + "')?$expand=UnitToTaskList/TaskListToTask/TaskToTaskUnit/TaskUnitToUnit/UnitToUnitEmployee"
        }, 
        function(data){ 

          var tasks = [];
          for(var t = 0; t < data.UnitToTaskList.results.length; t++){
            tasks.push(data.UnitToTaskList.results[t].TaskListToTask);
          }
          if(tasks.length < 1){                       
            getTasksFromDB();
            return;
          }

          // build unit task rows
          var columns = [
            'TaskID',
            'UnitId',
            'IncidentId',
            'Location',
            'AddLocation',
            'Street',
            'StreetNo',
            'Suburb',
            'Town',
            'GeoX',
            'GeoY',
            'Impact',
            'Priority',
            "Category1",
            "Category2",
            "Category3",
            "Category4",
            'CategoryLab1',
            'CategoryLab2',
            'CategoryLab3',
            'CategoryLab4',
            'DirectorateId',
            'DepartmentId',
            'SectionId',
            'SubsectionId',
            'DistrictId',
            'BaseId',
            'TaskDateFrom',
            'TaskDateTo',
            'SRPostingDate',            
            'TaskCreatedDate',
            'TaskCreatedTime',
            "SRCreatedDate",
            "SRCreatedTime",
            'IncidentCommander',            
            'Status',
            "Comment",
            "CallerName",
            "CallerSurname",
            "CallerPhoneNo",
            "CallerAltPhoneNo",
            "CallerStreetNo",
            "CallerStreet",
            "CallerSuburb",
            "Resolved",
            "ProcessType"
          ];
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

          // check if active task is still active
          var activeTask = {};
          try{
            activeTask = JSON.parse(localStorage.getItem("ActiveTask"));  
            if(activeTask === null){
              activeTask = {};
              activeTask.TaskID = "";
            }
          } catch(ex){
            activeTask.TaskID = "";
          }
          
          var stillHaveActive = false;
          
          // do unit tasks
          var values = [];
          var unitValues = [];         
          var incidentEmployeeValues = [];       

          // iterate through tasks, then units, then employeess
          for(var taskInd = 0; taskInd < tasks.length; taskInd++){
            var task = tasks[taskInd];                      
            
            // check if active task is still active
            if(activeTask.TaskID === task.TaskID){
              stillHaveActive = true;
            }

            if(task.Priority === "00") { task.Priority = "10" };

            // check if task should be flagged as resolved
            if(task.TaskStatus === "E0009" ||
              task.TaskStatus === "E0011" ||
              task.TaskStatus === "E0013" ||
              task.TaskStatus === "E0014"){
              
              task.Resolved = "X";
            }

            values.push([
              task.TaskID,
              $scope.unitId,
              task.IncidentID,
              task.Location,
              task.AddLocation,
              task.Street,
              task.StreetNo,
              task.Suburb,
              task.Town,
              task.GeoX,
              task.GeoY,
              task.Impact,              
              task.Priority,                            
              task.Category1,
              task.Category2,
              task.Category3,
              task.Category4,              
              task.CategoryLab1,
              task.CategoryLab2,
              task.CategoryLab3,
              task.CategoryLab4,
              task.DirectorateID,
              task.DepartmentID,
              task.SectionID,
              task.SubSectionID,
              task.DistrictID,
              task.BaseID,
              task.TaskDateFrom,
              task.TaskDateTo,
              task.SRPostingDate,              
              task.TaskCreatedDate,
              task.TaskCreatedTime,
              task.SRCreatedDate,
              task.SRCreatedTime,
              task.IncidentCommander,
              task.TaskStatus,
              task.Comment,
              task.CallerName,
              task.CallerSurname,
              task.CallerPhoneNo,
              task.CallerAltPhoneNo,
              task.CallerStreetNo,
              task.CallerStreet,
              task.CallerSuburb,
              (task.Resolved === "X") ? "true" : "false",
              task.SRProcessType
            ]);

            // do task units               
            for(var taskUnitInd = 0; taskUnitInd < task.TaskToTaskUnit.results.length; taskUnitInd++){
              var taskUnit = task.TaskToTaskUnit.results[taskUnitInd];   

              // ignore recalled
              if(taskUnit.TaskUnitToUnit.Status === "E0009"){
                break;
              }

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

              // do task units employees                     
              for(var incidentEmployeeInd = 0; incidentEmployeeInd < taskUnit.TaskUnitToUnit.UnitToUnitEmployee.results.length; incidentEmployeeInd++){
                var incidentEmployee = taskUnit.TaskUnitToUnit.UnitToUnitEmployee.results[incidentEmployeeInd];
                incidentEmployeeValues.push([
                  task.IncidentID,
                  incidentEmployee.Partner
                ]);
              }
            }            
          }

          if(!stillHaveActive){
            localStorage.setItem("ActiveTask","")  
          }

          // delete all smet tables
          $db.clear('IncidentEmployee');
          $db.clear('UnitTaskUnit');

          if(incidentEmployeeValues.length > 0){
            $db.insertMany("IncidentEmployee", incidentEmployeeColumns, incidentEmployeeValues);  
          }
          if(unitValues.length > 0){
            $db.insertMany("UnitTaskUnit", unitColumns, unitValues, function(result){ });
          }
          
          // delete previous tasks for this unit 
          $db.delete("UnitTask", ["UnitId"], [$scope.unitId], function(){
            if(values.length < 1){
              getTasksFromDB();
              return;
            } 
            $db.insertMany("UnitTask", columns, values, function(result){ 
              getTasksFromDB();
            });
          });

        }, function(err){                    
          $ionicPopup.alert({
            title: 'Error',
            template: err
          });          
          getTasksFromDB();
        });           
      }

      function getTasksFromDB(){
        // set current scope tasks from DB            
        $scope.taskUnits = {};
        var query = 'SELECT *, ' +
        'Department.Short AS DepartmentShort ' +
        'FROM UnitTask ' + 
        'LEFT OUTER JOIN Department ON UnitTask.DepartmentId = Department.Id ' +
        'WHERE UnitId = "' + $scope.unitId + '" ORDER BY Priority, SRCreatedDate DESC, SRCreatedTime DESC'

        $db.select(query, function(tasks){        
          $scope.tasks = tasks;
          formatTaskItems();    

          // set tab badge counters
          var resolvedTaskCount = 0;
          var activeTaskCount = 0;
          for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];

            // display in progress tasks
            if(task.Resolved === "false"){              
              activeTaskCount++;

            // display inactive tasks              
            } else {                
              resolvedTaskCount++;
            }           
          }
          $scope.resolvedTaskCount = resolvedTaskCount;
          $scope.activeTaskCount = activeTaskCount;

          // set current scope tasks
          $timeout(function(){            
            $scope.refreshList = false;
          });
        });      
      }

    }
    $scope.refreshTasks();


    
    $scope.openTask = function(task){

      // check if not unit commander, then just open task
      if(!$epic.checkRole()){
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
      var taskFound = false;
      for(var taskInd = 0; taskInd < $scope.tasks.length; taskInd++){
        if($scope.tasks[taskInd].TaskID === activeTask.TaskID){
          taskFound = true;           
          break;
        }
      }
      if(taskFound){
        // set empty strings for active task checks
        activeTask = {};
        activeTask.TaskID = "";
        activeTask.TaskStatus = "";
        gotoTask();
        return;
      }
      
      // check if this task is same as active task and if not prompt user to revert previous active back to accepted
      if(task.TaskID !== activeTask.TaskID){
        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'You are already in progress with another Task. Are you sure you would like to accept this task and reset the previous?'
        }).then(function(res) {
          if (res) {    

            if(window.cordova){
              $ionicLoading.show({ template: "Retrieving location" });
              $cordovaGeolocation.getCurrentPosition({ timeout: 5000 }).then(function (position) {                              
                $ionicLoading.hide();
                updateOldTask(position.coords.latitude, position.coords.longitude);              
              }, function(err) {
                $ionicLoading.hide();
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
                // set active task back to accepted
                // update old task status
                var cols = [ "Status" ];
                var vals = [ "E0003" ];
                $db.update("UnitTask", ["TaskID"], [activeTask.TaskID], cols, vals);

                gotoTask();   
              }, function(err){
                $ionicPopup.alert({
                  title: 'Error',
                  template: err
                });
              }, "Previous Task Status update");          
            }            
          }
        });
      } else {
        gotoTask();          
      }
      */

      function gotoTask(){
        $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to accept this task?'          
        }).then(function(res) {
          if (res) {          

            function updateTask(latitude, longitude){

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
                // update task status
                var cols = [ "Status" ];
                var vals = [ "E0003" ];
                $db.update("UnitTask", ["TaskID"], [task.TaskID], cols, vals);

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
          }
        });

      }
    }

    $scope.viewTask = function(task){
      localStorage.setItem("ViewTask", JSON.stringify(task));
      $state.go("taskview");
    }


    /********************************************************************************
    TASK LIST FUNCTIONS
    ********************************************************************************/    

    // UI stuff
    $scope.getTasklistAction = function(task){

      // check if not unit commander, then just open task
      if(!$epic.checkRole()){        
        return "Open";
      }

      // just task status
      if(task.Status === "E0002" || task.Status === "E0001"){
        return "Accept";
      } else {
        return "Open";
      }
    }

    $scope.getPriorityClass = function(task){        
      if(!task){
        task = $scope.task;
        if(!task)
          return;
      }      
      return $epic.getPriorityClass(task);
    }

    function formatTaskItems(){      
      // get icons, timestamps and other unit status descriptions for tasks                
      //$timeout(function(){
        for(var taskInd = 0; taskInd < $scope.tasks.length; taskInd++){
          var task = $scope.tasks[taskInd];
          task.CategoryIcon = $epic.getTaskCategoryIcon(task.ProcessType);                          
          task.TaskStatusName = $epic.getStatusName(task.Status);
          task.Timestamp = $epic.getTimestamp($epic.convertSAPDate(task.SRCreatedDate), $epic.convertSAPTime(task.SRCreatedTime));
        }
      //});                                  
    }

    $scope.toggleTask = function(task) {
      $scope.task = task;      
      if ($scope.isTaskShown(task)) {
        $scope.shownTask = null;
      } else {
        $scope.shownTask = task;
      }
    };    
    $scope.isTaskShown = function(task){
      return $scope.shownTask === task;
    };

    $scope.noActiveTasks = function(){
      for(var taskInd = 0; taskInd < $scope.tasks.length; taskInd++){ 
        var task = $scope.tasks[taskInd];
        if(task.Resolved === "false"){
            return false;    
        }
      } 

      if($scope.refreshList){
        return false;
      }
      return true;
    }
    $scope.noInactiveTasks = function(){
      for(var taskInd = 0; taskInd < $scope.tasks.length; taskInd++){ 
        var task = $scope.tasks[taskInd];
        if(task.Resolved === "true"){
            return false;
        }
      }
      
      if($scope.refreshList){
        return false;
      }

      return true;
    }    



  });  