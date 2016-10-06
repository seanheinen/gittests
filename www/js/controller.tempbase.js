angular.module('epicmobile.controller.tempbase', [])
  
  .controller("TempBase", function($scope, $state, $ionicPopup, $db, $sapRequest, $epic, $timeout, $ionicLoading){  

    // init
    $scope.tempBase = {};

    var unitId = JSON.parse(localStorage.getItem("User")).UnitID.toString()

    //$scope.$on('$ionicView.enter', function() {      
    loadDesignatedBase();
    //})
    function loadDesignatedBase(){

      // set designated base
      var query = 'SELECT *, ' +
      'Base.Description AS BaseName, ' +
      'Directorate.Description AS DirectorateName, ' +
      'Department.Description AS DepartmentName, ' +
      'Department.Short AS DepartmentShort, ' +
      'Section.Description AS SectionName, ' +        
      'District.Description AS DistrictName, ' +
      'Subsection.Description AS SubsectionName ' +
      'FROM Unit '+ 
      'LEFT OUTER JOIN Directorate ON Unit.TempDirectorateId = Directorate.Id ' +
      'LEFT OUTER JOIN Department ON Unit.TempDepartmentId = Department.Id ' +
      'LEFT OUTER JOIN Section ON Unit.TempSectionId = Section.Id ' +
      'LEFT OUTER JOIN District ON Unit.TempDistrictId = District.Id ' + 
      'LEFT OUTER JOIN Subsection ON Unit.TempSubsectionId = Subsection.Id ' +      
      'LEFT OUTER JOIN Base ON Unit.TempBaseId = Base.Id ' +
      'WHERE Unit.UnitId = ' + unitId;

      $db.read(query, function(unit){

        if(unit.BaseName === null){
          //populate assigned org struct
          // set designated base
          var query = 'SELECT *, ' +
          'Base.Description AS BaseName, ' +
          'Directorate.Description AS DirectorateName, ' +
          'Department.Description AS DepartmentName, ' +
          'Department.Short AS DepartmentShort, ' +
          'Section.Description AS SectionName, ' +        
          'District.Description AS DistrictName, ' +
          'Subsection.Description AS SubsectionName ' +
          'FROM Unit '+ 
          'LEFT OUTER JOIN Directorate ON Unit.DirectorateId = Directorate.Id ' +
          'LEFT OUTER JOIN Department ON Unit.DepartmentId = Department.Id ' +
          'LEFT OUTER JOIN Section ON Unit.SectionId = Section.Id ' +
          'LEFT OUTER JOIN District ON Unit.DistrictId = District.Id ' + 
          'LEFT OUTER JOIN Subsection ON Unit.SubsectionId = Subsection.Id ' +      
          'LEFT OUTER JOIN Base ON Unit.BaseId = Base.Id ' +
          'WHERE Unit.UnitId = ' + unitId;

          $db.read(query, function(unit){
            if(!unit) return;

            // set unit details for view    
            $scope.tempBase.DirectorateId = unit.DirectorateId;
            $scope.tempBase.DepartmentId = unit.DepartmentId;
            $scope.tempBase.SectionId = unit.SectionId
            $scope.tempBase.SubsectionId = unit.SubsectionId
            $scope.tempBase.DistrictId = unit.DistrictId
            $scope.tempBase.BaseId = unit.BaseId
            $scope.tempBase.DirectorateName = unit.DirectorateName;
            $scope.tempBase.DepartmentName = unit.DepartmentName;
            $scope.tempBase.SectionName = unit.SectionName;      
            $scope.tempBase.SubsectionName = unit. SubsectionName;      
            $scope.tempBase.DistrictName = unit.DistrictName;      
            $scope.tempBase.BaseName = unit.BaseName;
          });
          return;
        } 

        // set temp unit details for view
        $scope.tempBase.DirectorateId = unit.TempDirectorateId;
        $scope.tempBase.DepartmentId = unit.TempDepartmentId;
        $scope.tempBase.SectionId = unit.TempSectionId
        $scope.tempBase.SubsectionId = unit.TempSubsectionId
        $scope.tempBase.DistrictId = unit.TempDistrictId
        $scope.tempBase.BaseId = unit.TempBaseId
        $scope.tempBase.DirectorateName = unit.DirectorateName;
        $scope.tempBase.DepartmentName = unit.DepartmentName;
        $scope.tempBase.SectionName = unit.SectionName;      
        $scope.tempBase.SubsectionName = unit. SubsectionName;      
        $scope.tempBase.DistrictName = unit.DistrictName;      
        $scope.tempBase.BaseName = unit.BaseName;
      });
    }

    $scope.selectBase = function(){
      var query = 'SELECT Base.*, ' +
      'Base.Id AS BaseId, ' +
      'Base.Description AS BaseName, ' +
      'Directorate.Description AS DirectorateName, ' +
      'Department.Description AS DepartmentName, ' +
      'Department.Short AS DepartmentShort, ' +
      'Section.Description AS SectionName, ' +        
      'District.Description AS DistrictName, ' +
      'Subsection.Description AS SubsectionName ' +
      'FROM Base ' +
      'LEFT OUTER JOIN Directorate ON Base.DirectorateId = Directorate.Id ' +
      'LEFT OUTER JOIN Department ON Base.DepartmentId = Department.Id ' +
      'LEFT OUTER JOIN Section ON Base.SectionId = Section.Id ' +
      'LEFT OUTER JOIN District ON Base.DistrictId = District.Id ' + 
      'LEFT OUTER JOIN Subsection ON Base.SubsectionId = Subsection.Id ' +
      'WHERE DepartmentShort = "FR"';

      $db.select(query, function(resultList){
        // open dropdown window
        $state.go('dropdown', {       
          dropdownTitle: "Select Base",
          dropdownScope: resultList,
          displayField: "Description",
          resultTemplate: "baseListItem.html",
          clickAction: function(base){            
            // update unit
            var columns = [
              "TempDirectorateId",
              "TempDepartmentId",
              "TempSectionId ",
              "TempSubsectionId",
              "TempDistrictId",
              "TempBaseId"  
            ];
            var values = [          
              base.DirectorateId,
              base.DepartmentId,
              base.SectionId,              
              base.SubsectionId,
              base.DistrictId,
              base.BaseId
            ];
            // delete then insert
            $db.update("Unit", ["UnitId"], [unitId], columns, values, function(){
              window.history.back();              
            });            
          }
        });        
      });           
    }

    $scope.submit = function(base){  

      //validation
      if($scope.tempBase.BaseId === null || 
        typeof $scope.tempBase.fromDate === "undefined" ||
        typeof $scope.tempBase.fromTime === "undefined" || 
        typeof $scope.tempBase.toDate === "undefined" || 
        typeof $scope.tempBase.toTime === "undefined"){

        $ionicPopup.alert({
          title: 'Error',
          template: "Please ensure all temporary base fields are captured."
        });
        return;
      }

      // pack data
      var pushData = {
        "d" : {
          "UnitID" : unitId,
          "DirectorateID" : $scope.tempBase.DirectorateId,
          "DepartmentID" : $scope.tempBase.DepartmentId,
          "SectionID" : $scope.tempBase.SectionId,
          "SubSectionID" : $scope.tempBase.SubsectionId,
          "DistrictID" : $scope.tempBase.DistrictId,
          "BaseID" : $scope.tempBase.BaseId,
          "DateFrom" : $epic.convertToSAPDate($scope.tempBase.fromDate),
          "TimeFrom" : $epic.convertToSAPTime($scope.tempBase.fromTime),
          "DateTo" : $epic.convertToSAPDate($scope.tempBase.toDate),
          "TimeTo" : $epic.convertToSAPTime($scope.tempBase.toTime),
          "Reason" : $scope.tempBase.reason
        }
      };

      // push to SAP
      $sapRequest.request({
        method: "POST",
        requestUri: "TempBaseSet",
        data: pushData
      }, 
      function(data){  
        $ionicLoading.show({ 
          template: "Base updated",
          duration: 2000
        });
        $timeout(function(){                            
          $state.go('status');
        }, 2000);
      },function(err){          
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });        
      }, "Base update"); 

    }

  });