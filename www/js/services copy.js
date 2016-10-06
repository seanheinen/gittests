/*************************************************************************************************************************************************
 * EPIC Mobile services:  
 * $cordovaAfaria   - Gets app connection settings from Afaria
 * $db              - Has DB CRUD operations
 * $sapRequest      - Makes REST request
 * $offlineStorage  - Stores Unsent data
 * $epic            - Generic app service for global functions
 * $sideMenu        - Side menu functions and methods
 * $smp             - SMP plugin wrapper (for logon and log off)
*************************************************************************************************************************************************/

// Ionic EpicMobile Global services
angular.module('epicmobile.services', ['ionic', 'ngCordova', 'base64'])


  /*************************************************************************************************************************************************
   * Afaria Service:  
   * Creates ngAfaria type factory for comm to custom afaria plugin 
   * method: getSettings ({username:xxx , password:xxxx })
   * response: backend settings
  *************************************************************************************************************************************************/
  .factory("$cordovaAfaria", ['$q', function ($q) {
    return {
      getSettings: function(options){        
        var q = $q.defer(); 
        // check afaria exists           
        if (!afaria) {      
          q.resolve(null);
          return q.promise;
        }
        afaria.getSettings(
          options, 
          function(result) {         
            q.resolve(result);
          }, function (err) {            
            q.reject(err);
          });
        return q.promise;
      }
    };
  }])


  /*************************************************************************************************************************************************
   * IMEI Service:  
   * Creates ngIMEI type factory for device IMEI retrieval
   * method: get
  *************************************************************************************************************************************************/
  .factory("$cordovaIMEI", ['$q', function ($q) {
    return {
      get: function(){
        var q = $q.defer(); 
        // check IMEI plugin exists           
        if (!window.plugins.imei) {          
          q.resolve(null);
          return q.promise;
        }
        window.plugins.imei.get(          
          function(result) {          
            q.resolve(result);
          }, function (err) {            
            q.reject(err);
          });
        return q.promise;
      }
    };
  }])  

  /*************************************************************************************************************************************************
   * Database Handler:
   * This handler handles all CRUD operations to the DB
   * init - initializes db with tables needed
   * insert - Does a single insert to table
   * insertMultiple - Insert multiple rows with one query
   * clear - Clears all records in table
   * update- Clears all records in table
   * delete - Clears all records in table
  *************************************************************************************************************************************************/
  .factory("$db", ['$cordovaSQLite', function($cordovaSQLite){

    var database = {};

    var db = null;

    // create all tables if they dont exist
    database.init = function(){
      
      if (window.cordova) {          
        db = $cordovaSQLite.openDB({
          name: "epicmobile.db",
          location: "default"
        }); // device
      } else {
        db = window.openDatabase("epicmobile.db", "1.0", "EPIC Mobile CoCT", 200000); // browser
      } 
           
      createDirectorate();      
      function createDirectorate(){                          
        // organization structure              
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Directorate (" +
            "Id TEXT PRIMARY KEY, " +
            "Short TEXT, " +
            "Description TEXT" +
          ")")
        .then(createDepartment, error);
      }          
      function createDepartment(){                        
        // organization structure        
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Department (" +
            "Id TEXT PRIMARY KEY, " +
            "DirectorateId TEXT, " +
            "Short TEXT, " +
            "Description TEXT" +
          ")")
        .then(createSection, error);
      }
      function createSection(){          
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Section (" +
            "Id TEXT PRIMARY KEY, " +
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "Short TEXT, " +
            "Description TEXT" +
          ")")
        .then(createDistrict, error);
      }        
      function createDistrict(){        
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS District (" +
            "Id TEXT PRIMARY KEY, " +
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +
            "Short TEXT, " +
            "Description TEXT" +
          ")")
        .then(createSubsection, error);
      }        
      function createSubsection(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Subsection (" +
            "Id TEXT PRIMARY KEY, " +
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +
            "DistrictId TEXT, " +
            "Short TEXT, " +
            "Description TEXT" +
          ")")
        .then(createBase, error)        
      }      
      function createBase(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Base (" +
            "Id TEXT PRIMARY KEY, " +
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +            
            "DistrictId TEXT, " +
            "SubsectionId TEXT, " +
            "Short TEXT, " +
            "Description TEXT" +
          ")")
        .then(createCategoryA, error);
      }
      function createCategoryA(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS CategoryA (" +
            "Id TEXT, " +            
            "Description TEXT," +
            "PRIMARY KEY (Id)" +
          ")")
        .then(createCategoryB, error);
      }
      function createCategoryB(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS CategoryB (" +
            "Id TEXT, " +
            "CategoryAId TEXT, " +            
            "Description TEXT," +
            "PRIMARY KEY (Id, CategoryAId)" +
          ")")
        .then(createCategoryC, error);
      }
      function createCategoryC(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS CategoryC (" +
            "Id TEXT, " +
            "CategoryAId TEXT, " +
            "CategoryBId TEXT, " +           
            "Description TEXT," +
            "PRIMARY KEY (Id, CategoryAId, CategoryBId)" +
          ")")
        .then(createCategoryD, error);
      }             
      function createCategoryD(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS CategoryD (" +
            "Id TEXT, " +
            "CategoryAId TEXT, " +
            "CategoryBId TEXT, " + 
            "CategoryCId TEXT, " +
            "Description TEXT," +
            "PRIMARY KEY (Id, CategoryAId, CategoryBId,CategoryCId)" +
          ")")
        .then(createConfiscations, error);
      }
      function createConfiscations(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS ConfiscationUnit (" +
            "Code TEXT, " +
            "Description TEXT, " +            
            "PRIMARY KEY (Code)" +
          ")")
        .then(createEmployee, error);
      } 
      // employees
      function createEmployee(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Employee (" +
            "Partner TEXT PRIMARY KEY, " +  
            "PersalNr TEXT, " +
            "EmployeeType TEXT, " +
            "LastName TEXT, " +                  
            "FirstName TEXT, " +
            "IDNR TEXT, " +
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +
            "SubsectionId TEXT, " +
            "DistrictId TEXT," +
            "BaseId TEXT" +
          ")")
        .then(createVehicle, error);
      }      
      // vehicles
      function createVehicle(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Vehicle (" +
            "VehicleId TEXT PRIMARY KEY, " +
            "VehicleType TEXT, " +
            "RegNum TEXT, " +
            "DirectorateId TEXT, " +    
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +
            "SubsectionId TEXT, " +
            "DistrictId TEXT, " +
            "BaseId TEXT" + 
          ")")
        .then(createStatus, error);
      }

      // unit status'
      function createStatus(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Status (" +
            "Status TEXT PRIMARY KEY, " +
            "ShortText TEXT, " +
            "Description TEXT " +            
          ")")
        .then(createUnit, error);
      }

      // unit data
      function createUnit(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Unit (" +
            "UnitId TEXT PRIMARY KEY, " +
            "UnitName TEXT, " +
            "Description TEXT, " + 
            "UnitType TEXT, " +
            "Status TEXT, " + 
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +
            "SubsectionId TEXT, " +
            "DistrictId TEXT, " +
            "BaseId TEXT, " + 
            "TempDirectorateId TEXT, " +
            "TempDepartmentId TEXT, " +
            "TempSectionId TEXT, " +
            "TempSubsectionId TEXT, " +
            "TempDistrictId TEXT, " +
            "TempBaseId TEXT" +
          ")")
        .then(createUnitEmployee, error);
      }      
      // unit employees
      function createUnitEmployee(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitEmployee (" +
            "UnitId TEXT, " +
            "Partner TEXT, " +            
            "Role TEXT, " +            
            "ProfId TEXT, " +            
            "PRIMARY KEY (UnitId, Partner)" +
          ")")
        .then(createUnitVehicle, error);
      }
      // unit vehicles
      function createUnitVehicle(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitVehicle (" +
            "UnitId TEXT, " +
            "VehicleId TEXT, " +
            "CallSign TEXT," +
            "PRIMARY KEY (UnitId, VehicleId)" +
          ")")
        .then(createUnitProficiency, error);
      }
      // unit proficiencies
      function createUnitProficiency(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitProficiency (" +
            "Id TEXT, " +
            "Description TEXT, " +
            "UnitId TEXT, " +
            "Filled TEXT, " +
            "PRIMARY KEY (UnitId, Id)" +
          ")")
        .then(createAlerts, error);
      }
      // unit proficiencies
      function createAlerts(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Alerts (" +            
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "AlertMessage TEXT, " +
            "GeoX TEXT, " +
            "GeoY TEXT, " +
            "Date TEXT, " +
            "Time TEXT, " +
            "Priority TEXT, " +
            "Location TEXT" +
          ")")
        .then(createUnitTask, error);
      }      
      // unit task
      function createUnitTask(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitTask (" +
            "TaskID TEXT, " +
            "UnitId TEXT, " +
            "IncidentId TEXT, " +            
            "Location TEXT, " +
            "AddLocation TEXT, " +
            "Street TEXT, " +
            "StreetNo TEXT, " +
            "Suburb TEXT, " +
            "Town TEXT, " +
            "GeoX TEXT, " +
            "GeoY TEXT, " +
            "Impact TEXT, " +
            "Priority TEXT, " +            
            "Category1 TEXT, " +
            "Category2 TEXT, " +
            "Category3 TEXT, " +
            "Category4 TEXT, " +
            "CategoryLab1 TEXT, " +
            "CategoryLab2 TEXT, " +
            "CategoryLab3 TEXT, " +
            "CategoryLab4 TEXT, " +
            "DirectorateId TEXT, " +
            "DepartmentId TEXT, " +
            "SectionId TEXT, " +
            "SubsectionId TEXT, " +
            "DistrictId TEXT, " +
            "BaseId TEXT, " +
            "TaskDateFrom TEXT, " +
            "TaskDateTo TEXT, " +
            "SRPostingDate TEXT, " +            
            "TaskCreatedDate TEXT, " +
            "TaskCreatedTime TEXT, " +
            "SRCreatedDate TEXT, " +
            "SRCreatedTime TEXT, " +
            "IncidentCommander TEXT, " +            
            "Status TEXT, " + 
            "Comment TEXT, " + 
            "CallerName TEXT, " + 
            "CallerSurname TEXT, " + 
            "CallerPhoneNo TEXT, " + 
            "CallerAltPhoneNo TEXT, " + 
            "CallerStreetNo TEXT, " + 
            "CallerStreet TEXT, " + 
            "CallerSuburb TEXT, " + 
            "Resolved TEXT, " + 
            "ProcessType TEXT, " + 
            "PRIMARY KEY (TaskID, UnitId)" +
          ")")
        .then(createUnitTaskUnit, error);
      }
      // unit task
      function createUnitTaskUnit(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitTaskUnit (" +
            "TaskID TEXT, " +            
            "ActiveTaskID TEXT, " +
            "ActiveTaskStatus TEXT, " +
            "UnitId TEXT, " +            
            "UnitName TEXT, " +
            "UnitType TEXT, " +
            "Description TEXT, " +
            "DirectorateID TEXT, " +
            "DirectorateName TEXT, " +
            "DepartmentID TEXT, " +
            "DepartmentName TEXT, " +
            "SectionID TEXT, " +
            "SectionName TEXT, " +
            "SubSectionID TEXT, " +
            "SubSectionName TEXT, " +
            "DistrictID TEXT, " +
            "DistrictName TEXT, " +
            "BaseID TEXT, " +
            "BaseName TEXT, " +
            "Status TEXT, " +
            "PRIMARY KEY (TaskID, ActiveTaskID)" +
          ")")
        .then(createUnitTaskNotes, error);
      }
      // task notes
      function createUnitTaskNotes(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitTaskNote (" +
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "TaskID TEXT, " +    
            "UnitId TEXT, " +        
            "Header TEXT, " +
            "Content TEXT " +            
          ")")
        .then(createTaskForm, error);
      }      
      // closure form
      function createTaskForm(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitTaskForm (" +            
            "TaskID TEXT, " +  
            "UnitId TEXT, " +                      
            "Form TEXT " +            
          ")")
        .then(createIncidentEmployee, error);
      }      
      // incident employees
      function createIncidentEmployee(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS IncidentEmployee (" +
            "IncidentId TEXT, " +
            "Partner TEXT, " +
            "PRIMARY KEY (IncidentId, Partner)" +
          ")")
        .then(createTaskMedia, error);
      }            
      // task media
      function createTaskMedia(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS UnitTaskMedia (" +
            "MediaId INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "TaskId TEXT, " +
            "UnitId TEXT, " +
            "FileName TEXT, " +
            "Source TEXT, " +
            "FullPath TEXT, " +
            "DisplayPath TEXT, " +
            "Longitude TEXT, " +
            "Latitude TEXT, " +
            "Date TEXT, " +
            "Time TEXT, " +
            "Type TEXT, " +
            "Uploaded TEXT, " +            
            "UploadedDate TEXT, " +
            "UploadedTime TEXT" +
          ")")
        .then(createResolutionCode, error);
      }      
      // resolution codes
      function createResolutionCode(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS ResolutionCode (" +            
            "Id TEXT PRIMARY KEY, " +
            "Description TEXT" +
          ")")
        .then(createOfflineDB, error);
      }                        
      // manage uploads
      function createOfflineDB(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Offline (" +            
            "TransId INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "Type TEXT, " +            
            "Date TEXT, " +
            "Time TEXT, " +
            "Geolocation TEXT, " +
            "Payload TEXT, " +
            "Sync TEXT" +
          ")")
        .then(createErrorLog, error);
      }                              
      // manage errors
      function createErrorLog(){
        $cordovaSQLite.execute(db, 
          "CREATE TABLE IF NOT EXISTS Error (" +            
            "TransId INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "IMEI TEXT, " +            
            "User TEXT, " +
            "Date TEXT, " +
            "Time TEXT, " +
            "Module TEXT, " +
            "Screen TEXT, " +
            "Cause TEXT, " +
            "Error TEXT, " +
            "Stacktrace TEXT" +
          ")")
        .then(leaveSplash, error);
      }                              
      // go to login screen        
      function leaveSplash(){          
        return;
      }

      function error (err) {        
        console.log(err);        
        alert("Failed to initialize DB. Error: " + JSON.stringify(err));
      }
    };

    database.dropTables = function(){
      $cordovaSQLite.execute(db, "DROP TABLE Directorate", []);
      $cordovaSQLite.execute(db, "DROP TABLE Department", []);
      $cordovaSQLite.execute(db, "DROP TABLE Section", []);
      $cordovaSQLite.execute(db, "DROP TABLE Subsection", []);
      $cordovaSQLite.execute(db, "DROP TABLE District", []);
      $cordovaSQLite.execute(db, "DROP TABLE Base", []);
      $cordovaSQLite.execute(db, "DROP TABLE CategoryA", []);
      $cordovaSQLite.execute(db, "DROP TABLE CategoryB", []);
      $cordovaSQLite.execute(db, "DROP TABLE CategoryC", []);      
      $cordovaSQLite.execute(db, "DROP TABLE CategoryD", []);  
      $cordovaSQLite.execute(db, "DROP TABLE ConfiscationUnit", []);          
      $cordovaSQLite.execute(db, "DROP TABLE Vehicle", []);
      $cordovaSQLite.execute(db, "DROP TABLE Employee", []);      
      $cordovaSQLite.execute(db, "DROP TABLE Status", []);
      $cordovaSQLite.execute(db, "DROP TABLE Unit", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitEmployee", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitVehicle", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitProficiency", []);
      $cordovaSQLite.execute(db, "DROP TABLE Alerts", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitTask", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitTaskNote", []);
      $cordovaSQLite.execute(db, "DROP TABLE IncidentEmployee", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitTaskUnit", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitTaskForm", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitTaskMedia", []);
      $cordovaSQLite.execute(db, "DROP TABLE UnitTaskCompleted", []);
      $cordovaSQLite.execute(db, "DROP TABLE Offline", []);
      $cordovaSQLite.execute(db, "DROP TABLE ResolutionCode", []);

      database.init();            
    }

    database.read = function(query, cb, errcb){
      $cordovaSQLite.execute(db, query, [])
        .then(function(result) {
          // if no result         
          if( result.rows.length < 1){
            cb(null);
            return;
          }              
          // if callback defined    
          if(cb){
            // check device or browser
            if (window.cordova) {
              cb(result.rows.item(0));
            } else {
              cb(result.rows[0]);
            }                        
          }          
        }, function (err) {
          if(errcb) if(errcb) errcb(err);
          console.log("Unable to read [" + query + "] - " + err.message);        
        });
    }    

    database.select = function(query, cb, err, errcb){
      $cordovaSQLite.execute(db, query, [])
        .then(function(result) {           
          if( result.rows.length < 1){
            cb([]);
            return;
          }         
          var resultList = [];
          // check device or browser
          if (window.cordova) {
            for (var i = 0; i < result.rows.length; i++) {
              resultList.push(result.rows.item(i));
            }          
          } else {
            angular.forEach(result.rows, function(item){
              resultList.push(item);
            })
          }          
          if(cb){
            cb(resultList);
          }          
        }, function (err) {          
          if(errcb) errcb(err);
          console.log("Unable to select [" + query + "] - " + err.message);        
        });
    }

    database.insert = function(table, columns, values, cb, errcb){   
      // build query
      var query = 'INSERT INTO ' + table + ' (';
      var valPlaceholder = '';  
      angular.forEach(columns, function(col){
        query += col + ','
        valPlaceholder += '?,';  
      });
      // remove end commas
      query = query.slice(0, -1)  + ')';
      valPlaceholder = valPlaceholder.slice(0, -1);      
      query += ' VALUES ('+valPlaceholder+')';
      
      $cordovaSQLite.execute(db, query, values)
        .then(function(res) {          
          if(cb)
            cb(res);
        }, function (err) {          
          if(errcb) errcb(err);
          console.log("Unable to insert [" + query + "] - " + err.message);        
        });
    }

    database.insertMany = function(table, columns, values, cb, errcb){   
      // build query
      var query  = 'INSERT INTO '+table+' ('
      angular.forEach(columns, function(col){
        query += col + ','        
      });
      query = query.slice(0, -1)  + ') SELECT ';

      // do first row      
      angular.forEach(values[0], function(value, index){
        query += '"' + value + '" AS '+ columns[index] + ',';
      });
      query = query.slice(0, -1);

      // do other rows
      values.splice(0, 1);
      angular.forEach(values, function(row, index){
        query += ' UNION ALL SELECT '
        angular.forEach(row, function(value){
           query += '"' + value + '",';
        });
        query = query.slice(0, -1);
      });

      // write rows 
      $cordovaSQLite.execute(db, query, [])
        .then(function(res) {          
          if(cb)
            cb(res);
        }, function (err) {          
          if(errcb) errcb(err);
          console.log("Unable to insert many [" + query + "] - " + err.message);        
        });
    } 

    database.update = function(table, keys, keyValues, columns, values, cb, errcb){   
      // iterate columns and values
      var query = 'UPDATE ' + table + ' SET '      
      for(var colIndex = 0; colIndex < columns.length; colIndex++){          
        query += columns[colIndex] + ' = "' + values[colIndex] + '", ';
      }
      query = query.slice(0, -2);

      // iterate keys and values
      query += ' WHERE '
      for(var keyIndex = 0; keyIndex < keys.length; keyIndex++){
        query += keys[keyIndex] + ' = "' + keyValues[keyIndex] + '" AND ';
      }
      query = query.slice(0, -5);      

      $cordovaSQLite.execute(db, query)
        .then(function(res) {          
          if(cb)
            cb(res);
        }, function (err) {          
          if(errcb) errcb(err);
          console.log("Unable to insert [" + query + "] - " + err.message);        
        });
    }   

    database.delete = function(table, keys, values, cb, errcb){   

      var query = 'DELETE FROM ' + table + ' WHERE ';      
      for(var keyIndex = 0; keyIndex < keys.length; keyIndex++){
        query += keys[keyIndex] + ' = "' + values[keyIndex] + '" AND ';
      }
      query = query.slice(0, -5);      

      $cordovaSQLite.execute(db, query, [])
        .then(function(res) {          
          if(cb)
            cb(res);
        }, function (err) { 
          if(errcb) errcb(err);
          console.log("Unable to delete from " + table + " - " + err.message);        
        }); 
    }    

    database.clear = function(table, cb, errcb){         
      $cordovaSQLite.execute(db, "DELETE FROM " + table, [])
        .then(function(res) {          
          if(cb)
            cb(res);
        }, function (err) { 
          if(errcb) errcb(err);
          console.log("Unable to clear " + table + " - " + err.message);        
        }); 
    }

    database.getCount = function(table, cb, errcb){
      var query = 'SELECT rowid FROM ' + table;
      $cordovaSQLite.execute(db, query, [])
        .then(function(res) {       
          // return count results                    
          if(cb)            
            cb(res.rows.length);
        }, function (err) {           
          if(errcb) errcb(err);
          console.log("Unable to clear " + table + " - " + err.message);          
        }); 
    }    
    
    return database;    
  }])

  /*************************************************************************************************************************************************
  * For the brave souls who get this far: You are the chosen ones, 
  * the valiant knights of programming who toil away, without rest, 
  * fixing my most awful code. To you, true saviors, kings of men,
  * I say this: never gonna give you up, never gonna let you down, 
  * never gonna run around and desert you. Never gonna make you cry,
  * never gonna say goodbye. Never gonna tell a lie and hurt you. 
  *************************************************************************************************************************************************/
  /*************************************************************************************************************************************************
   * OData Request Handler:
   * This handler handles all requests to the backend (format JSON)
   * GET - Does a normal GET
   * POST - Automatically gets the CSRF token and POST's
   * PUT - Automatically gets the CSRF token and the row and updates only the changed properties
   * DELETE - Automatically gets the CSRF token and DELETEs the record
   * Usage: SapRequest.request({ request data here }, success callback, error callback );
  *************************************************************************************************************************************************/
  .factory("$sapRequest", ['$ionicLoading', '$offlineStorage', function($ionicLoading, $offlineStorage){

    var request = {};

     request.getToken = function(success, error){        
      if(!success)
          return;      
      // get credentials
      var credentials = localStorage.getItem("Credentials");
              
      // get application context info to get URL
      var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));          
      if (!applicationContext) 
      {   
          //error({ Error : "Error: No Application Context." });
          alert("Fatal Error: #1");
          return;
      }
    
      // build url               
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
        success(response.headers["x-csrf-token"]);         
      },
      function(err){        
        error(err);        
      });
    }

    request.request = function(request, success, error, requestType){

      // this is offline demo mode      
      if(localStorage.getItem("Online") === "false"){        

        if(request.requestUri.indexOf("DeviceRegistrationSet") < 0){
          if(request.method === "PUT"){
            console.log(request);
            $ionicLoading.hide();                               
            $ionicLoading.show({ template: requestType });                 
          }
          if(request.method === "POST"){               
            console.log(request);
            $ionicLoading.hide();
            $ionicLoading.show({ template: requestType });
          }            
        }         

        setTimeout(function(){

          if(request.method === "GET"){               
            if(request.requestUri.indexOf("DirectorateSet") > -1){
              success(mockRelationalData.d);
            }
            if(request.requestUri === "VehicleSet"){
              success(mockVehicleData.d);
            }
            if(request.requestUri.indexOf("EmployeeSet") > -1){
              success(mockEmployeeData.d);
            }        
            if(request.requestUri.indexOf("StatusForUnitSet") > -1){
              success(mockUnitStatus.d);
            }
            if(request.requestUri.indexOf("AlertSet") > -1){
              success(mockAlertsData.d);
            }           
            if(request.requestUri.indexOf("CategoryASet") > -1){
              success(mockCategory.d);
            }                                         
            if(request.requestUri.indexOf("ResolutionCodeListSet") > -1){
              success(mockResolutionCode.d);
            }            
            if(request.requestUri.indexOf("UserSet(") > -1){                          
              success(mockUnitList.d);                
            }                           
            if(request.requestUri.indexOf("UnitToUnitEmployee/UnitEmployeeToEmployee") > -1){
              success(mockUnitData.d);  
            }              
            if(request.requestUri.indexOf("$expand=UnitToTaskList/TaskListToTask/TaskToTaskUnit/TaskUnitToUnit") > -1){              
              success(mockUnitTasks.d);              
            }
            if(request.requestUri.indexOf("$expand=UnitToTaskList/TaskListToTask/TaskToNoteHeader/NoteHeaderToLine") > -1){              
              success(mockUnitTaskNotes.d);              
            }           
          }
          if(request.method === "PUT"){
            $ionicLoading.hide();                               
            success();                            
          }
          if(request.method === "POST"){               
            $ionicLoading.hide();
            success();
          }          
        }, 500);
        return;
      }
    
      // CHECK THIS STUFF OUT LATER
      // get application context info to get URL
      var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));      
      if (!applicationContext) 
      {   
        //error({ Error : "Error: No Application Context." });
        alert("Fatal Error: #1");
        return;
      }

      // qa hardcode      
      //applicationContext.applicationEndpointURL = "http://xcdci01.capetown.gov.za:8000/sap/opu/odata/sap/Z_MOBILE_EPIC_SRV";
      //localStorage.setItem("ApplicationContext",JSON.stringify(applicationContext));

      // build url          
      request.requestUri = applicationContext.applicationEndpointURL + "/" + request.requestUri;                  
      
      // build headers obj
      var credentials = localStorage.getItem("Credentials");         

      if(typeof request.headers == "undefined"){
        request.headers = {};
      }
      request.headers["Authorization"] = credentials;
      
      // check request method     
      switch(request.method){     
        case "GET":         
          // insert json formatter
          if((request.requestUri).indexOf("?") < 1)
            request.requestUri += "?$format=json";
          else{
            request.requestUri += "&$format=json";
          }

          // insert cache busting header
          request.headers["If-Modified-Since"] = "Monday, 26 Jul 1969 00:00:00 GMT";
          OData.request(request,
          function(data){        
            console.log(request);
            success(data);         
          },
          function(err){          
            error(getMsg(err));
          });
          break;  
        
        case "POST":
          console.log(request);                    
          if(typeof requestType !== "undefined"){
            if(request.requestUri.indexOf("DeviceRegistrationSet") < 0){ // not for device id
              $ionicLoading.show({ template: requestType });
            }                      
          }          
          tokenRequest(function(token){                       
            request.headers["X-CSRF-Token"] = token;
            request.headers["Content-Type"] = "application/json";
            OData.request(request,              
              function(data){    
                if(typeof requestType !== "undefined"){                 
                  $ionicLoading.hide();                  
                }                      
                success(data);         
              },
              function(err){                    
                if(typeof requestType !== "undefined"){                 
                  $ionicLoading.hide();                  
                }
                if(request.requestUri.indexOf("LoginUserSet") < 0){ // not for login validation
                  error(getMsg(err));
                } else {
                  error(err);
                }
              }); 
            }, function(err){
              if(typeof requestType !== "undefined"){                 
                $ionicLoading.hide();                  
              }
              error(err);
            });                 
          break;
            
        case "PUT":  
          console.log(request);
          if(typeof requestType !== "undefined"){  // check for request type
            $ionicLoading.show({ template: requestType });
          }                    
          tokenRequest(function(token){
            request.headers["X-CSRF-Token"] = token;            
            request.headers["Content-Type"] = "application/json";           
            OData.request(request,
              function(data){     
                if(typeof requestType !== "undefined"){                 
                  $ionicLoading.hide();                  
                }
                success(data);         
              },
              function(err){    
                if(typeof requestType !== "undefined"){                 
                  $ionicLoading.hide();                  
                }
                error(getMsg(err));
              }); 
            }, function(err){
              if(typeof requestType !== "undefined"){                 
                $ionicLoading.hide();                  
              }
              error(err);
            });                 
          break;
      
        case "DELETE":
          console.log(request);
          if(typeof requestType !== "undefined"){  // check for request type
            $ionicLoading.show({ template: requestType });
          }          
          tokenRequest(function(token){
            request.headers["X-CSRF-Token"] = token;
            request.headers["Content-Type"] = "application/json";
            OData.request(request,
              function(data){   
                if(typeof requestType !== "undefined"){                 
                  $ionicLoading.hide();                  
                }             
                success(data);         
              },
              function(err){         
                if(typeof requestType !== "undefined"){                 
                  $ionicLoading.hide();                  
                }
                error(getMsg(err));
              }); 
          }, function(err){
            if(typeof requestType !== "undefined"){                 
              $ionicLoading.hide();                  
            }
            error(err);
          });                 
          break;          
            
        default:
          //error({ Error: "Error: Incorrect method" });                                                    
          break;
      }   


    } // end sapRequest method

    /*************************************************************************************************************************************************
     * Get CSRF Token service request
    *************************************************************************************************************************************************/
    function tokenRequest(success, error){        
      if(!success)
          return;      
      // get credentials
      var credentials = localStorage.getItem("Credentials");
              
      // get application context info to get URL
      var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));          
      if (!applicationContext) 
      {   
          //error({ Error : "Error: No Application Context." });
          alert("Fatal Error: #1");
          return;
      }
    
      // build url               
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
        success(response.headers["x-csrf-token"]);         
      },
      function(err){                
        error(getMsg(err));
      });
    }
    
    function getMsg(err){      

      //return err.response.statusCode + ": " + JSON.stringify(err);      

      // init message
      var msg = '';   
      // output appropriate error message
      switch(err.response.statusCode){
        case 0:
          msg = '<b>Error: No Connection</b><br />The request timed out. Please ensure that you have a data connection';
          break;  
        case 400:
          //msg = '<b>Error 400: Bad request</b><br/><br/>Invalid request.';                         
          var errorJSON = JSON.parse(err.response.body);          
          msg = '<b>Error 400:</b><br/><br/>' + errorJSON.error.message.value;
          break;          
        case 401:
          msg = '<b>Error 401: Authentication</b><br/><br/>Invalid username/password credentials.';         
          break;
        case 403:
          msg = '<b>Error 403: Authentication</b><br/><br/>Invalid token. Please ensure a connection to the server.';
          break;
        case 404:
          msg = '<b>Error 404: No Connection</b><br/><br/>The request timed out. Please ensure that you have a data connection.';
          break;  
        case 500:
          msg = '<br>Error 500: CRM/Gateway Server Error</b><br/><br/>Please contact your administrator.';
          break;
        case 502:
          msg = '<br>Error 502: CRM/Gateway Server Error</b><br/><br/>Please contact your administrator.';
          break;                      
        default:
          msg = "<br>Unexpected error " + err.response.statusCode + ": </b><br/><br/>Please contact your administrator.<br/><br/>" + err.response.statusText;                                                 
          break;
      }             
      return msg;
    }
    return request;
  }])

  /*************************************************************************************************************************************************
   * Offline storage:
   * This stores all failed transactions in offline db   
   * ALSO: Stores media
  *************************************************************************************************************************************************/
  .factory("$offlineStorage", ['$db', function($db){

    var offline = {};

    offline.addMedia = function(media, type){

      var columns = [        
        'Date', 
        'Time', 
        'Geolocation', 
        'Payload',
        'Type',
        'Sync'
      ];

      // get date and time
      var date = new Date();

      var pad = "00";
      var month = pad.substring(0, pad.length - (date.getMonth()+1).toString().length) + (date.getMonth()+1).toString()
      var day = pad.substring(0, pad.length - date.getDate().toString().length) + date.getDate().toString()
      var formattedDate = date.getFullYear().toString() + '/' + month + '/' + day

      var hour = pad.substring(0, pad.length - date.getHours().toString().length) + date.getHours().toString();
      var minute = pad.substring(0, pad.length - date.getMinutes().toString().length) + date.getMinutes().toString();
      var second = pad.substring(0, pad.length - date.getSeconds().toString().length) + date.getSeconds().toString();
      var formattedTime = hour+ ':' + minute      
      
      // to do later
      var values = [
        formattedDate, 
        formattedTime,         
        "",
        JSON.stringify(media),
        type,
        'true'
      ];

      $db.insert("Offline", columns, values, function(result){ });

    }

    offline.uploadMediaFail = function(id){

      var query = 'SELECT * FROM Offline WHERE Type = "Photo" OR Type = "Video" OR Type = "Sound"'
      $db.select(query, function(mediaList){

        for(var mediaInd = 0; mediaInd < mediaList.length; mediaInd++){
          var media = JSON.parse(mediaList[mediaInd].Payload);
          if(media.MediaId === id){
            var columns = [ "Sync" ];        
            var values = [ "true" ];          
            $db.update("Offline", ["TransId"], [id], columns, values);
          }        
        }
      })
    }

    offline.removeMedia = function(id){

      var query = 'SELECT * FROM Offline WHERE Type = "Photo" OR Type = "Video" OR Type = "Sound"'
      $db.select(query, function(mediaList){

        for(var mediaInd = 0; mediaInd < mediaList.length; mediaInd++){
          var media = JSON.parse(mediaList[mediaInd].Payload);
          if(media.MediaId === id){
            $db.delete("Offline", ["TransId"], [media.MediaId]);
          }        
        }
      })
    }

    offline.storeOffline = function(request, requestType, err){


      // only store if no connection
      if(err.indexOf("Connection") < 1){ // check for token
        return;        
      } else {
        err = {};
        err.response = {};
        err.response.statusCode = 0;
      }

      if(err.response.statusCode !== 404 && err.response.statusCode !== 0){
        return;
      }  

      // if no request type then dont store
      if(requestType === null){
        return;
      }

      var columns = [        
        'Date', 
        'Time', 
        'Geolocation', 
        'Payload',
        'Type',
        'Sync'
      ];

      // get date and time
      var date = new Date();

      var pad = "00";
      var month = pad.substring(0, pad.length - (date.getMonth()+1).toString().length) + (date.getMonth()+1).toString()
      var day = pad.substring(0, pad.length - date.getDate().toString().length) + date.getDate().toString()
      var formattedDate = date.getFullYear().toString() + '/' + month + '/' + day

      var hour = pad.substring(0, pad.length - date.getHours().toString().length) + date.getHours().toString();
      var minute = pad.substring(0, pad.length - date.getMinutes().toString().length) + date.getMinutes().toString();
      var second = pad.substring(0, pad.length - date.getSeconds().toString().length) + date.getSeconds().toString();
      var formattedTime = hour+ ':' + minute+ ':' + second      
      
      // get geolocation?

      var values = [
        formattedDate, 
        formattedTime,         
        "",
        JSON.stringify(request),
        requestType,
        "true"
      ];

      $db.insert("Offline", columns, values, function(result){ });

    };
    return offline;
  }])

  /*************************************************************************************************************************************************
   * EPIC Service:
   * Wrapper for all global functions and methods     
  *************************************************************************************************************************************************/
  .factory("$epic", ['$base64', '$db', function($base64, $db){
    
    var epic = {}; 

    epic.checkRole = function(){
      if(JSON.parse(localStorage.getItem("User")).Role === "COMMANDER"){
        return true;
      } else {
        return false;
      }
    }
 
    // vibrates phone
    epic.vibrate = function(){
      if (window.cordova)
        $cordovaVibration.vibrate(100);
    }

    // employee photo logic (gender)
    epic.getUnitEmployeePhoto = function(person){
      if(person.hasOwnProperty("Photo")){
        if(person.Photo.length)
          return person.Photo;
      }

      return 'img/search-user-icon.svg'

      // get gender
      if(person.IDNR.charAt(6) > 4){
        return 'img/search-user-icon-male.svg'
      } else {
        return 'img/search-user-icon-female.svg'
      }
    }

    // convert photo to base 64
    epic.convertBase64 = function(imageURI, cb){
      if(!imageURI){
        return null;
      }

      var image = new Image();
      image.onload = function(){      
        var canvas  = document.createElement('canvas');
        canvas.height = 2688;
        canvas.width = 1520;
        var context = canvas.getContext('2d');            
        context.drawImage(image, 0, 0);
        document.body.appendChild(canvas);        
        var imageData = canvas.toDataURL();
        imageData = imageData.replace("data:image/png", "data:image/jpg");
        cb(imageData)
      }
      image.src = imageURI;
    }

    // converts date from SAP to normal date
    epic.convertSAPDate = function(date){
      var formattedDate = date.substring(6,8) + "/" + date.substring(4,6) + "/" + date.substring(0,4)
      return formattedDate;
    }
    // converts time from SAP to normal date
    epic.convertSAPTime = function(time){
      var formattedTime = time.substring(0,2) + ":" + time.substring(2,4);
      return formattedTime;
    }

    // converts normal date to SAP date
    epic.convertToSAPDate = function(date){    
      var pad = "00";
      var month = pad.substring(0, pad.length - (date.getMonth()+1).toString().length) + (date.getMonth()+1).toString()
      var day = pad.substring(0, pad.length - date.getDate().toString().length) + date.getDate().toString()
      var formattedDate = date.getFullYear().toString() + month + day
      return formattedDate;
    }
    // converts normal time to SAP time
    epic.convertToSAPTime = function(time){      
      var pad = "00";
      var hour = pad.substring(0, pad.length - time.getHours().toString().length) + time.getHours().toString();
      var minute = pad.substring(0, pad.length - time.getMinutes().toString().length) + time.getMinutes().toString();
      var second = pad.substring(0, pad.length - time.getSeconds().toString().length) + time.getSeconds().toString();
      var formattedDate = hour + minute + second
      return formattedDate;
    }

    // get timestamp e.g. like Whatsapp dates
    epic.getTimestamp = function(date, time){

      var today = new Date();
    
      var thisDate = new Date(date.split("/")[2], (date.split("/")[1]-1), date.split("/")[0])

      // make sure date is in past
      if(Math.abs(thisDate) > Math.abs(today)){
        return time;
      }

      // check if day is today
      if(thisDate.toDateString() === today.toDateString()){
        return time;
      }

      // check if day is this week
      var msDiff = Math.abs(today-thisDate);
      var dayDiff = msDiff/1000/60/60/24;

      if(dayDiff < 2){
        return "Yesterday";
      }
      
      if(dayDiff < 7){
        
        var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        return days[thisDate.getDay()];
      }

      // otherwise return date
      return date;      
    } 

    /********************************************************************************
    TASK STATUS STUFF
    ********************************************************************************/    
    // build system statuses
    var taskSystemStatus = [
      {
        id: "E0001",
        name: "New",
        description: "Indicates that this task was just created.",
        icon: "ion-plus-circled",
        departmentsShort: [],
        order: "1"
      },
      {
        id: "E0002",
        name: "Assigned",
        description: "Indicates that you have been assigned this task.",
        icon: "ion-person",
        departmentsShort: [],
        order: "1"
      },
      {
        id: "E0003",
        name: "Accepted",
        description: "Indicates that you have accepted this task.",
        icon: "ion-checkmark-circled",
        departmentsShort: [],
        order: "2"        
      },
      {
        id: "E0007",
        name: "En-route",
        description: "Indicates that you are en-route to the Incident.",
        icon: "ion-navigate",
        departmentsShort: [],
        order: "3"
      },
      {
        id: "E0008",
        name: "Cancel",
        description: "",
        icon: "ion-ios-close",
        departmentsShort: [],
        order: "10"
      },
      {
        id: "E0009",
        name: "Recalled",
        description: "",
        icon: "ion-ios-location",
        departmentsShort: [],
        order: "10"
      },
      {
        id: "E0010",
        name: "At Incident",
        description: "Indicates that you have arrived at the Incident.",
        icon: "ion-ios-location",
        departmentsShort: [],
        order: "4"
      },
      {
        id: "E0011",
        name: "Ongoing",
        description: "Indicates that the Incident will be ongoing.",
        icon: "ion-ios-clock",
        departmentsShort: ["FR","DR"],
        order: "0"
      },
      {
        id: "E0012",
        name: "Stop",
        description: "Indicates that dispatch should stop assigning units to the incident.",
        icon: "ion-alert",
        departmentsShort: ["FR"],
        order: "5"        
      },
      {
        id: "E0013",
        name: "Reviewed",
        description: "",
        icon: "ion-alert",
        departmentsShort: ["FR"],
        order: "10"        
      },      
      {
        id: "E0014",
        name: "Cancel",
        description: "",
        icon: "ion-ios-close",
        departmentsShort: [],
        order: "10"
      },
      {
        id: "E0015",
        name: "Complete",
        icon: "ion-checkmark-circled",
        description: "Complete the task.",
        departmentsShort: [],
        order: "5"
      },
    ];

    epic.getStatusList = function(){      
      return taskSystemStatus;
    }    

    epic.getStatusName = function(statusId){
      var statusName = "";
      angular.forEach(taskSystemStatus, function(status){
        if(statusId === status.id){
          statusName = status.name
          return false;
        }
      });
      return statusName;
    }    
    epic.getStatusOrder = function(statusId){
      var statusOrder = "";
      for (var i = 0; i < taskSystemStatus.length; i++) {
        var status = taskSystemStatus[i];          
        if(statusId === status.id){
          statusOrder = status.order        
        }
      }
      return statusOrder;
    }


    // task list - cateogry icon
    epic.getTaskCategoryIcon = function(processType){
      var categoryIcon = "";
      switch(processType){
        // drm  
        case "YSRD":
          categoryIcon = "img/request-icon-drm.svg";
          break;        
        case "YSRP":
          categoryIcon = "img/request-icon-drm.svg";
          break;            
        //fire
        case "YSRF":
          categoryIcon = "img/request-icon-fire.svg";
          break;
        // police
        case "YSRL":          
          categoryIcon = "img/request-icon-mp.svg";
          break;          
        case "YSRM":          
          categoryIcon = "img/request-icon-mp.svg";
          break;      
        // traffic
        case "YSRT":
          categoryIcon = "img/request-icon-traffic.svg";
          break;                         
        
        default:
          categoryIcon = "img/request-icon-drm.svg";
          break;            
      }
      return categoryIcon;
    }

    epic.getPriorityClass = function(task){  
      var priorityClass = "";
      var thisPriority = parseInt(task.Priority, 10);
      switch(thisPriority){
        case 1:
          priorityClass = "task-assertive"
          break;
        case 2:
          priorityClass = "task-energized";
          break;
        case 3:
          priorityClass = "task-balanced";
          break;                    
        default:
          priorityClass = "task-dark";
          break;          
      }
      return priorityClass;
    }

    // build system unit statuses
    var unitSystemStatus = [
      {
        id: "E0001",
        name: "Inactive",
        description: "Indicates that you are unavailable to receive tasks.",
        icon: "ion-close",
        departmentShort: ""
      },   
      {
        id: "E0002",
        name: "Available",
        description: "Indicates that you are available to receive tasks.",
        icon: "ion-checkmark-circled",
        departmentShort: ""
      },
      {
        id: "E0003",
        name: "Available (At Base)",
        description: "Indicates that you are available and at base.",
        icon: "cus-availbase-icon",
        departmentShort: "FR"
      },
      {
        id: "E0009",
        name: "Available (Mobile Base)",
        description: "Indicates that you available and en-route to base.",
        icon: "ion-navigate",
        departmentShort: "FR"
      },

      {
        id: "E0004",
        name: "Accepted",
        description: "Indicates that you are available to receive tasks.",
        icon: "ion-checkmark-circled",
        departmentShort: "NA"
      },
      {
        id: "E0005",
        name: "Assigned",
        description: "Indicates that you available and en-route to base.",
        icon: "ion-navigate",
        departmentShort: "NA"
      },
      {
        id: "E0006",
        name: "En-route",
        description: "Indicates that you are en-route to an incident.",
        icon: "cus-availbase-icon",
        departmentShort: "NA"
      },
      {
        id: "E0007",
        name: "Stop",
        description: "Indicates that you are unavailable to receive tasks.",
        icon: "ion-close",
        departmentShort: "NA"
      },  
      {
        id: "E0008",
        name: "At Incident",
        description: "Indicates that you are available to receive tasks.",
        icon: "ion-checkmark-circled",
        departmentShort: "NA"
      },
      {
        id: "E0010",
        name: "Planned Incomplete",
        description: "Indicates that you available and en-route to base.",
        icon: "ion-navigate",
        departmentShort: "NA"
      },
      {
        id: "E0011",
        name: "Planned Complete",
        description: "Indicates that you are available and at base.",
        icon: "cus-availbase-icon",
        departmentShort: "NA"
      },
      {
        id: "E0012",
        name: "Activated",
        description: "Indicates that you are unavailable to receive tasks.",
        icon: "ion-close",
        departmentShort: "NA"
      },
      {
        id: "E0013",
        name: "Deactivated",
        description: "Indicates that you are unavailable to receive tasks.",
        icon: "ion-close",
        departmentShort: "NA"
      },
      {
        id: "E0014",
        name: "Archived",
        description: "Indicates that you are unavailable to receive tasks.",
        icon: "ion-close",
        departmentShort: "NA"
      }
    ];
    
    epic.getUnitStatusName = function(statusId){
      var statusName = "";
      angular.forEach(unitSystemStatus, function(status){
        if(statusId === status.id){
          statusName = status.name
          return false;
        }
      });
      return statusName;
    }    

    // get description for unit departmental data
    epic.getDescription = function(table, id, cb){

      if(!table || !id){
        cb("");
        return;
      }

      var query = 'SELECT Id, Description FROM ' + table + ' WHERE Id = "' + id + '"';
      $db.read(query, function(info){   
        if(!info){
          cb("");
          return;
        }
        cb(info.Description);
      });
    }

    epic.syncData = function(){
      // init
      $scope.transactions = [];    

      // get all unsent transactions
      var query = 'SELECT * FROM Offline';
      $db.select(query, function(transactions){        
        if(transactions.length < 1) return;

        // iterate through and resend
        angular.forEach(transactions, function(transaction){

          var request = JSON.parse(transaction.Payload);

          // automatically refreshes CSRF token
          $sapRequest.request(request, function(response){
            $db.delete("Offline", "TransId", TransId, function(){ })
          }, function(err){
            alert(JSON.stringify(err));
          });

        });
      });

    }

    return epic;    
  }])

   /*************************************************************************************************************************************************
   * SMP:
   * Wrapper for all SMP plugins
   * Login
   * Logout
  *************************************************************************************************************************************************/
  .factory("$smp", ['$state', '$ionicLoading', '$timeout', '$sapRequest', '$ionicPopup', function($state, $ionicLoading, $timeout, $sapRequest, $ionicPopup){

    var SMP = {};

    SMP.login = function(loginSuccess, loginError){
      
      // get connection settings and call SMP register
      var connectionSettings = JSON.parse(localStorage.getItem("ConnectionSettings"));

      //*******************************************************************************
      // override SAP login screen methods
      function customShowScreen(screenId, screenEvents, currentContext) {

        if (screenId =="SCR_SSOPIN_SET") {
          screenEvents.onskip();
          return true;

        } else if (screenId =="SCR_UNLOCK") {
          var context = {
              unlockPasscode: "password"
              }
          screenEvents.onsubmit(context);
          return true;

        } else if (screenId =="SCR_REGISTRATION") {
          screenEvents.onsubmit(currentContext.registrationContext);
          return true;

        } else if (screenId =="SCR_SET_PASSCODE_MANDATORY") {
          var context = {
            passcode: "password",
            passcode_CONFIRM: "password"
          }
          screenEvents.onsubmit(context);
          return true;

        } else if (screenId =="SCR_SET_PASSCODE_OPT_ON") {
          screenEvents.ondisable();
          return true;

        } else if (screenId =="SCR_SET_PASSCODE_OPT_OFF") {
          var context = {};
          screenEvents.onsubmit(context);
          return true;

        }
        else if (screenId =="SCR_ENTER_AFARIA_CREDENTIAL") {             
          var context = {
            afariaUser: "sa-global-eqtest",
            afariaPassword: "#nrolling16"
          };
          screenEvents.onsubmit(context);        
          return true;
        } else if (screenId =="SCR_ENTER_CREDENTIALS") {                     
          /* afaria part of smp logon is shit - it uses different register screen (SCR_ENTER_CREDENTIALS)
           also, the currentContext is reset at this point (suspect its due to logon afaria plugin expecting a specific settings template)
           got it working by using our manual connection settings - see cordovaAfaria in app.js ionicPlatform.ready.*/          
          screenEvents.onsubmit(connectionSettings);
          return true;
        }
        
        return false;  //skip the default value
      }
      function customShowNotification(screenId, notificationKey, notificationMessage) {
        if (screenId == "SCR_SSOPIN_SET" || screenId == "SCR_UNLOCK" || screenId == "SCR_REGISTRATION" || screenId == "SCR_SET_PASSCODE_MANDATORY" || screenId == "SCR_SET_PASSCODE_OPT_ON" || screenId == "SCR_SET_PASSCODE_OPT_OFF" || screenId == "SCR_ENTER_AFARIA_CREDENTIAL" || screenId == "SCR_ENTER_CREDENTIALS") {                                         
          loginError(notificationKey + ": Unable to login. Please contact your administrator.");          
          return true;
        }
        return false;
      }
      
      var logonView = sap.logon.IabUi;
      logonView.onShowScreen = customShowScreen;
      logonView.onShowNotification = customShowNotification;
      
      
      //*******************************************************************************
      // smp login with service account (obtained from afaria settings) to establish login store is non corrupt
      // delete registration to ensure auth challenge is made for service account
      // smp login with service account
      // make user validation request to check user account status
      // if user account is not fine, tell user why/ go to change password screen
      // if user account is fine continue
      // delete registration to ensure auth challenge is made for user
      // smp login with user account
      // continue preparation app phase

      // reason being if delete registration is called after a logon failure, it never responds with a callback (goes into error somwhere in the plugin)
      // by calling init before a delete, we ensure that the delete is run succesfully
      // following this we call init again and therefore ensure an auth challenge since the store is empty
      
      // init call backs
      function removeServiceAccountStore(result) { 
        // regardless of outcome, auth the service account
        sap.Logon.core.deleteRegistration(authServiceAccountLogin, authServiceAccountLogin);
      }

      function authServiceAccountLogin(response) { 
        sap.Logon.init(validateUserAccount, userLoginError, localStorage.getItem("ApplicationID"), serviceConnectionSettings, logonView);// LogonController line 476        
      }

      function validateUserAccount(result){

        // set context for validation user request
        localStorage.setItem("ApplicationContext",JSON.stringify(result));


          // validate user account with request
        var validateUserPayload = {
          "User": connectionSettings.user,
          "OldPassword": connectionSettings.password,
          "Action": "VALIDATE",
        };

        $sapRequest.request({
          method: "POST",
          requestUri: "LoginUserSet",
          data: validateUserPayload
        }, 
        function(data){          
          // user account is fine
          removeUserAccountStore();

        }, function(err){
          
          // user account isnt fine
          // tell the user why and possibly redirect to change password
          var errorJSON = JSON.parse(err.response.body);          
          var userStatus = errorJSON.error.message.value;    

          // remove .
          userStatus = userStatus.replace('.','');

          var errMsg = "";
          switch(userStatus){
            case "LOCKED":
              errMsg = "User account is locked out.";
              break;
            case "INACTIVE":
              errMsg = "User account is inactive.";
              break;
            case "EXPIRED":
              errMsg = "Your user account has expired. Please change your password.";
              break;
            case "PASSWORD":
              errMsg = "Incorrect user password.";
              break;
            case "OTHER":
              errMsg = "User is invalid.";
              break;                                                        
            default:
              errMsg = "User is invalid.";
              break;                                                        
          }

          var validateUserPopup = $ionicPopup.alert({
            title: 'Error',
            template: errMsg
          });

          if(userStatus === "EXPIRED"){
            validateUserPopup.then(function(){
              $state.go("changepassword");
            });
            
          }
          // check response code
          // if(...)
            //loginError(JSON.stringify(error));
          // else
          // direct to change password screen

        });
      
      }

      function removeUserAccountStore() { 
        // regardless of outcome, auth the user account
        sap.Logon.core.deleteRegistration(authUserAccountLogin, authUserAccountLogin);
      }

      function authUserAccountLogin() {
        sap.Logon.init(userLoginSuccess, userLoginError, localStorage.getItem("ApplicationID"), connectionSettings, logonView);// LogonController line 476        
      }

      function userLoginSuccess(result) {                  
        localStorage.setItem("ApplicationContext",JSON.stringify(result));
        loginSuccess(result);
      }      

      // only occurs when user cancels - which is impossible   
      function userLoginError(error) {                  
        loginError(JSON.stringify(error));
      } 
      
      //sap.Logon.init(removeStore, cberror, localStorage.getItem("ApplicationID"), connectionSettings, logonView);// LogonController line 476

      // change user credentials to service account
      var serviceConnectionSettings = JSON.parse(JSON.stringify(connectionSettings)); //deep copy      
      serviceConnectionSettings.user = "AENGELBRECHT";
      serviceConnectionSettings.password = "Tigger1606";        


      sap.Logon.init(removeServiceAccountStore, userLoginError, localStorage.getItem("ApplicationID"), serviceConnectionSettings, logonView);// LogonController line 476
    }

    // still to do this thing
    SMP.logout = function(cb){

      $timeout(function(){
        cb();
      }, 2000)
      

      return;
      sap.Logon.core.deleteRegistration(function(){
        cb();
      }, function(){
        cb();
      });
    }

    return SMP;

  }]);