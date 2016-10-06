angular.module('epicmobile.controller.status', [])
  
  .config(function($ionicConfigProvider) {  
    // put tabs at the bottom
    $ionicConfigProvider.tabs.position('bottom');
  })

  // this filters the task status departmentally
  .filter('unitStatusFilter', function () {
    return function (statuses, departmentShort, currentStatus) {
      departmentShort = "FR"
      var filtered = [];
      for (var i = 0; i < statuses.length; i++) {
        var status = statuses[i];
        if ( (departmentShort == status.departmentShort || status.departmentShort === "" ) && status.id !== currentStatus ) {
          filtered.push(status);
        }
      }
      return filtered;
    };
  })
  
  .controller("Status", function($scope, $state, $ionicPopup, $ionicModal, $timeout, $epic, $db, $sapRequest, $ionicLoading){

    var unitID = JSON.parse(localStorage.getItem("User")).UnitID;

    function refreshUnitStatus(){  
      $scope.unit = {};
      $scope.unit.StatusDescription = "Retrieving Status";

      // get unit status    
      $sapRequest.request({
        method: "GET",
        requestUri: "UnitSet('" + unitID + "')"
      }, 
      function(unitData){  
        var columns = [
          'UnitName', 
          'Description', 
          'UnitType', 
          'Status'          
        ];
        var values = [          
          unitData.UnitName, 
          unitData.Description, 
          unitData.UnitType, 
          unitData.Status          
        ];
        // delete then insert
        $db.update("Unit", ["UnitId"], [unitID], columns, values, function(){
          getStatusFromDB();
        }, function(){
          getStatusFromDB();
        });
      }, function(err){
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });
        getStatusFromDB()
      });
    }

    function getStatusFromDB(){
      // get current unit info
      $scope.unit = {};
      var query = 'SELECT * FROM Unit WHERE Unit.UnitId = ' + unitID;

      query = 'SELECT *, ' +      
      'Base.Description AS BaseName, ' +     
      'Department.Short AS DepartmentShort ' +     
      'FROM Unit '+    
      'LEFT OUTER JOIN Base ON Unit.BaseId = Base.Id ' +            
      'LEFT OUTER JOIN Department ON Unit.DepartmentId = Department.Id ' +            
      'WHERE Unit.UnitId = ' + JSON.parse(localStorage.getItem("User")).UnitID;

      $db.read(query, function(unit){
        $scope.unit = unit;

        // set status description
        $scope.unit.StatusDescription = getStatusName(unit.Status);      
      });
    }    

    // do refresh
    $scope.refreshList = false;
    $scope.refreshAlerts = function(loader){
      // refresh unit status
      refreshUnitStatus();

      $scope.refreshList = true;

      // do sap request for more alerts      
      $sapRequest.request({
        method: "GET",
        requestUri: "AlertSet",
      }, 
      function(data){  
        $db.clear("Alerts");
        var alerts = data.results;

        if(alerts.length < 1){
          $scope.refreshList = false;
          return;
        }
      
        var alertColumns = [          
          "AlertMessage",
          "GeoX",
          "GeoY",            
          "Date",
          "Time",
          "Priority",
          "Location"          
        ];            
          
        var alertValues = [];          
        for(var alertInd = 0; alertInd < data.results.length; alertInd++){
          var alert = alerts[alertInd];                      
          alertValues.push([
            alert.AlertMessage,
            alert.GeoX,
            alert.GeoY,
            alert.Date,
            alert.Time,
            alert.Priority,
            alert.Location
          ]);
        }
        // if one alert            
        if(alertValues.length == 1){
          $db.insert("Alerts", alertColumns, alertValues[0], function(result){
            getAlertsFromDB();
          });        
        } else{
        // if many alerts
          $db.insertMany("Alerts", alertColumns, alertValues, function(result){ 
            getAlertsFromDB();
          });
        }
      },function(err){          
        $ionicPopup.alert({
          title: 'Error',
          template: err
        });
        getAlertsFromDB();
      });

      function getAlertsFromDB(){
        // set current scope tasks from DB            
        $scope.taskUnits = {};
        var query = 'SELECT * FROM Alerts';
        $db.select(query, function(alerts){        
          $scope.alerts = alerts;

          // format alerts
          for(var i=0; i < $scope.alerts.length; i++){
            $scope.alerts[i].CategoryIcon = getAlertCategoryIcon($scope.alerts[i].Category);
            $scope.alerts[i].Timestamp = $epic.getTimestamp($epic.convertSAPDate($scope.alerts[i].Date), $epic.convertSAPTime($scope.alerts[i].Time));          
          }         
        
          // remove refresh icon        
          $timeout(function(){
            $scope.refreshList = false;        
          });         
        });      
      } 

      /*******************************************************************************
       * Alert list - cateogry icon
      ******************************************************************************/
      function getAlertCategoryIcon(category){        
        var categoryIcon = "";
        switch(category){
          case "YSRF":
            categoryIcon = "img/request-icon-fire.svg";
            break;
          case "Policing - Alarm":
            categoryIcon = "img/request-icon-traffic.svg";
            break;
          case "Hazmat - Gas":
            categoryIcon = "img/request-icon-mp.svg";
            break;                    
          case "By Law - Animal":
            categoryIcon = "img/request-icon-le.svg";
            break;
          default:
            categoryIcon = "img/request-icon-drm.svg";
            break;            
        }
        return categoryIcon;      
      }   

    }
    $scope.getPriorityClass = $epic.getPriorityClass;

    // get alerts first time load
    $scope.refreshAlerts();


    // define status change modal
    $ionicModal.fromTemplateUrl('changeStatus.html', {
      scope: $scope,
      animation: 'none'
    }).then(function(modal) {
      $scope.StatusModal = modal;
    });
    $scope.ChangeStatus = function(){
      $scope.StatusModal.show();
    }
    $scope.setStatus = function(status, statusDescription){

      var userDetails = JSON.parse(localStorage.getItem("User"));
      var unitID = userDetails.UnitID;

      // delay for modal to hide
      $scope.StatusModal.hide();
      $timeout(function(){

        var pushData = {
          UnitID: unitID.toString(),
          Status: status.toString()
        };

        // push to SAP
        $sapRequest.request({
          method: "PUT",
          requestUri: "UnitStatusSet('" + unitID + "')",
          data: pushData
        }, 
        function(data){  

          // write to sql $db
          var cols = [ "Status" ];
          var vals = [ status ];
          $db.update("Unit", ["UnitId"], [unitID], cols, vals);


          $ionicLoading.show({ 
            template: "Unit Status changed",
            duration: 2000
          });

          // set UI
          $scope.unit.Status = status;
          $scope.unit.StatusDescription = statusDescription;

          // delay for success message
          $timeout(function(){
            // if inactive
            if(status === "E0001"){            
              return;
            }
            
            // check if department is fire, then if at base allow base select
            if(status === "E0003"){              
              selectBase();              
            } else {
              $state.go('tasklist');
            } 
          }, 2000);         
        },function(err){          
          $ionicPopup.alert({
            title: 'Error',
            template: err
          });
        }, "Unit Status update"); 
      }, 300);
    }

    function selectBase(){

      var currentBase = $scope.unit.BaseName;

      $ionicPopup.show({
        title: 'Confirmation',
        template: 'Have you arrived at your Home Base: ' + currentBase + ' ?',
        buttons: [
          {
            text: 'No',            
            onTap: function(e) {            
              return false;
            }
          },
          {
            text: 'Yes',
            type: 'button-positive',
            onTap: function(e) {            
              return true;
            }
          }
        ]
      }).then(function(res) {
        if (!res) {
          $state.go("tempbase")          
        }
      });
    }
      
    // build system unit statuses
    $scope.unitSystemStatus = [
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
        name: "Mobile Incident",
        description: "Indicates that you are available and at base.",
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


    function getStatusName(statusId){
      var statusName = "";
      angular.forEach($scope.unitSystemStatus, function(status){
        if(statusId === status.id){
          statusName = status.name
          return false;
        }
      });
      return statusName;
    }


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

    $scope.checkRole = $epic.checkRole;

  });  