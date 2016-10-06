angular.module('epicmobile.controller.resync', [])
  
  .controller("Resync", function($scope, $timeout, $sapRequest, $db){  

    /********************************************************************************
    INIT
    ********************************************************************************/    
    $scope.stopSendFlag = false;
    $scope.stopRecieveFlag = false;
    $scope.Error = "";
    $scope.sentCount = 0;
    $scope.sendTotal = 0;
    $scope.retrieveCount = 0;    
    $scope.retrieveTotal = 5;

    /********************************************************************************
    WATCH STATUS'
    ********************************************************************************/    
    // do watch for sending count
    $scope.$watch(function () {      
      return {
        sentCount: $scope.sentCount        
      };
    }, function (newVal, oldVal) {
      
      if($scope.sendTotal === 0) return;

      // update resync status
      if(newVal.sentCount === $scope.sendTotal){
        $scope.sendingStatus = "Sending data complete";    
        retrieveData();
      } else {
        $scope.sendingStatus = "Sent " + newVal.sentCount + " out of " + $scope.sendTotal;    
      }
    }, true);

    $scope.$watch(function () {      
      return {
        retrieveCount: $scope.retrieveCount
      };
    }, function (newVal, oldVal) {
      // update resync status
      if(newVal.retrieveCount === 0){
        $scope.retrievingStatus = "Waiting for send";   
        return;
      }

      if(newVal.retrieveCount === $scope.retrieveTotal){
        $scope.retrievingStatus = "Retrieved data complete";    //rgb(186, 255, 208)
      } else {
        $scope.retrievingStatus = "Retrieved " + newVal.retrieveCount + " out of " + $scope.retrieveTotal;
      }
    }, true);

    $scope.$watch(function () {      
      return {       
        stopSendFlag: $scope.stopSendFlag,
        stopRecieveFlag: $scope.stopRecieveFlag
      };
    }, function (newVal, oldVal) {

      if(newVal.stopSendFlag){
        $scope.sendingStatus = "Unable to send";            
        $scope.stopRecieveFlag = true;
      }

      if(newVal.stopRecieveFlag){
        $scope.retrievingStatus = "Unable to retrieve"
      }

    }, true);

    /********************************************************************************
    SEND DATA
    ********************************************************************************/    
    $scope.sendingStatus = "Sent 0 out of " + $scope.sendTotal;

    var query = 'SELECT * FROM Offline WHERE Sync = "true"';
    $db.select(query, function(list){

      $scope.sendTotal = list.length;
      if($scope.sendTotal < 1){        
        $scope.sendingStatus = "No unsent data"; // rgb(250, 199, 199)
        retrieveData();
        return;
      }

      uploadUnsent(list);
    }, function(err){
      $scope.sendingStatus = "Error retrieving unsent";      
    });

    function uploadUnsent(list){

      var requestInd = 0;
      iterateRequest();
      function iterateRequest(){

        // check stop flag
        if($scope.stopSendFlag){
          return;
        }        

        // check if requests are done
        if(requestInd === list.length){            
          return;
        }

        doRequest(list[requestInd], function(){
          // success
          requestInd++;
          iterateRequest();
        }, function(err){
          // error
          $scope.stopSendFlag = true;
          $scope.Error = err;          
        })
      }


      function doRequest(transaction, success, error){

        // check stop flag
        if($scope.stopSendFlag){          
          error();
          return;
        }
    
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
            $scope.stopSendFlag = true;
          });
        }

      }
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
          var columns = [ "Uploaded" ];
          var values = [ "true" ];          
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

  
    /********************************************************************************
    RETRIEVE DATA
    ********************************************************************************/        
    function retrieveData(){

      if($scope.stopSendFlag){
        return;
      }

      $scope.retrievingStatus = "Retrieved 0 out of " + $scope.retrieveTotal;    

      // get user data
      retrieveUser();

      // get unit data
      retrieveUnit();

      // get alerts
      retrieveAlerts();

      // get task list
      retrieveTasks();      
    }
    function retrieveUser(){

      var userDetails = JSON.parse(localStorage.getItem("User"));     

      $sapRequest.request({
        method: "GET",
        requestUri: "UserSet('" + userDetails.username + "')?$expand=UserToEmployee"
      }, 
      function(data){

        // get logged in employee details
        var employeeInfo = data.UserToEmployee;

        if(typeof employeeInfo == "undefined" || employeeInfo === null){
          $scope.retrieveCount++;
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
        
        localStorage.setItem("User", JSON.stringify(userDetails));

        $scope.retrieveCount++;

      }, function(err){
        $scope.$apply(function(){
          $scope.Error = err;
          $scope.stopRecieveFlag = true;  
        })
      });
    }
    function retrieveUnit(){
      
      var expandParam = "$expand=" +
        "UnitToUnitEmployee/UnitEmployeeToEmployee," +                  // get unit employees
        "UnitToUnitVehicle/UnitVehicleToVehicle," +                     // get unit vehicles
        "UnitToUnitProf"// +                                             // get unit proficiencies

      $sapRequest.request({
        method: "GET",
        requestUri: "UnitSet('" + JSON.parse(localStorage.getItem("User")).UnitID + "')?" + expandParam
      }, 
      function(data){  

        var unitDetails = data;
        var unitEmployeeDetails = unitDetails.UnitToUnitEmployee.results;
        var unitVehicleDetails = unitDetails.UnitToUnitVehicle.results;
        var unitProficiencies = unitDetails.UnitToUnitProf.results;        

        // write unit details to DB          
        insertUnit(unitDetails);
        function insertUnit(unitData){
          var columns = [
            'UnitId', 
            'UnitName', 
            'Description', 
            'UnitType', 
            'Status', 
            'DirectorateId', 
            'DepartmentId', 
            'SectionId', 
            'SubsectionId', 
            'DistrictId', 
            'BaseId',
            'TempDirectorateId', 
            'TempDepartmentId', 
            'TempSectionId', 
            'TempSubsectionId', 
            'TempDistrictId', 
            'TempBaseId'
          ];
          var values = [
            unitData.UnitID, 
            unitData.UnitName, 
            unitData.Description, 
            unitData.UnitType, 
            unitData.Status,
            unitData.DirectorateID, 
            unitData.DepartmentID, 
            unitData.SectionID,             
            unitData.SubSectionID,             
            unitData.DistrictID,
            unitData.BaseID,
            unitData.TempDirectorateID, 
            unitData.TempDepartmentID, 
            unitData.TempSectionID,             
            unitData.TempSubSectionID,             
            unitData.TempDistrictID,
            unitData.TempBaseID
          ];
          // delete then insert
          $db.delete("Unit", ["UnitId"], [unitDetails.UnitID], function(){
            $db.insert("Unit", columns, values, function(result){
              insertUnitEmployees(unitEmployeeDetails);
            }, function(err){
              $scope.stopRecieveFlag = true;
            });
          })          
        }
        function insertUnitEmployees(unitEmployeeData){
          if(unitEmployeeData.length < 1){
            $db.delete("UnitEmployee", ["UnitId"], [unitDetails.UnitID]);
            insertUnitVehicles(unitVehicleDetails);
            return;
          }

          // build unit employee rows
          var columns = [
            'UnitId', 
            'Partner',    
            'ProfId'         
          ];
          var values = [];
          angular.forEach(unitEmployeeData, function(employee){
            values.push([
              employee.UnitID, 
              employee.Partner,
              employee.PartnerFct
            ]);
          });
          
          $db.delete("UnitEmployee", ["UnitId"], [unitDetails.UnitID], function(){
            $db.insertMany("UnitEmployee", columns, values, function(result){
              insertUnitVehicles(unitVehicleDetails);
            });
          });
        }
        function insertUnitVehicles(unitVehicleData){

          if(unitVehicleData.length < 1){
            $db.delete("UnitVehicle", ["UnitId"], [unitDetails.UnitID]);
            insertProficiencies(unitProficiencies);
            return;
          }

          // build unit employee rows
          var columns = [
            'UnitId', 
            'VehicleId',
            'CallSign'             
          ];
          var values = [];
          angular.forEach(unitVehicleData, function(vehicle){
            values.push([
              vehicle.UnitID, 
              vehicle.VehicleID,
              vehicle.CallSign
            ]);
          });
          $db.delete("UnitVehicle", ["UnitId"], [unitDetails.UnitID], function(){
            $db.insertMany("UnitVehicle", columns, values, function(result){
              insertProficiencies(unitProficiencies);
            });
          });
        }
        function insertProficiencies(unitProficienciesData){     

          if(unitProficienciesData.length < 1){
            $db.delete("UnitProficiency", ["UnitId"], [unitDetails.UnitID]);
            $scope.retrieveCount++;
            return;
          }

          // build unit employee rows
          var columns = [
            "Id",
            "Description",
            "UnitId",
            "Filled"            
          ];

          var values = [];
          angular.forEach(unitProficienciesData, function(prof){
            values.push([
              prof.Prof, 
              prof.ProfDesc,
              prof.UnitID,
              prof.Filled
            ]);
          });
          $db.delete("UnitProficiency", ["UnitId"], [unitDetails.UnitID], function(){
            $db.insertMany("UnitProficiency", columns, values, function(result){              
              $scope.retrieveCount++;
            }, function(err){
              $scope.stopRecieveFlag = true;              
            });
          });          
        }
      }, function(err){        
        $scope.$apply(function(){
          $scope.Error = err;
          $scope.stopRecieveFlag = true;  
        })
        
      });
    }

    function retrieveAlerts(){
      // do sap request for more alerts      
      $sapRequest.request({
        method: "GET",
        requestUri: "AlertSet",
      }, 
      function(data){  
        $db.clear("Alerts");
        var alerts = data.results;

        if(alerts.length < 1){
          $scope.retrieveCount++;
          return;
        }

        var alertColumns = [          
          "AlertMessage",
          "GeoX",
          "GeoY",            
          "Date",
          "Time"
        ];            
          
        var alertValues = [];          
        for(var alertInd = 0; alertInd < data.results.length; alertInd++){
          var alert = alerts[alertInd];                      
          alertValues.push([
            alert.AlertMessage,
            alert.GeoX,
            alert.GeoY,
            alert.Date,
            alert.Time
          ]);
        }
        // if one alert            
        if(alertValues.length == 1){
          $db.insert("Alerts", alertColumns, alertValues[0]);        
        } else{
        // if many alerts
          $db.insertMany("Alerts", alertColumns, alertValues);
        }

        $scope.retrieveCount++;

      },function(err){     
        $scope.Error = err;     
        $scope.stopRecieveFlag = true;
      });

    }


    function retrieveTasks(){

      var unitId = JSON.parse(localStorage.getItem("User")).UnitID;

      // get all task notes
      $sapRequest.request({
        method: "GET",
        requestUri: "UnitSet('" + unitId + "')?$expand=UnitToTaskList/TaskListToTask/TaskToNoteHeader/NoteHeaderToLine"
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
            unitId,
            note.Header,
            note.Content
          ]);
        }
          
        $db.delete("UnitTaskNote", ["UnitId"], [unitId], function(){
          if(values.length < 1){
            $scope.retrieveCount++;
            return;
          } 
          $db.insertMany("UnitTaskNote", columns, values, function(result){
            $scope.retrieveCount++;
          });
        });

      }, function(err){ console.log(err); });

      // do sap request
      $sapRequest.request({
        method: "GET",
        requestUri: "UnitSet('" + unitId + "')?$expand=UnitToTaskList/TaskListToTask/TaskToTaskUnit/TaskUnitToUnit/UnitToUnitEmployee"
      }, 
      function(data){ 

        var tasks = [];
        for(var t = 0; t < data.UnitToTaskList.results.length; t++){
          tasks.push(data.UnitToTaskList.results[t].TaskListToTask);
        }
        if(tasks.length < 1){                       
          $scope.retrieveCount++;
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
        
        // do unit tasks
        var values = [];
        var unitValues = [];
        var incidentEmployeeValues = [];

        // iterate through tasks, then units, then employeess
        for(var taskInd = 0; taskInd < tasks.length; taskInd++){
          var task = tasks[taskInd];                      
          if(task.Priority === "00") { task.Priority = "10" };
          values.push([
            task.TaskID,
            unitId,
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
        $db.delete("UnitTask", ["UnitId"], [unitId], function(){
          if(values.length < 1){
            $scope.retrieveCount++;
            return;
          } 
          $db.insertMany("UnitTask", columns, values, function(result){ 
            $scope.retrieveCount++;
          });
        });
      }, function(err){   
        $scope.Error = err;                 
        $scope.stopRecieveFlag = true;
      });           
    }

    $scope.complete = function(){
      window.history.back();       
    }

  });