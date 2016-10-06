angular.module('epicmobile.controller.resolution', [])
  
  .controller("Resolution", function($rootScope, $scope, $state, $ionicPopup, $db, $sapRequest, $epic, $timeout, $ionicLoading){  

    /*
    $scope.resolution = {};
    
    // use active task
    var taskId = JSON.parse(localStorage.getItem("ActiveTask")).TaskID;

    loadTaskDetails();
    function loadTaskDetails(){
      $scope.resolution = JSON.parse(localStorage.getItem("ActiveTask"));
    }

    function loadResolutionDetails(resolution){
      $scope.resolution = resolution;
    }
    */

    // init
    var resolution = localStorage.getItem("Resolution");

    // use active task
    if(resolution === "" || resolution === null || typeof resolution === "undefined"){
      resolution = JSON.parse(localStorage.getItem("ActiveTask"));
      localStorage.setItem("Resolution", JSON.stringify(resolution));
    } else {
      resolution = JSON.parse(resolution);
    }

    $scope.resolution = resolution;

    /*****************************************************************
    * CASCADING CATEGORY SELECT METHODS
    *****************************************************************/
    $scope.selectCategoryA = function(){
    
      // get category A list
      var query = 'SELECT * FROM CategoryA'
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Category A items', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Category A",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(item){  

            // check if same option selected
            if($scope.resolution.Category1 === item.Id){
              window.history.back();
              return;
            }

            $timeout(function(){
              // set view values
              $scope.resolution.CategoryLab1 = item.Description;
              $scope.resolution.CategoryLab2 = "(none)";
              $scope.resolution.CategoryLab3 = "(none)";
              $scope.resolution.CategoryLab4 = "(none)";              
              // update unit data
              $scope.resolution.Category1 = item.Id;
              $scope.resolution.Category2 = "";
              $scope.resolution.Category3 = "";
              $scope.resolution.Category4 = "";

              localStorage.setItem("Resolution", JSON.stringify($scope.resolution));
              
              window.history.back();
            });
            
          }
        });
      });           
    }


    $scope.selectCategoryB = function(){
      
      // get category B list      
      var query = 'SELECT * FROM CategoryB WHERE CategoryAId = "' + $scope.resolution.Category1 + '"';
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Category B items', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Category B",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(item){  

            // check if same option selected
            if($scope.resolution.Category2 === item.Id){
              window.history.back();
              return;
            }

            $timeout(function(){
              // set view values
              $scope.resolution.CategoryLab2 = item.Description;              
              $scope.resolution.CategoryLab3 = "(none)";
              $scope.resolution.CategoryLab4 = "(none)";   

              // update unit data
              $scope.resolution.Category2 = item.Id;              
              $scope.resolution.Category3 = "";
              $scope.resolution.Category4 = "";

              localStorage.setItem("Resolution", JSON.stringify($scope.resolution));
              
              window.history.back();
            });
            
          }
        });
      });           

    }
    $scope.selectCategoryC = function(category){
      
      // get category B list      
      var query = 'SELECT * FROM CategoryC WHERE CategoryBId = "' + $scope.resolution.Category2 + '"';
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Category C items', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Category C",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(item){  

            // check if same option selected
            if($scope.resolution.Category3 === item.Id){
              window.history.back();
              return;
            }

            $timeout(function(){
              // set view values
              $scope.resolution.CategoryLab3 = item.Description;                            
              $scope.resolution.CategoryLab4 = "(none)";   

              // update unit data
              $scope.resolution.Category3 = item.Id;                            
              $scope.resolution.Category4 = "";

              localStorage.setItem("Resolution", JSON.stringify($scope.resolution));
              
              window.history.back();
            });
            
          }
        });
      });           

    }
    $scope.selectCategoryD = function(category){
      // get category B list      
      var query = 'SELECT * FROM CategoryD WHERE CategoryCId = "' + $scope.resolution.Category3 + '"';
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Category C items', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Category C",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(item){  

            // check if same option selected
            if($scope.resolution.Category4 === item.Id){
              window.history.back();
              return;
            }

            $timeout(function(){
              // set view values
              $scope.resolution.CategoryLab4 = item.Description;                              

              // update unit data
              $scope.resolution.Category4 = item.Id;                       

              localStorage.setItem("Resolution", JSON.stringify($scope.resolution));     
              
              window.history.back();
            });
            
          }
        });
      });               

    }            


    $scope.selectResolutionCode = function(){

      // get category A list
      var query = 'SELECT * FROM ResolutionCode'
      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Resolution Codes', noBackdrop: true, duration: 1000 });
          return;
        }
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Resolution",
          dropdownScope: resultList,
          displayField: "Description",
          clickAction: function(item){  

            // check if same option selected
            if($scope.resolution.ResolutionCode === item.Id){
              window.history.back();
              return;
            }

            $timeout(function(){
              // set view values
              $scope.resolution.ResolutionDescription = item.Description;
              
              // update unit data
              $scope.resolution.ResolutionCode = item.Id;              

              localStorage.setItem("Resolution", JSON.stringify($scope.resolution));
              
              window.history.back();
            });
            
          }
        });
      });        

    }

    $scope.selectResponsible = function(){

      //sap/opu/odata/sap/Z_MOBILE_EPIC_SRV/UnitSet('0005000032')?$expand=UnitToUnitEmployee/UnitEmployeeToEmployee&$format=json

      // get category A list
      var query = 'SELECT *,' +
      'District.Description AS DistrictName, ' + 
      'Base.Description AS BaseName ' +
      'FROM IncidentEmployee ' +
      'INNER JOIN Employee ON IncidentEmployee.Partner = Employee.Partner ' +
      'INNER JOIN District ON Employee.DistrictId = District.Id ' +
      'INNER JOIN Base ON Employee.BaseId = Base.Id ' +
      'WHERE IncidentEmployee.IncidentId = "' + $scope.resolution.IncidentId + '"';

      $db.select(query, function(resultList){
        if(!resultList.length){
          $ionicLoading.show({ template: 'No Employees to select from', noBackdrop: true, duration: 1000 });
          return;
        }

        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Allocate Employee",
          dropdownScope: resultList,
          displayField: "LastName",
          resultTemplate: "personListItem.html",
          clickAction: function(item){  


            $scope.resolution.allocatedEmployee = item.Partner;
            $scope.resolution.allocatedEmployeeDisplay = item.LastName + ', ' + item.FirstName;

            localStorage.setItem("Resolution", JSON.stringify($scope.resolution));

            window.history.back();
          }
        });
      });        
      
    }

    $scope.submit = function(){

      // do resolution validation - ensure all fields are captures
      if($scope.resolution.Category1 === "" || 
        $scope.resolution.Category2 === "" || 
        $scope.resolution.Category3 === "" || 
        $scope.resolution.Category4 === "" ||
        typeof $scope.resolution.ResolutionCode == "undefined" || 
        typeof $scope.resolution.allocatedEmployee === "undefined") {

        $ionicPopup.alert({
          title: 'Error',
          template: "Please ensure all resoution fields are captured."
        });
        return;
      }

      
      $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to submit this resolution? The Task will be completed.'
        }).then(function(res) {
          if (res) {

            var closureData = {
              "d" : {
                "TaskID" : $scope.resolution.TaskID,
                "Comments" : $scope.resolution.ResolutionComments,
                "ResolutionCode" : $scope.resolution.ResolutionCode,
                "PartnerNo" : $scope.resolution.allocatedEmployee,
                "Category1" : $scope.resolution.Category1,
                "Category2" : $scope.resolution.Category2,
                "Category3" : $scope.resolution.Category3,
                "Category4" : $scope.resolution.Category4
              }
            }

            // POST task update            
            $sapRequest.request({
              method: "POST",
              requestUri: "ClosureCodeSet",
              data: closureData
            }, 
            function(data){

              // clear resolution
              localStorage.setItem("Resolution", "");
              
              $ionicLoading.show({ 
                template: "Resolution sent",
                duration: 2000
              });

              // before task list they should select unit status
              $timeout(function(){
                $state.go("status");                  
              }, 2000)
            
            }, function(err){
              $ionicPopup.alert({
                title: 'Error',
                template: err
              });
            }, "Sending Resolution");          
          }
        });
    }

    $scope.exitResolution = function(){
      $ionicPopup.confirm({
          title: 'Confirmation',
          template: 'Are you sure you would like to go back to this task?'
        }).then(function(res) {
          if (res) {
            window.history.back();
          }
        });
    }

  });