var jes = require('./jes');
var path = require('path');

jes.renderFile(
   path.dirname(__filename)+"/demo/dd/layout.jes", 
   {
     title:'JES', 
     body:'Welcome to jes!', 
     copyright:'copyright 2012'
   },
   function(err, data){
       if(err){
           console.log(err);
       }else{
           console.log(data);
       }
   }
);
