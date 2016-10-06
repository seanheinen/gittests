angular.module('epicmobile.controller.checkin', ['ng-mfb'])

  .controller("Checkin", function($scope, $state, $ionicPopup, $templateCache, $ionicLoading, $epic, $db, $sapRequest, $smp, $ionicModal, $smp, $timeout){  	

  	// wizard buttons show/hide - depending on state
  	$scope.$state = $state;

    $scope.unitData = {};
    $scope.userDetails = JSON.parse(localStorage.getItem("User"));

  	// populate unit overview
    getUnitDetails();
    function getUnitDetails(){
      var unitId = JSON.parse(localStorage.getItem("User")).UnitID.toString();
      var query = 'SELECT *, ' +
      'Directorate.Description AS DirectorateName, ' + 
      'Department.Description AS DepartmentName, ' + 
      'Section.Description AS SectionName ,' + 
      'District.Description AS DistrictName, ' + 
      'Subsection.Description AS SubsectionName, ' +
      'Base.Description AS BaseName ' +
      'FROM Unit ' + 
      'LEFT OUTER JOIN Directorate ON Unit.DirectorateId = Directorate.Id ' +
      'LEFT OUTER JOIN Department ON Unit.DepartmentId = Department.Id ' +
      'LEFT OUTER JOIN Section ON Unit.SectionId = Section.Id ' +
      'LEFT OUTER JOIN District ON Unit.DistrictId = District.Id ' + 
      'LEFT OUTER JOIN Subsection ON Unit.SubsectionId = Subsection.Id ' +
      'LEFT OUTER JOIN Base ON Unit.BaseId = Base.Id ' +
      'WHERE Unit.UnitId = ' + $scope.userDetails.UnitID;

      $db.read(query, function(unit){

        if(!unit) return;

        // set unit details for view
        $scope.unitData.unitId = unit.UnitId;
        $scope.unitData.unitname = unit.UnitName;
        $scope.unitData.unittype = unit.UnitType;
        $scope.unitData.description = unit.Description;
        $scope.unitData.DirectorateID = unit.DirectorateId;
        $scope.unitData.DepartmentID = unit.DepartmentId;
        $scope.unitData.SectionID = unit.SectionId
        $scope.unitData.SubSectionID = unit.SubsectionId
        $scope.unitData.DistrictID = unit.DistrictId
        $scope.unitData.BaseID = unit.BaseId

        $scope.directorate = unit.DirectorateName;
        $scope.department = unit.DepartmentName;
        $scope.section = unit.SectionName;      
        $scope.subsection = unit. SubsectionName;      
        $scope.district = unit.DistrictName;      
        $scope.base = unit.BaseName;

        // do temp base
        if(unit.TempBaseId.length > 0){
          var query = 'SELECT Description FROM Base WHERE Base.Id = ' + unit.TempBaseId;        
          $db.read(query, function(base){
            if(!base.Description) return;
            $scope.tempbase = base.Description;  
          });
        }        
      });
    }    

    // populate unit details
    // get unit employee list
    getUnitEmployees();
    function getUnitEmployees(){      
      //var query = 'SELECT DISTINCT UnitEmployee.*, ' +
      var query = 'SELECT *, ' +
      'District.Description AS DistrictName, ' + 
      'Base.Description AS BaseName, ' +
      'UnitProficiency.Description AS proficiency ' +
      'FROM UnitEmployee ' + 
      'LEFT OUTER JOIN Employee ON UnitEmployee.Partner = Employee.Partner ' +      
      'LEFT OUTER JOIN UnitProficiency ON UnitEmployee.ProfId = UnitProficiency.Id AND UnitProficiency.UnitId = ' + $scope.userDetails.UnitID + ' ' +
      'LEFT OUTER JOIN District ON Employee.DistrictId = District.Id ' +
      'LEFT OUTER JOIN Base ON Employee.BaseId = Base.Id ' +
      'WHERE UnitEmployee.UnitId = ' + $scope.userDetails.UnitID; 
      
      $db.select(query, function(employeeList){        
        $scope.unitEmployees = employeeList;        
      });
    }

    // employee photo logic
    $scope.getUnitEmployeePhoto = $epic.getUnitEmployeePhoto;

    // get unit vehicle list
    getUnitVehicles();
    function getUnitVehicles(){
      //var query = 'SELECT * FROM UnitVehicle';
      //var query = 'SELECT DISTINCT UnitVehicle.*, ' +
      var query = 'SELECT *, ' +
      'District.Description AS DistrictName, ' + 
      'Base.Description AS BaseName ' +
      'FROM UnitVehicle ' + 
      'LEFT OUTER JOIN Vehicle ON UnitVehicle.VehicleId = Vehicle.VehicleId ' +
      'LEFT OUTER JOIN District ON Vehicle.DistrictId = District.Id ' +
      'LEFT OUTER JOIN Base ON Vehicle.BaseId = Base.Id ' +
      'WHERE UnitVehicle.UnitId = ' + $scope.userDetails.UnitID; 

      $db.select(query, function(vehicleList){        
        $scope.unitVehicles = vehicleList;          
      });
    }    
    
    // populate unit proficiencies    
    getUnitProficiencies();
    function getUnitProficiencies(){
      var query = 'SELECT * FROM UnitProficiency WHERE UnitId = ' + $scope.userDetails.UnitID;
      $db.select(query, function(profList){        
        $scope.unitProficiencies = profList;
      });
    }

    // populate unit proficiency summary - the only way i could think of getting it working without a huge rework
    // i completely ignore Filled column as it serves no purpose on the front end
    buildProficiencySummary();
    function buildProficiencySummary(){
      // get all profs
      $scope.profSummary = [];
      var query = 'SELECT * FROM UnitProficiency WHERE UnitId = ' + $scope.userDetails.UnitID;
      $db.select(query, function(profList){
        $scope.profSummary = profList;

        // get all unit employees and their details
        var query = 'SELECT * FROM UnitEmployee ' +
        'LEFT OUTER JOIN Employee ON UnitEmployee.Partner = Employee.Partner ' +      
        'WHERE UnitId = ' + $scope.userDetails.UnitID;
        $db.select(query, function(employeeList){                                      
          // go through each prof and append the assigned employees to it (asynchronously)
          angular.forEach($scope.profSummary, function(prof){
            prof.employees = [];
            angular.forEach(employeeList, function(employee){
              if(prof.Id === employee.ProfId){
                prof.employees.push(employee);                  
              }
            });
          });
        });
      });
    }    
    
		/*****************************************************************
    * CHECKIN OVERVIEW METHODS - DEPRECATED
    *****************************************************************/
  	$scope.selectDepartment = function(){      
      // get department list
      var query = 'SELECT * FROM Department'
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Departments', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Department",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(item){  

            // check if same option selected
            if($scope.unitData.DepartmentID === item.Id){
              window.history.back();
              return;
            }

            $timeout(function(){
              // set view values
              $scope.department = item.Description;
              $scope.section = "(none)";
              $scope.subsection = "(none)";
              $scope.district = "(none)";
              $scope.base = "(none)";
              // update unit data
              $scope.unitData.DepartmentID = item.Id;
              $scope.unitData.SectionID = "";
              $scope.unitData.SubSectionID = "";
              $scope.unitData.DistrictID = "";
              $scope.unitData.BaseID = "";
              window.history.back();
            });
            
          }
        });
      });			  		
  	}
  	$scope.selectSection = function(){ 
      // get section list
      var query = 'SELECT * FROM Section WHERE DepartmentId = "' + $scope.unitData.DepartmentID + '"';
      $db.select(query, function(resultList){
    		if(!resultList.length){
    			$ionicLoading.show({ template: 'No Sections', noBackdrop: true, duration: 1000 });
    			return;
    		}
    		// open dropdown window
  			$state.go('dropdown', {				
  				dropdownTitle: "Section",
  				dropdownScope: resultList,
  				displayField: "Description",
  				clickAction: function(item){		

            // check if same option selected
            if($scope.unitData.SectionID === item.Id){
              window.history.back();
              return;
            }		

  					// set view values				
  					$scope.section = item.Description;
  			  	$scope.subsection = "(none)";
  			  	$scope.district = "(none)";
  			  	$scope.base = "(none)";
  					// update unit data					
  					$scope.unitData.SectionID = item.Id;
  					$scope.unitData.SubSectionID = "";
  					$scope.unitData.DistrictID = "";
  					$scope.unitData.BaseID = "";
  					window.history.back();
  				}
  			});			  		
      });   
  	}


  	$scope.selectSubSection = function(){ 
  		// get subsection list            
      var query = 'SELECT * FROM Subsection WHERE SectionId = "' + $scope.unitData.SectionID + '"';
      $db.select(query, function(resultList){  		
    		if(!resultList.length){
    			$ionicLoading.show({ template: 'No Sub Sections', noBackdrop: true, duration: 1000 });
    			return;  		
    		}
  			$state.go('dropdown', {				
  				dropdownTitle: "Sub-Section",
  				dropdownScope: resultList,
  				displayField: "Description",
  				clickAction: function(item){		
            // check if same option selected
            if($scope.unitData.SubSectionID === item.Id){
              window.history.back();
              return;
            }
          
  					// set view values				
  					$scope.subsection = item.Description;			  	
  			  	$scope.district = "(none)";
  			  	$scope.base = "(none)";
  					// update unit data														
  					$scope.unitData.SubSectionID = item.Id;
  					$scope.unitData.DistrictID = "";
  					$scope.unitData.BaseID = "";					
  					window.history.back();            
  				}
  			});			  		
      });
  	}
  	$scope.selectDistrict = function(){ 
  		// get district list  	
      var query = 'SELECT * FROM District WHERE SubsectionId = "' + $scope.unitData.SubSectionID + '"';
      $db.select(query, function(resultList){      
    		if(!resultList.length){
  				$ionicLoading.show({ template: 'No Districts', noBackdrop: true, duration: 1000 });
    			return;
    		}
  			$state.go('dropdown', {				
  				dropdownTitle: "District",
  				dropdownScope: resultList,
  				displayField: "Description",
  				clickAction: function(item){
            // check if same option selected
            if($scope.unitData.DistrictID === item.Id){
              window.history.back();
              return;
            }          										
  					// set view values									
  			  	$scope.district = item.Description;
  			  	$scope.base = "(none)";
  					// update unit data
  					$scope.unitData.DistrictID = item.Id;
  					$scope.unitData.BaseID = "";
  					window.history.back();
  				}
  			});			  		
      });
  	}
  	$scope.selectBase = function(){   		
  		// get base list
  		var query = 'SELECT * FROM Base WHERE DistrictId = "' + $scope.unitData.DistrictID + '"';
      $db.select(query, function(resultList){      
    		if(!resultList.length){
  				$ionicLoading.show({ template: 'No Bases', noBackdrop: true, duration: 1000 });
    			return;
    		}
  			$state.go('dropdown', {				
  				dropdownTitle: "Base",
  				dropdownScope: resultList,
  				displayField: "Description",
  				clickAction: function(item){
            // check if same option selected
            if($scope.unitData.BaseID === item.Id){
              window.history.back();
              return;
            }

  					// set view values												  	
  			  	$scope.base = item.Description;
  					// update unit data					
  					$scope.unitData.BaseID = item.Id;
  					window.history.back();
  				}
  			});			  		
      });
  	}

    /*****************************************************************
    * CHECKIN DETAILS METHODS
    *****************************************************************/
		// view person and vehicle detail - profile pages
		$scope.viewPerson = function(item){	 
      if(item.Partner === null){
        $ionicLoading.show({ template: 'No Employee details', noBackdrop: true, duration: 1000 });
        return;
      }

      var query = 'SELECT * FROM Employee WHERE Partner = "' + item.Partner + '"';
      $db.read(query, function(employee){        
        $state.go("person", {
          person: employee
        });
      });
		}
		$scope.viewVehicle = function(item){	 

      if(item.VehicleId === null){
        $ionicLoading.show({ template: 'No Vehicle details', noBackdrop: true, duration: 1000 });
        return;
      }

      var query = 'SELECT * FROM Vehicle WHERE VehicleId = "' + item.VehicleId + '"';
      $db.read(query, function(vehicle){
        $state.go("vehicle", {
          vehicle: vehicle
        });
      });			
		}

    // edit employee proficiency
    $scope.changeProficiency = function(person){
      // get proficiency list      
      if(!$scope.unitProficiencies.length){
        $ionicLoading.show({ template: 'No Unit Proficiencies', noBackdrop: true, duration: 1000 });
        return;
      }

      // open dropdown window
      $state.go('dropdown', {       
        dropdownTitle: "Select a Proficiency",
        dropdownScope: $scope.unitProficiencies,
        displayField: "Description",
        clickAction: function(proficiency){            
          // check if same option selected
          if(person.ProfId === proficiency.Id){
            window.history.back();
            return;
          }          
          $scope.setProficiency(person, proficiency);
          //window.history.back();
        }
      });  
    }    
    $scope.setProficiency = function(person, proficiency){
     
      // build payload
      var newEmployeeData = {
        "d" : {
          "UnitID" : $scope.unitData.unitId,
          "Partner" : person.Partner,
          "PartnerFct" : proficiency.Id,
          "Action" : "UPDATE"
        }
      };

      // POST employee to group              
      $sapRequest.request({
        method: "POST",
        requestUri: "UnitEmployeeSet",
        data: newEmployeeData
      }, 
      function(data){          
        $ionicLoading.show({ 
          template: "Employee changed",
          duration: 2000
        });

        // update unit proficiency db
        var columns = [ 'ProfId' ];
        var values = [ proficiency.Id ];            
        $db.update("UnitEmployee", ["UnitId", "Partner"], [$scope.unitData.unitId, person.Partner], columns, values);

        $timeout(function(){
          window.history.back();  
        }, 2000)
                
      }, function(err){        
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });
      }, "Update Employee");

    }

		// search employee/vehicle pages and add
		$scope.searchEmployee = function(){       
      var query = 'SELECT * FROM Employee';
      $db.select(query, function(resultList){        
  			$state.go('search', {				
  				searchTitle: "Find Employee",
  				searchScope: "Employee",
  				searchKeys: ["FirstName", "LastName"],
          searchOrder: ["LastName", "FirstName"],
  				resultTemplate: "personListItem.html",
  				clickAction: function(employee){
            // check for duplicate
            $db.read('SELECT * FROM UnitEmployee WHERE Partner = "' + employee.Partner + '" AND UnitId = ' + $scope.userDetails.UnitID, function(res){
              if(res){
                $ionicLoading.show({ template: 'Employee already in Unit' , duration: 2000});
                return;
              }
              window.history.back();            
              $timeout(function(){
                chooseProficiency(employee);  
              }, 1000);                
            }); 
          }
  			});			
      });
		}    

    function chooseProficiency(person){

      // get proficiency list      
      if(!$scope.unitProficiencies.length){
        $ionicLoading.show({ template: 'No Unit Proficiencies', noBackdrop: true, duration: 1000 });
        return;
      }

      // open dropdown window
      $state.go('dropdown', {       
        dropdownTitle: "Select a Proficiency",
        dropdownScope: $scope.unitProficiencies,
        displayField: "Description",
        clickAction: function(proficiency){                           
          createEmployee(person, proficiency);          
        }
      });  
    }
    function createEmployee(person, proficiency){
     
      // build payload
      var newEmployeeData = {
        "d" : {
          "UnitID" : $scope.unitData.unitId,
          "Partner" : person.Partner,
          "PartnerFct" : proficiency.Id,
          "Action" : "UPDATE"
        }
      };

      // POST employee to group              
      $sapRequest.request({
        method: "POST",
        requestUri: "UnitEmployeeSet",
        data: newEmployeeData
      }, 
      function(data){          

        // update unit db
        var columns = [ 
          "UnitId", 
          "Partner",
          'ProfId' 
        ];
        var values = [ 
          $scope.unitData.unitId, 
          person.Partner,
          proficiency.Id 
        ];            
        $db.insert("UnitEmployee", columns, values);        

        $ionicLoading.show({ 
          template: "Employee added",
          duration: 2000
        });
        
        $timeout(function(){
          $state.go("checkin.detail");
        }, 2000)
        
      }, function(err){        
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });
      }, "Add Employee");
    }

		$scope.searchVehicle = function(){ 
      var query = 'SELECT * FROM Vehicle';
      $db.select(query, function(resultList){
  			$state.go('search', {				
  				searchTitle: "Find Vehicle",
  				searchScope: "Vehicle",				
  				searchKeys: ["VehicleType", "RegNum"],
          searchOrder: ["VehicleType", "RegNum"],
  				resultTemplate: "vehicleListItem.html",
  				clickAction: function(vehicle){										
            // check for duplicate
            $db.read('SELECT * FROM UnitVehicle WHERE VehicleId = "' + vehicle.VehicleId + '" AND UnitId = ' + $scope.userDetails.UnitID, function(res){
              if(res) {
                $ionicLoading.show({ template: 'Vehicle already in Unit' , duration: 2000});
                return;
              }                            

              // build payload
              var newVehicleData = {
                "d" : {
                  "UnitID" : $scope.unitData.unitId,
                  "VehicleID" : vehicle.VehicleId,
                  "Action" : "UPDATE"
                }
              };

              // POST employee to group              
              $sapRequest.request({
                method: "POST",
                requestUri: "UnitVehicleSet",
                data: newVehicleData
              }, 
              function(data){
                // insert vehicle
                var columns = [
                  'UnitId', 
                  'VehicleId'             
                ];
                var values = [
                  $scope.unitData.unitId, 
                  vehicle.VehicleId            
                ];
                $db.insert('UnitVehicle', columns, values);
                                  
                $ionicLoading.show({ 
                  template: "Vehicle added",
                  duration: 2000
                });

                $state.go("checkin.detail");

              }, function(err){
                $ionicPopup.alert({
                  title: 'Error',
                  template: err
                });
              }, "Add Vehicle");

            });             
  				}
  			});
      });
		}
		// remove/delete employee/vehicle
    $scope.removeEmployee = function(index, employee){ 
      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to remove this employee?'          
      }).then(function(res) {
        if (res) {

          // do sap request
          // build payload
          var remEmployeeData = {
            "d" : {
              "UnitID" : JSON.parse(localStorage.getItem("User")).UnitID.toString(),
              "Partner" : employee.Partner.toString(),                    
              "Action" : "DELETE"
            }
          };            

          // POST employee to group              
          $sapRequest.request({
            method: "POST",
            requestUri: "UnitEmployeeSet",
            data: remEmployeeData
          }, 
          function(data){

            $scope.unitEmployees.splice(index, 1);

            // delete db row            
            $db.delete("UnitEmployee", ["Partner"], [employee.Partner]);

            $ionicLoading.show({ 
              template: "Employee removed",
              duration: 2000
            });
            buildProficiencySummary();
          }, function(err){
            $ionicPopup.alert({
              title: 'Error',
              template: err
            });
          }, "Remove Employee");          
        }
      });
    }
		$scope.removeVehicle = function(index, vehicle){ 
      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to remove this vehicle?'          
      }).then(function(res) {
        if (res) {

          // build payload
          var remVehicleData = {
            "d" : {
              "UnitID" : JSON.parse(localStorage.getItem("User")).UnitID.toString(),
              "VehicleID" : vehicle.VehicleId.toString(),                    
              "Action" : "DELETE"
            }
          };

          // POST employee to group              
          $sapRequest.request({
            method: "POST",
            requestUri: "UnitVehicleSet",
            data: remVehicleData
          }, 
          function(data){

            $scope.unitVehicles.splice(index, 1);
            
            // delete db row
            $db.delete("UnitVehicle", ["VehicleId"], [vehicle.VehicleId]);

            $ionicLoading.show({ 
              template: "Vehicle removed",
              duration: 2000
            });
          }, function(err){
            $ionicPopup.alert({
              title: 'Error',
              template: err
            });
          }, "Remove Vehicle");
        }
      });			
		}
		


    /*****************************************************************
    * FOOTER BUTTONS
    *****************************************************************/    
		// checkin wizard - go through tabs
		$scope.Next = function(){	 
			var currState = $state.current.name;
			if(currState === "checkin.overview"){
				$state.go('checkin.detail');
			}
			if(currState === "checkin.detail"){
				$state.go('checkin.proficiencies');			
			}
		}
		$scope.Back = function(){ 
			var currState = $state.current.name;
			if(currState === "checkin.detail"){
				$state.go('checkin.overview');			
			}
			if(currState === "checkin.proficiencies"){
				$state.go('checkin.detail');			
			}
		}
		// submit checkin 
		$scope.Submit = function(form){ 			      
      $state.go('status');               
		}		

		// logout
		$scope.Logout = function(form){ 
			$ionicPopup.confirm({
	      title: 'Confirmation',
	      template: 'Are you sure you would like to log off?'          
	    }).then(function(res) {
	      if (res) {

          $scope.checkinState = $state;

	      	// do logout stuff - clear cookeies
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


    /*****************************************************************
    * UI STUFF
    *****************************************************************/
    $scope.getProfClass= function(proficiency){            
      if(typeof proficiency.employees === "undefined"){
        return "";
      }

      if(proficiency.employees.length > 0){
        return "prof-divider-filled";
      } else {
        return "prof-divider-not-filled";
      }
    }

    $scope.checkRole = $epic.checkRole;

	})

  // user to search for employee or vehicle
  .controller("Search", function($scope, $stateParams, $ionicLoading, $epic, $db){
  
    // set search scope
    $scope.search = {};
    $scope.search.searchInput = "";    
    $scope.searchTitle = $stateParams.searchTitle;
    $scope.searchKeys = $stateParams.searchKeys;        
    $scope.searchOrder = $stateParams.searchOrder;    
    $scope.searchScope = $stateParams.searchScope;  
    $scope.resultTemplate = $stateParams.resultTemplate;
    $scope.searchResults = [];

    // click result action
    $scope.searchClick = $stateParams.clickAction;

    // employee photo logic
    $scope.getUnitEmployeePhoto = $epic.getUnitEmployeePhoto;

    $scope.selectResults = function(){

      if($scope.search.searchInput.length < 1){
        $scope.searchResults = [];
        return;
      }      

      // filter only department employesss or vehicles
      var departmentID = JSON.parse(localStorage.getItem("User")).DepartmentID;

      var query = 'SELECT *, District.Description AS DistrictName, Base.Description AS BaseName FROM ' + $scope.searchScope + 
      ' INNER JOIN District ON ' + $scope.searchScope + '.DistrictId = District.Id' + 
      ' INNER JOIN Base ON ' + $scope.searchScope + '.BaseId = Base.Id' +      
      ' WHERE ' + $scope.searchScope + '.DepartmentId = "' + departmentID + '" AND (';

      // add compare columns
      for(var keyInd = 0; keyInd < $scope.searchKeys.length; keyInd++){
        query += $scope.searchKeys[keyInd] + ' LIKE "%' + $scope.search.searchInput + '%" OR ';
      }
      // remove last OR
      query = query.slice(0, -4);

      // add oder bys
      query += ') ORDER BY '
      for(var keyInd = 0; keyInd < $scope.searchOrder.length; keyInd++){
        query += $scope.searchOrder[keyInd] + ', ';
      }
      // remove last comma
      query = query.slice(0, -2);
      query += " LIMIT 30";

      $db.select(query, function(results){
        $scope.searchResults = results;
      });
    }
    
  });