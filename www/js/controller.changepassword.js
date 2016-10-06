angular.module('epicmobile.controller.changepassword', ['ngCordova', 'base64'])

  .controller("ChangePassword", function($scope, $state, $ionicPopup, $base64, $ionicLoading, $epic, $sapRequest){

    // Set the default value of inputType
    $scope.inputType = 'password';
  
    // Hide & show password function
    $scope.hideShowPassword = function(){
      if ($scope.inputType == 'password')
        $scope.inputType = 'text';
      else
        $scope.inputType = 'password';
    };

    // set last used username
    $scope.credenitals = {};
    $scope.credenitals.password = "";
    try{
      $scope.credenitals.username = JSON.parse(localStorage.getItem("User")).username;  
    } catch(ex){
      $scope.credenitals.username = "";
    }

    $scope.doChange = function(){

  		// get user details      
  		var username = $scope.credenitals.username.toUpperCase();
      var oldPassword = $scope.credenitals.oldpassword;
      var newPassword = $scope.credenitals.newpassword;
  		var confirmPassword = $scope.credenitals.confirmpassword;

      // validate     
      if(!username.length || !oldPassword.length || !newPassword.length || !confirmPassword.length){         
        $ionicPopup.alert({
          title: 'Validation',
          template: 'Please ensure that you have entered in all the fields.'
        });
        return;
      }

      if(newPassword !== confirmPassword){         
        $ionicPopup.alert({
          title: 'Validation',
          template: 'Your new password does not match the confirmation password.'
        });
        return;
      }
      
      // change user password
      var changeUserPayload = {
        "User": $scope.credenitals.username,
        "OldPassword": $scope.credenitals.oldpassword,
        "NewPassword": $scope.credenitals.newpassword,
        "Action": "CHANGE",
      };

      $sapRequest.request({
        method: "POST",
        requestUri: "LoginUserSet",
        data: changeUserPayload
      }, 
      function(data){          
        
        var changeUserPopup = $ionicPopup.alert({
          title: 'Success',
          template: "Use password changed!"
        });
        changeUserPopup.then(function(){
          $state.go("login");
        });

      }, function(err){

        // user account isnt fine
        // tell the user why and possibly redirect to change password
        var errorJSON = JSON.parse(err.response.body);          
        var userStatus = errorJSON.error.message.value;    

        // remove .
        userStatus = userStatus.replace('.','');

        var errMsg = "";
        switch(userStatus){
          case "NOTALLOW":
            errMsg = "User not allowed to change password.";
            break;
          case "PASSWORD":
            errMsg = "Old user password is incorrect.";
            break;
          case "OTHER":
            errMsg = "Unable to change user password.";
            break;            
          default:
            errMsg = "Unable to change user password";
            break;                                                        
        }

        $ionicPopup.alert({
          title: 'Error',
          template: errMsg
        });          
      });
    }
    



  });