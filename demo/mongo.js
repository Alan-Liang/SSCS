//sscs demo
//don't run here! copy it outside!
//run `npm i mongodb` before running.
var sscs=require("sscs");
var db=require("./utils/db");
var col="sscs";

var history;
var getHist=function(rc){
	if(history)
		if(rc)
			return history[rc]||[];
		else return history;
	return new Promise(function(resv,rej){
		db.find(db.getCollection(col),function(err,res){
			if(err){
				resv({});
				return;
			}
			var hist={};
			for(var i=0;i<res.length;i++){
				if(!hist[res[i].room])
					hist[res[i].room]=[];
				hist[res[i].room].push(res[i]);
			}
			history=hist;
			if(rc)
				hist=hist[rc];
			resv(hist);
		});
	});
};
var s;
db.connect(function(err){
	if(err){
		throw err;
	}
	s=new sscs({
		loadHistory:getHist,
		getHistory:getHist,
		pushHistory:function(rc,obj){
			obj.room=rc;
			history[rc]=history[rc]||[];
			obj.id=history[rc].length;
			history[rc].push(obj);
			db.insertOne(db.getCollection(col),obj);
		},
		rc:["room1","room2"],
		port:50082
	});
	s.startsvc();
});