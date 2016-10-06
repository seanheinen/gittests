angular.module('epicmobile.controller.login', ['ngCordova', 'base64'])

  .controller("Login", function($scope, $state, $ionicPopup, $base64, $ionicLoading, $epic, $db, $smp, $cordovaNetwork){

    // set last used username
    $scope.credenitals = {};
    $scope.credenitals.password = "";
    try{
      $scope.credenitals.username = JSON.parse(localStorage.getItem("User")).username;  
    } catch(ex){
      $scope.credenitals.username = "";
    }
    

    // Set the default value of inputType
    $scope.inputType = 'password';
  
    // Hide & show password function
    $scope.hideShowPassword = function(){
      if ($scope.inputType == 'password')
        $scope.inputType = 'text';
      else
        $scope.inputType = 'password';
    };

  	$scope.doLogin = function(){

      // this is used to ensure that the preparation is not continuessly run when a unit is selected
      localStorage.setItem("PrepRefresh","false");
          
	 		// get user details      
	    var username = $scope.credenitals.username.toUpperCase();
	    var password = $scope.credenitals.password;

      // validate     
      if(!username.length || !password.length){         
        $ionicPopup.alert({
          title: 'Validation',
          template: 'Please ensure that you have entered in a username and password.'
        });
        return;
      }

      var pwdBase64 = $base64.encode(username+':'+password); 
      pwdBase64 = $base64.encode('AENGELBRECHT:Tigger1606'); 
      var authBase64 = 'Basic ' + pwdBase64;  
      localStorage.setItem("Credentials", authBase64);
      localStorage.setItem("User", JSON.stringify({ username: username }));      

	    
      // add username credentials to connection settings
      var connectionSettings = JSON.parse(localStorage.getItem("ConnectionSettings"));    
      connectionSettings.user = username;
      connectionSettings.password = password;        
      localStorage.setItem("ConnectionSettings",JSON.stringify(connectionSettings));      

      $state.go('prepare');      
		};

    $scope.changePassword = function(){

      $state.go("changepassword");

    }

    /********************************************************************************
    SIDE MENU STUFF
    ********************************************************************************/
    // do online/offline
    if (window.cordova) {
      var currentNetwork = $cordovaNetwork.getNetwork();
      localStorage.setItem("Network", currentNetwork);      

      $scope.networkStatusClass = "network-status-online";
      $scope.networkStatus = "Online - " + currentNetwork;
     
      // listen for Online event
      $scope.$on('$cordovaNetwork:online', function(event, networkState){        
        localStorage.setItem("Network", $cordovaNetwork.getNetwork());

        switch(networkState){          
          case "2g":
            $scope.networkStatusClass = "network-status-limited";  
            $scope.networkStatus = "Limited - " + networkState;          
            break
          case "wireless":
            $scope.networkStatusClass = "network-status-limited";
            $scope.networkStatus = "Online - " + networkState;
            $epic.syncData();
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
      $scope.networkStatusClass = "network-status-online";
      $scope.networkStatus = "Online - 4G"; 
    }

    $scope.goHelp = function(){
      $state.go("help");  
    }

    $scope.goSettings = function(){
      $state.go("settings");  
    }

    $scope.goClearCache = function(){
      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to clear application cache?'
      }).then(function(res) {
        if (res) {
          localStorage.setItem("LastPreparation", "");          

          // temp
          $db.dropTables();
        }
      });
    }

    $scope.goExit = function(){
      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to exit application?'
      }).then(function(res) {
        if (res) {
          ionic.Platform.exitApp();  
        }
      });
    }


  })

  .controller("Prepare", function($scope, $state, $timeout, $ionicPopup, $ionicLoading, $sapRequest, $db, $smp, $epic, $cordovaIMEI, $ionicModal){

		// code to run each time view is entered
  	$scope.$on('$ionicView.enter', function() { 

      // check if logging in or carrying on with unit list to details
      var prepRefresh = localStorage.getItem("PrepRefresh");
      if(prepRefresh === "true"){
        return;
      }
      localStorage.setItem("PrepRefresh","true");

      // update prepar status
      $timeout(function(){
        $scope.loadingStatus = "Authenticating User";  
      });        

      function loginSuccess(result){  
        getRelationalData();        
      }
      function loginError(error){
        $state.go("login");      
        $ionicPopup.alert({
          title: 'Error',
          template: "Authorization failed. Incorrect username or password or authorization server may be down."
        });
      }

      // if refresh app then skip login
      if(localStorage.getItem("RefreshApp") === "true"){
        getRelationalData();
        return;
      }

      var connectionSettings = JSON.parse(localStorage.getItem("ConnectionSettings"));    
      if(localStorage.getItem("Online") === "false"){
      
        // fake login here
        applicationContext = {};        
        applicationContext.applicationEndpointURL = "http://xcdci01.capetown.gov.za:8000/sap/opu/odata/sap/Z_MOBILE_EPIC_SRV";

        applicationContext.registrationContext = {};
        applicationContext.registrationContext.user = connectionSettings.user;
        applicationContext.registrationContext.password = connectionSettings.password;
        localStorage.setItem("ApplicationContext",JSON.stringify(applicationContext));

        // prepare application      
        getRelationalData();
        return;
      } else {
        $smp.login(loginSuccess, loginError);
      }      
		});

		// get relational data  	  	  	
  	function getRelationalData(){

      // check if large payloads have been fetched today already    
      var lastPrepDate = localStorage.getItem("LastPreparation");
      var today = new Date();
      today = today.toDateString();      
      if(today === lastPrepDate){
        getUnitList();
        return;
      }

      // update status
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Directorate Structure";  
      });              

      $sapRequest.request({
        method: "GET",
        requestUri: "DirectorateSet?$expand=DirectorateToDepartment/DepartmentToSection/SectionToDistrict/DistrictToSubSection/SubSectionToBase"                            
      }, 
      function(data){  
        // clear $db's if request is success
        $db.clear("Directorate");
        $db.clear("Department");
        $db.clear("Section");
        $db.clear("District");
        $db.clear("Subsection");        
        $db.clear("Base");    

        // build lists
        // multiple loops iterate through granularly to build lists
        var directorateList = [];  
        var departmentList = [];  
        var sectionList = [];
        var subsectionList = [];
        var districtList = [];
        var baseList = [];
        angular.forEach(data.results, function(directorate){
          directorateList.push(directorate);
          angular.forEach(directorate.DirectorateToDepartment.results, function(department){
            departmentList.push(department);
            angular.forEach(department.DepartmentToSection.results, function(section){
              sectionList.push(section);
              angular.forEach(section.SectionToDistrict.results, function(district){
                districtList.push(district);              
                angular.forEach(district.DistrictToSubSection.results, function(subsection){
                  subsectionList.push(subsection);                
                  angular.forEach(subsection.SubSectionToBase.results, function(base){
                    baseList.push(base);
                  }); // end base iteration
                }); // end subsection iteration
              }); // end district iteration
            }); // end section iteration
          }); // end department iteration
        }); // end directorate iteration

        // write directorates to db
        insertDirectorates();
        function insertDirectorates(){
          var columns = [
            'Id', 
            'Short',
            'Description'          
          ];
          var values = [];
          values.push([
            '00000000',             
            'NA',
            'none'
          ]);
          angular.forEach(directorateList, function(directorate){
            values.push([
              directorate.DirectorateID, 
              directorate.DirectorateSC,
              directorate.DirectorateName            
            ]);
          });
          $db.insertMany("Directorate", columns, values, function(result){
            insertDepartments();
          });
        }                
        function insertDepartments(){
          // write departments to db
          var columns = [
            'Id', 
            'DirectorateId',
            'Short',
            'Description'          
          ];
          var values = [];
          values.push([
            '00000000',
            '00000000', 
            'NA',
            'none'
          ]);
          angular.forEach(departmentList, function(department){
            values.push([
              department.DepartmentID, 
              department.DirectorateID,
              department.DepartmentSC,
              department.DepartmentName            
            ]);
          });
          $db.insertMany("Department", columns, values, function(result){
            insertSections();
          });
        }        
        function insertSections(){
          // write sections to db
          var columns = [
            'Id', 
            'DirectorateId',
            'DepartmentId',
            'Short',
            'Description'          
          ];
          var values = [];
          values.push([
            '00000000',
            '00000000', 
            '00000000', 
            'NA',
            'none'
          ]);
          angular.forEach(sectionList, function(section){
            values.push([
              section.SectionID,
              section.DirectorateID,
              section.DepartmentID,
              section.SectionSC,
              section.SectionName            
            ]);
          });
          $db.insertMany("Section", columns, values, function(result){
            insertDistricts();
          });
        }
        function insertDistricts(){
          // write sections to db
          var columns = [
            'Id', 
            'DirectorateId',
            'DepartmentId',
            'SectionId',            
            'Short',
            'Description'          
          ];
          var values = [];
          values.push([
            '00000000', 
            '00000000', 
            '00000000',  
            '00000000',                         
            'NA',
            'none'
          ]);
          angular.forEach(districtList, function(district){
            values.push([
              district.DistrictID,
              district.DirectorateID,
              district.DepartmentID,
              district.SectionID,      
              district.DistrictSC,
              district.DistrictName            
            ]);
          });
          $db.insertMany("District", columns, values, function(result){
            insertSubSections();
          });
        }
        function insertSubSections(){
          // write sections to db
          var columns = [
            'Id', 
            'DirectorateId',
            'DepartmentId',
            'SectionId',
            'DistrictId',
            'Short',
            'Description'          
          ];
          var values = [];
          values.push([
            '00000000', 
            '00000000', 
            '00000000', 
            '00000000',
            '00000000',
            'NA',
            'none'
          ]);
          angular.forEach(subsectionList, function(subsection){
            values.push([
              subsection.SubSectionID,
              subsection.DirectorateID,
              subsection.DepartmentID,
              subsection.SectionID,
              subsection.DistrictID,
              subsection.SubSectionSC,
              subsection.SubSectionName            
            ]);
          });
          $db.insertMany("Subsection", columns, values, function(result){
            insertBases();
          });
        }
        function insertBases(){
          // write sections to db
          var columns = [
            'Id', 
            'DirectorateId',
            'DepartmentId',
            'SectionId',
            'SubsectionId',
            'DistrictId',
            'Short',
            'Description'          
          ];
          var values = [];
          values.push([
            '00000000', 
            '00000000', 
            '00000000', 
            '00000000', 
            '00000000', 
            '00000000',
            'NA',
            'none'
          ]);
          angular.forEach(baseList, function(base){
            values.push([
              base.BaseID,
              base.DirectorateID,
              base.DepartmentID,
              base.SectionID,
              base.SubSectionID,
              base.DistrictID,
              base.BaseSC,
              base.BaseName            
            ]);
          });
          $db.insertMany("Base", columns, values, function(result){
            getCategoryData();
          });
        }        
      },
      function(err){  
        window.history.back();         
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });
      }); 

    }

    // get cateogries data            
    function getCategoryData(){
      // update status
      $timeout(function(){
      });      
        $scope.loadingStatus = "Retrieving Categories";  

      $sapRequest.request({
        method: "GET",
        requestUri: "CategoryASet?$expand=CategoryAToB/CategoryBToC/CategoryCToD"                    
      }, 
      function(data){  
        // clear $db's if request is success
        $db.clear("CategoryA");
        $db.clear("CategoryB");
        $db.clear("CategoryC");
        $db.clear("CategoryD");        

        // build lists
        // multiple loops iterate through granularly to build lists
        var categoryAList = [];  
        var categoryBList = [];  
        var categoryCList = [];
        var categoryDList = [];        
        angular.forEach(data.results, function(categoryA){
          categoryAList.push(categoryA);
          angular.forEach(categoryA.CategoryAToB.results, function(categoryB){
            categoryBList.push(categoryB);
            angular.forEach(categoryB.CategoryBToC.results, function(categoryC){
              categoryCList.push(categoryC);
              angular.forEach(categoryC.CategoryCToD.results, function(categoryD){
                categoryDList.push(categoryD);                
              }); // end category D iteration
            }); // end category C iteration
          }); // end category B iteration
        }); // end category A iteration
        
        // write directorates to db
        insertCategoryA();
        function insertCategoryA(){
          var columns = [
            'Id', 
            'Description'          
          ];
          var values = [];
          angular.forEach(categoryAList, function(categoryA){
            values.push([
              categoryA.CatID_A, 
              categoryA.CatLabel            
            ]);
          });
          $db.insertMany("CategoryA", columns, values, function(result){
            insertCategoryB();
          });
        }                
        function insertCategoryB(){
          // write departments to db
          var columns = [
            'Id', 
            'CategoryAId',
            'Description'          
          ];
          var values = [];
          angular.forEach(categoryBList, function(categoryB){
            values.push([
              categoryB.CatID_B,
              categoryB.CatID_A,
              categoryB.CatLabel
            ]);
          });
          $db.insertMany("CategoryB", columns, values, function(result){
            insertCategoryC();
          });
        }        
        function insertCategoryC(){
          // write sections to db
          var columns = [
            'Id', 
            'CategoryAId',
            'CategoryBId',            
            'Description'          
          ];
          var values = [];
          angular.forEach(categoryCList, function(categoryC){
            values.push([
              categoryC.CatID_C,
              categoryC.CatID_A,
              categoryC.CatID_B,
              categoryC.CatLabel
            ]);  
          });
          $db.insertMany("CategoryC", columns, values, function(result){
            insertCategoryD();
          });
        }
        function insertCategoryD(){
          // write sections to db
          var columns = [
            'Id', 
            'CategoryAId',
            'CategoryBId',
            'CategoryCId',
            'Description'          
          ];
          var values = [];
          angular.forEach(categoryDList, function(categoryD){
            values.push([
              categoryD.CatID_D,              
              categoryD.CatID_A,
              categoryD.CatID_B,
              categoryD.CatID_C,
              categoryD.CatLabel
            ]);
          });

          // do 500 item splices if cateogry D list large
          var chunks = [];
          if(values.length > 500){          
            while(values.length) {
              chunks.push(values.splice(0,500));            
            }          
          } else {
            chunks.push(values.splice(0,500));            
          }
          
          var chunkCnt = 0;
          insertCategoryDChunk(chunks[chunkCnt]);
          function insertCategoryDChunk(chunk){

            if(!chunk){            
              getConfiscationUnit();
              return;
            }

            $db.insertMany("CategoryD", columns, chunk, function(result){
              chunkCnt++;
              insertCategoryDChunk(chunks[chunkCnt]);
            });
          }
        }

      },
      function(err){  
        window.history.back();         
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      }); 

    }    


    function getConfiscationUnit(){

      // update status
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Confiscation Units";
      });


      // do vehicle request
      /*
      $sapRequest.request({
          method: "GET",
          requestUri: "DropDownUOMSet"
      }, 
      function(data){  
      */
      var data = confiscationsUnit.d;

      if(data.results.length < 1){
        getResolutionCode();
        return;
      }

      // clear resolution codes
      $db.clear("ConfiscationUnit");

      // build vehicle rows
      var columns = [
        'Code', 
        'Description'          
      ];
      var values = [];
      angular.forEach(data.results, function(unit){
        values.push([
          unit.Code, 
          unit.Description
        ]);
      });

      $db.insertMany("ConfiscationUnit", columns, values, function(result){
        getResolutionCode();
      });

      /*
      }, function(err){           
        window.history.back();         
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      });
      */
    }

    function getResolutionCode(){

      // update status
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Resolution Codes";
      });
      
      // do vehicle request
      $sapRequest.request({
          method: "GET",
          requestUri: "ResolutionCodeListSet"
      }, 
      function(data){  

        if(data.results.length < 1){
          getVehicles();
          return;
        }

        // clear resolution codes
        $db.clear("ResolutionCode");

        // build vehicle rows
        var columns = [
          'Id', 
          'Description'          
        ];
        var values = [];
        angular.forEach(data.results, function(resolution){
          values.push([
            resolution.Code, 
            resolution.Description
          ]);
        });

        $db.insertMany("ResolutionCode", columns, values, function(result){
          getVehicles();
        });

      }, function(err){           
        window.history.back();         
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      });
    }

  	// get vehicles  	  	
  	function getVehicles(){  		    
      
      // update status
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Department Vehicles";
      });

      // do vehicle request
      $sapRequest.request({
          method: "GET",
          requestUri: "VehicleSet"
      }, 
      function(data){  

        // clear vehicles
        $db.clear("Vehicle");

        if(data.results.length < 1){
          getEmployees();
          return;
        }

        // build vehicle rows
        var columns = [
          'VehicleId', 
          'VehicleType', 
          'RegNum',           
          'DirectorateId',
          'DepartmentId', 
          'SectionId', 
          'SubsectionId', 
          'DistrictId', 
          'BaseId'
        ];
        var values = [];
        angular.forEach(data.results, function(vehicle){
          values.push([
            vehicle.VehicleID, 
            vehicle.VehicleType, 
            vehicle.RegNum, 
            vehicle.DirectorateID,
            vehicle.DepartmentID, 
            vehicle.SectionID, 
            vehicle.SubSectionID, 
            vehicle.DistrictID, 
            vehicle.BaseID
          ]);
        });

        // do 500 item splices if vehicle list large
        var chunks = [];
        if(values.length > 500){          
          while(values.length) {
            chunks.push(values.splice(0,500));            
          }          
        } else {
          chunks.push(values.splice(0,500));            
        }
        
        var chunkCnt = 0;
        insertVehicleChunk(chunks[chunkCnt]);
        function insertVehicleChunk(chunk){

          if(!chunk){            
            getEmployees();
            return;
          }

          $db.insertMany("Vehicle", columns, chunk, function(result){
            chunkCnt++;
            insertVehicleChunk(chunks[chunkCnt]);
          });
        }

      }, function(err){           
        window.history.back();         
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      }); 
	  }

    // DEPRECATED
  	// get employees  	
  	function getEmployees(){
      
      // update status
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Department Employees";
      });

      // do employees request
      $sapRequest.request({
          method: "GET",
          requestUri: "EmployeeSet"
      }, 
      function(data){  

        // clear vehicles
        $db.clear("Employee");

        if(data.results.length < 1){
          getStatus();
          return;
        }

        // build vehicle rows
        var columns = [
          'PersalNr', 
          'EmployeeType', 
          'LastName', 
          'Partner', 
          'FirstName',
          'IDNR',   
          "DirectorateId",
          'DepartmentId', 
          'SectionId', 
          'SubsectionId', 
          'DistrictId', 
          'BaseId'
        ];
        var values = [];
        angular.forEach(data.results, function(employee){
          values.push([
            employee.PersalNr, 
            employee.EmployeeType, 
            employee.LastName, 
            employee.Partner, 
            employee.FirstName,
            employee.IDNR,          
            employee.DirectorateID,
            employee.DepartmentID, 
            employee.SectionID,             
            employee.SubSectionID,              
            employee.DistrictID,
            employee.BaseID
          ]);
        });

        // do 500 item splices if employee list large
        var chunks = [];
        if(values.length > 500){          
          while(values.length) {
            chunks.push(values.splice(0,500));            
          }          
        } else {
          chunks.push(values.splice(0,500));            
        }
        
        var chunkCnt = 0;
        insertEmployeeChunk(chunks[chunkCnt]);
        function insertEmployeeChunk(chunk){

          if(!chunk){                      
            getStatus();
            return;
          }

          $db.insertMany("Employee", columns, chunk, function(result){
            chunkCnt++;
            insertEmployeeChunk(chunks[chunkCnt]);
          });
        }

      }, function(err){  
        window.history.back();    
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      }); 
	  }

    // get status    
    function getStatus(){           
      // update status
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Unit Status";
      });

      // do vehicle request
      $sapRequest.request({
          method: "GET",
          requestUri: "StatusForUnitSet"
      }, 
      function(data){  

        // clear vehicles
        $db.clear("Status");

        if(data.results.length < 1){
          getUnitList();
          return;
        }

        // build vehicle rows
        var columns = [
          'Status', 
          'ShortText', 
          'Description'
        ];
        var values = [];
        angular.forEach(data.results, function(status){
          values.push([
            status.Status, 
            status.ShortText, 
            status.Description
          ]);
        });

        $db.insertMany("Status", columns, values, function(result){
          getUnitList();
        });
      }, function(err){           
        window.history.back(); 
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      }); 
    } 

    function setLastPrepDate(){
      if(localStorage.getItem("Online") === "true"){
        var today = new Date();
        today = today.toDateString();      
        localStorage.setItem("LastPreparation", today);
      } else {
        localStorage.setItem("LastPreparation", "");
      }  

      localStorage.setItem("RefreshApp", "false");    
    }

    // get unit list
    function getUnitList(){

      setLastPrepDate();
      
      $timeout(function(){
        $scope.loadingStatus = "Retrieving Unit List";
      });
      
      var userDetails = JSON.parse(localStorage.getItem("User"));  

      $sapRequest.request({
        method: "GET",
        requestUri: "UserSet('" + userDetails.username + "')?$expand=UserToUserUnit/UserUnitToUnit,UserToEmployee"
      }, 
      function(data){  

        // get logged in employee details
        var employeeInfo = data.UserToEmployee;

        if(typeof employeeInfo == "undefined" || employeeInfo === null){
          window.history.back();
          $ionicPopup.alert({
            title: 'Error',
            template: 'Employee details for user missing. Please contact your administrator.'
          });            
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
        
        // do units
        var unitList = data.UserToUserUnit.results;

        // if only one unit, auto select
        if(unitList.length < 2){
          getUnitData(data.UserToUserUnit.results[0]);
          return;
        }

        // build unit list
        for(var unitIndex = 0; unitIndex < unitList.length; unitIndex++){
          unitList[unitIndex].UnitName = unitList[unitIndex].UserUnitToUnit.UnitName;
          unitList[unitIndex].Role = unitList[unitIndex].Role;
          unitList[unitIndex].UnitType = unitList[unitIndex].UserUnitToUnit.UnitType;
          unitList[unitIndex].DirectorateName = unitList[unitIndex].UserUnitToUnit.DirectorateName;
          unitList[unitIndex].DepartmentName = unitList[unitIndex].UserUnitToUnit.DepartmentName;
          unitList[unitIndex].SectionName = unitList[unitIndex].UserUnitToUnit.SectionName;
          unitList[unitIndex].DistrictName = unitList[unitIndex].UserUnitToUnit.DistrictName;
          unitList[unitIndex].SubSectionName = unitList[unitIndex].UserUnitToUnit.SubSectionName;
          unitList[unitIndex].BaseName = unitList[unitIndex].UserUnitToUnit.BaseName;      
          unitList[unitIndex].Status = unitList[unitIndex].UserUnitToUnit.Status;      
          unitList[unitIndex].StatusName = $epic.getUnitStatusName(unitList[unitIndex].UserUnitToUnit.Status);

          unitList[unitIndex].FromDate = $epic.convertSAPDate(unitList[unitIndex].FromDate);
          unitList[unitIndex].FromTime = $epic.convertSAPTime(unitList[unitIndex].FromTime);
          unitList[unitIndex].ToDate = $epic.convertSAPDate(unitList[unitIndex].ToDate);
          unitList[unitIndex].ToTime = $epic.convertSAPTime(unitList[unitIndex].ToTime);

          //check validity
          var startDateArr = unitList[unitIndex].FromDate.split("/");
          var startTimeArr = unitList[unitIndex].FromTime.split(":");
          var endDateArr = unitList[unitIndex].ToDate.split("/");
          var endTimeArr = unitList[unitIndex].ToTime.split(":");
          var startDate = new Date(startDateArr[2], (startDateArr[1] - 1), startDateArr[0], startTimeArr[0], startTimeArr[1], 0);
          var endDate = new Date(endDateArr[2], (endDateArr[1] - 1), endDateArr[0], endTimeArr[0], endTimeArr[1], 0);

          var now = new Date();
        
          // check if validity of this unit is past
          if(Math.abs(endDate) < Math.abs(now)){
            unitList[unitIndex].validity = "past";

          // check if validity of this unit is future
          } else if(Math.abs(startDate) > Math.abs(now)){                    
            unitList[unitIndex].validity = "future";
            
            // default validity to present
          } else {
            unitList[unitIndex].validity = "present";
          }
        }

        $scope.unitList = unitList;
        $scope.selectUnit = function(unit){      
          $scope.unitModal.hide();
          getUnitData(unit);
        } 

        // init change status modal
        $ionicModal.fromTemplateUrl('selectUnit.html', {
          scope: $scope,  
          animation: 'none',
          backdropClickToClose: false,
          hardwareBackButtonClose: false
        }).then(function(modal) {
          $scope.unitModal = modal;
          modal.show();
        });                            
        
      }, function(err){
        window.history.back();     
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });
      });
    }

		// get unit data  			
  	function getUnitData(unit){

      $timeout(function(){
        $scope.loadingStatus = "Retrieving Unit Details";
      });

      var userDetails = JSON.parse(localStorage.getItem("User"));     
      userDetails.UnitID = unit.UnitID;
      userDetails.Role = unit.Role;
      localStorage.setItem("User",JSON.stringify(userDetails));

      var expandParam = "$expand=" +
      "UnitToUnitEmployee/UnitEmployeeToEmployee," +                  // get unit employees
      "UnitToUnitVehicle/UnitVehicleToVehicle," +                     // get unit vehicles
      "UnitToUnitProf"// +                                             // get unit proficiencies
      //",UnitToTaskList/TaskListToTask/TaskToTaskUnit/TaskUnitToUnit";  // get unit tasks

      $sapRequest.request({
        method: "GET",
        requestUri: "UnitSet('" + unit.UnitID + "')?" + expandParam
      }, 
      function(data){

        var unitDetails = data;
        var unitEmployeeDetails = unitDetails.UnitToUnitEmployee.results;
        var unitVehicleDetails = unitDetails.UnitToUnitVehicle.results;
        var unitProficiencies = unitDetails.UnitToUnitProf.results;
        //var unitTasks = unitDetails.UnitToTaskList.results;

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
          //$db.delete("Unit", ["UnitId"], [unitDetails.UnitID], function(){
          $db.clear("Unit", function(){
            $db.insert("Unit", columns, values, function(result){
              insertUnitEmployees(unitEmployeeDetails);
            }, function(err){
              window.history.back();                       
              $ionicPopup.alert({
                title: 'Unexpected Error',
                template: "<strong>Failed to insert Unit Employees. Please contact your Administrator</strong> - [" + err.message + "]. "
              });
            });
          })          
        }
        function insertUnitEmployees(unitEmployeeData){

          $timeout(function(){
            $scope.loadingStatus = "Retrieving Unit Employees";
          });

          // clear units old employees
          if(unitEmployeeData.length < 1){
            //$db.delete("UnitEmployee", ["UnitId"], [unitDetails.UnitID]);
            $db.clear("UnitEmployee");
            insertUnitVehicles(unitVehicleDetails);
            return;
          }

          // check if employee properly configured
          for(var empInd = 0; empInd < unitEmployeeData.length; empInd++){
            var employee = unitEmployeeData[empInd].UnitEmployeeToEmployee;
            if(employee === null){
              window.history.back();                       
              $ionicPopup.alert({
                title: 'Unit Error',
                template: "<strong>Unable to login</strong></br> Employee: " + unitEmployeeData[empInd].Partner + " is incorrectly configured for Unit: " + unitDetails.UnitID
              });
              return;
            }            

            // insert employee (just in case)
            var employeeColumns = [
              'PersalNr', 
              'EmployeeType', 
              'LastName', 
              'Partner', 
              'FirstName',
              'IDNR',   
              "DirectorateId",
              'DepartmentId', 
              'SectionId', 
              'SubsectionId', 
              'DistrictId', 
              'BaseId'
            ];
            var employeeValues = [                      
              employee.PersalNr, 
              employee.EmployeeType, 
              employee.LastName, 
              employee.Partner, 
              employee.FirstName,
              employee.IDNR,          
              employee.DirectorateID,
              employee.DepartmentID, 
              employee.SectionID,             
              employee.SubSectionID,              
              employee.DistrictID,
              employee.BaseID
            ];
            $db.insert("Employee", employeeColumns, employeeValues);
          
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
          
          //$db.delete("UnitEmployee", ["UnitId"], [unitDetails.UnitID], function(){
          $db.clear("UnitEmployee", function(){
            $db.insertMany("UnitEmployee", columns, values, function(result){
              insertUnitVehicles(unitVehicleDetails);
            });
          });
        }
        function insertUnitVehicles(unitVehicleData){

          $timeout(function(){
            $scope.loadingStatus = "Retrieving Unit Vehicles";
          });          

          if(unitVehicleData.length < 1){
            $db.delete("UnitVehicle", ["UnitId"], [unitDetails.UnitID]);
            insertProficiencies(unitProficiencies);
            return;
          }

          // check if vehicle properly configured
          for(var vehInd = 0; vehInd < unitVehicleData.length; vehInd++){
            var vehicle = unitVehicleData[vehInd].UnitVehicleToVehicle;
            if(vehicle === null){
              window.history.back();                       
              $ionicPopup.alert({
                title: 'Unit Error',
                template: "<strong>Unable to login</strong></br> Vehicle: " + parseInt(unitVehicleData[vehInd].VehicleId, 10).toString() + " is incorrectly configured for Unit: " + unitDetails.UnitID
              });
              return;
            }    

            // insert vehicle (just in case)
            var vehicleColumns = [
              'VehicleId', 
              'VehicleType', 
              'RegNum',           
              'DirectorateId',
              'DepartmentId', 
              'SectionId', 
              'SubsectionId', 
              'DistrictId', 
              'BaseId'
            ];
            var vehicleValues = [                      
              vehicle.VehicleID, 
              vehicle.VehicleType, 
              vehicle.RegNum, 
              vehicle.DirectorateID,
              vehicle.DepartmentID, 
              vehicle.SectionID, 
              vehicle.SubSectionID, 
              vehicle.DistrictID, 
              vehicle.BaseID
            ];
            $db.insert("Vehicle", vehicleColumns, vehicleValues);
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
          //$db.delete("UnitVehicle", ["UnitId"], [unitDetails.UnitID], function(){
          $db.clear("UnitVehicle", function(){
            $db.insertMany("UnitVehicle", columns, values, function(result){
              insertProficiencies(unitProficiencies);
            }, function(err){
              window.history.back();                       
              $ionicPopup.alert({
                title: 'Unexpected Error',
                template: "<strong>Failed to insert Unit Vehicles. Please contact your Administrator</strong> - [" + err.message + "]. "
              });
            });
          });
        }
        function insertProficiencies(unitProficienciesData){     

          $timeout(function(){
            $scope.loadingStatus = "Retrieving Unit Proficiencies";
          });             

          if(unitProficienciesData.length < 1){
            $db.delete("UnitProficiency", ["UnitId"], [unitDetails.UnitID]);
            sendDeviceID();
            //insertTasks(unitTasks);
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
          //$db.delete("UnitProficiency", ["UnitId"], [unitDetails.UnitID], function(){
          $db.clear("UnitProficiency", function(){
            $db.insertMany("UnitProficiency", columns, values, function(result){
              sendDeviceID();
              //insertTasks(unitTasks);
            }, function(err){
              window.history.back();                       
              $ionicPopup.alert({
                title: 'Unexpected Error',
                template: "<strong>Failed to insert Unit Proficiencies. Please contact your Administrator</strong> - [" + err.message + "]. "
              });
            });
          });          
        }

        function sendDeviceID(){

          var userDetails = JSON.parse(localStorage.getItem("User"));               

          // update status
          $timeout(function(){
            $scope.loadingStatus = "Sending Device ID";  
          });      

          // get IMEI
          $cordovaIMEI.get()
            .then(function(imei){      

              localStorage.setItem("IMEI", imei);

              // update CRM with device id
              var loginPayload = {
                "d":{
                  "UserID": JSON.parse(localStorage.getItem("User")).username,
                  "DeviceID": imei,
                  "UnitID": userDetails.UnitID
                }
              };                     

              $sapRequest.request({
                method: "POST",
                requestUri: "DeviceRegistrationSet",
                data: loginPayload
              }, 
              function(data){                
                goCheckin();
              }, function(err){
                window.history.back();                       
                $ionicPopup.alert({
                  title: 'Error',
                  template: err
                });
              });

            }, function(err){                 
              window.history.back();                            
              $ionicPopup.alert({
                title: 'Error',
                template: 'Unable to obtain Device ID. Please contact your administrator.'
              });            
            }, "Update Device ID");    

        }

        function goCheckin(){

          // set last synces time
          var currentTimestap = new Date();
          //currentTimestap = JSON.stringify(currentTimestap);              
          localStorage.setItem("LastSyncTime", currentTimestap);

          // go checkin screen
          $state.go('checkin.overview');

        }

        function insertTasks(unitTasksData){

          $timeout(function(){
            $scope.loadingStatus = "Retrieving Unit Tasks";
          });          

          if(unitTasksData.length < 1){
            // go checkin screen
            $state.go('checkin.overview');
            return;
          }

          // build unit task rows
          var columns = [
            'TaskID',
            'UnitId',
            'IncidentId',
            'Location',
            'AddLocation',
            'Address',
            'Street',
            'StreetNo',
            'Suburb',
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
            "CallerSuburb"
          ];
          var unitColumns = [
              "TaskID",
              'UnitId',
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
          
          var values = [];          
          for(var taskInd = 0; taskInd < unitTasksData.length; taskInd++){
            var task = unitTasksData[taskInd].TaskListToTask;                      
            values.push([
              task.TaskID,
              unitDetails.UnitID,
              task.IncidentID,
              task.Location,
              task.AddLocation,
              task.Address,
              task.Street,
              task.StreetNo,
              task.Suburb,
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
              task.SubsSectionID,
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
              task.CallerSuburb
            ]);

            var unitValues = [];
            for(var taskUnitInd = 0; taskUnitInd < task.TaskToTaskUnit.results.length; taskUnitInd++){
              var taskUnit = task.TaskToTaskUnit.results[taskUnitInd];                                    
              unitValues.push([
                taskUnit.TaskID,
                unitDetails.UnitID,
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

            $db.delete("UnitTaskUnit", ["UnitId"], [unitDetails.UnitID], function(){
              $db.insertMany("UnitTaskUnit", unitColumns, unitValues, function(result){ });
            });            
          }
         
          $db.delete("UnitTask", ["UnitId"], [unitDetails.UnitID], function(){
            $db.insertMany("UnitTask", columns, values, function(result){ });
          });

          // set last synces time
          var currentTimestap = new Date();
          //currentTimestap = JSON.stringify(currentTimestap);              
          localStorage.setItem("LastSyncTime", currentTimestap);

          // go checkin screen
          $state.go('checkin.overview');
        }


      }, function(err){    
        window.history.back();
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });                
      });   

    }

  });  