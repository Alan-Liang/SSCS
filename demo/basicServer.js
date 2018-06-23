//sscs demo
//don't run here! copy it outside!
var sscs=require("sscs");
var server=new sscs({
	rc:["room1","room2"], //Room codes
	port:8080
});
server.startsvc();
//server.stopsvc();