//time formatting
//USELESS here
//will be copied into html files
var timeago=function(time){
	if(time=="")return "";
	if(typeof time==typeof "")
		time=new Date(time);
	var now=new Date();
	var diff=now.getTime()-time.getTime();
	if(diff<10*1000) //10 sec
		return "{{timeJustNow}}";
	if(diff>365*24*60*60*1000) //1 year
		return time.getFullYear()+"/"+(time.getMonth()+1)+"/"+time.getDate();
	if(diff>30*24*60*60*1000) //1 month
		return (time.getMonth()+1)+"/"+time.getDate();
	if(diff>24*60*60*1000){ //1 day
		var dayAgo=parseInt(diff/(24*60*60*1000));
		var s=(dayAgo==1)?"":"s";
		return dayAgo+" day"+s+" ago";
	}
	if(diff>60*60*1000){ //1h
		var hrAgo=parseInt(diff/(60*60*1000));
		var s=(hrAgo==1)?"":"s";
		return hrAgo+" hour"+s+" ago";
	}
	if(diff>60*1000){ //1m
		var minAgo=parseInt(diff/(60*1000));
		var s=(minAgo==1)?"":"s";
		return minAgo+" minute"+s+" ago";
	}
	var secAgo=parseInt(diff/1000);
	var s=(secAgo==1)?"":"s";
	return secAgo+" second"+s+" ago";
};