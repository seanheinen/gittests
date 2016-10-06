angular.module('epicmobile.controller.help', [])
  
  .controller("Help", function($scope, $state){  

    // init
    $scope.faqs = [
      {
        question: "Which user account do I use to login with?",
        answer: [
          "After your username has been configured, you FIRST have to log in onto a computer before logging onto your Mobile Device (first time only)."          
        ]
      },
      {
        question: "What do I do if I'm unable to login?",
        answer: [
          "Call the IT Service Desk at the following number and ask for assistance:",
          "021-400 3434 (choose option 7)"
        ]
      },
      {
        question: "What do I do if I forgot my password?",
        answer: [
          "Call the IT Service Desk at the following number and ask for a password reset:",
          "021-400 3434 (choose option 7)"
        ]
      },
      {
        question: "What do I do if I am not assigned to a unit?",
        answer: [
          "Contact your workforce planner or manager and inform them that you are unassigned."
        ]
      },
      {
        question: "Why can't I change the Unit's status?",
        answer: [
          "You are unable to change the Unit's status for two of the following reasons:",
          "- Your unit is currently already busy with a task.",
          "- You have not been allocated as the Unit Commander."
        ]
      },
      {
        question: "What should I do if my role is incorrect?",
        answer: [
          "Contact your workforce planner or manager and inform them that you are not assigned to the correct role."
        ]
      },
      {
        question: "Where have my resolved tasks gone?",
        answer: [
          "Resolved tasks reside in the completed tasks tab. After 24 hours, these tasks are removed from the device permanently."
        ]
      },
      {
        question: "What is Unsent Data?",
        answer: [
          "Any unsent task detail updates (due to no connection) or media items captured will be stored in Unsent Data. Unsent data will be preiodically re-sent.",
        ]
      },
      {
        question: "Why can't I change the Task Status?",
        answer: [
          "You are unable to change the Task's status becuase you have not been allocated as the Unit Commander."
        ]
      },
      {
        question: "Why can't I resolve or complete the short form on a task?",
        answer: [
          "You are unable to resolve or complete the short form becuase you have not been allocated as the Incident Commander."
        ]
      },
      {
        question: "What happened to the media I've captured?",
        answer: [
          "Media captured is automatically sent and deleted after an hour has elapsed from capture time.",
          "If the Media item is no longer there, it has already been sent to dispatch."
        ]
      },
      {
        question: "Who do I contact to have my device blocked (in case lost or stolen)?",
        answer: [          
          "Contact IT Service Desk at 021-400 3434 (choose option 7)"
        ]
      },
      {
        question: "Who do I contact if I have any device hardware issues?",
        answer: [          
          "Contact IT Service Desk at 021-400 3434 (choose option 7)"
        ]
      }
    ];
    
    
  });