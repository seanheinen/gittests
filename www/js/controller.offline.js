angular.module('epicmobile.controller.offline', [])
  
  .controller("Offline", function($scope, $state, $ionicLoading, $timeout, $ionicPopup, $db, $sapRequest, $epic){  
    
    // init
    $scope.transactions = [];    
    $scope.refreshList = false;        
    $scope.stopFlag = false;

    // get all unsent transactions
    var query = 'SELECT * FROM Offline';
    $db.select(query, function(transactions){

      if(transactions == null) return;
      if(transactions.length < 1) return;      

      angular.forEach(transactions, function(trans){
        trans.TimeStamp = $epic.getTimestamp(trans.Date, trans.Time);        
      });   

      $scope.transactions = transactions;  
    });


    $scope.getTypeIcon = function(transType){

      var icon = "";
      switch(transType){

        case "Update Employee":
          icon = "ion-person";
          break;
        case "Add Employee":
          icon = "ion-person";
          break;
        case "Add Vehicle":
          icon = "ion-android-car";
          break;          
        case "Remove Employee":
          icon = "ion-person";
          break;
        case "Remove Vehicle":
          icon = "ion-android-car";
          break;    
        case "Unit Status update":
          icon = "ion-flag";
          break;    
        case "Base updated":
          icon = "ion-ios-home";
          break;    
        case "Self-start Incident":
          icon = "ion-alert-circled";
          break;                      
        case "Task Status update":
          icon = "ion-flag";
          break;
        case "Submit Comment":
          icon = "ion-chatbox-working";
          break;        
        case "Task Details update":
          icon = "ion-ios-information";
          break;        
        case "Submit Short Form":
          icon = "ion-android-list";
          break;        
        case "Photo":
          icon = "ion-image";
          break;
        case "Video":
          icon = "ion-ios-videocam";
          break;
        case "Sound":
          icon = "ion-android-microphone";
          break;          
        default:
          icon = "ion-android-list";  
      }

      return icon;

    }

    $scope.uploadSelection = function(){      

      // check if uploading already
      if($scope.refreshList){
        return;
      }

      if($scope.transactions.length < 1){
        return;
      }

      $ionicPopup.confirm({
        title: 'Confirmation',
        template: 'Are you sure you would like to sync the selected items?'
      }).then(function(res) {
        if (res) {
          uploadSelected();
        }
      })

      function uploadSelected(){

        $scope.refreshList = true;

        var requestInd = 0;
        iterateRequest();
        function iterateRequest(){

          // check stop flag
          if($scope.stopFlag){
            clearSentOffline();
            return;
          }

          // check if requests are done
          if(requestInd === $scope.transactions.length){            
            clearSentOffline();
            return;
          }

          // check if checked
          if(!$scope.transactions[requestInd].selected){            
            // success
            requestInd++;
            iterateRequest();
            return;
          }

          doRequest($scope.transactions[requestInd], function(){
            // success
            requestInd++;
            iterateRequest();
          }, function(err){
            // error
            $scope.stopFlag = true;
            console.log("Error: " + err);
          })
        }

        // remove successfull transactions from list            
        function clearSentOffline(){
          for(var transInd = ($scope.transactions.length - 1); transInd >= 0; transInd--){    
            if($scope.transactions[transInd].sent){
              $scope.transactions.splice(transInd, 1);
            }            
          }
          $scope.refreshList = false;          
        }

        function doRequest(transaction, success, error){

          // set sent flag
          transaction.sent = false;

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
            // try again          
            $sapRequest.request(JSON.parse(transaction.Payload), function(data){
              // delete trans from DB
              $db.delete("Offline", ["TransId"], [transaction.TransId], function(){                              
                transaction.sent = true;
                success();   
              });              
            }, function(){               
              error();
            });
          }
        }
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
    function uploadMedia(media, transaction, success, error){
      
      // get token first
      $sapRequest.getToken(function(token){

        var applicationContext = JSON.parse(localStorage.getItem("ApplicationContext"));      
        var url = applicationContext.applicationEndpointURL + "/FileSet(FileName='" + media.FileName + "',IncidentID='" + media.IncidentId + "')/$value";                  
        var targetPath = media.FullPath;
        var trustHosts = true;
        
        function win(r) {          

          // flag as uploaded
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

    $scope.selectAllToggle = function(selectAll){
      // do all checkboxes
      angular.forEach($scope.transactions, function (transaction) {
        transaction.selected = selectAll;
      });
    }

    $scope.viewOfflineTrans = function(trans){
      return;
      $scope.selectedTrans = trans

      var payloadPopup = $ionicPopup.show({
        templateUrl: 'viewOfflineTrans.html',        
        title: 'Payload',        
        scope: $scope,
        buttons: [
          { text: 'Cancel' }          
        ]
      });

    };

  });