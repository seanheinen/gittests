angular.module('epicmobile.controller.settings', [])
  
  .controller("Settings", function($scope){  
  
    // init
    $scope.serverConfig = JSON.parse(localStorage.getItem("ConnectionSettings"));

  });