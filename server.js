/*
 *@author Alan?Liang
 *@version 1.0.0
 *@name SSCS
 *
 *https://github.com/Alan-Liang/SSCS
 */

exports.rc=[];

exports.ipaddress = "127.0.0.1";
exports.port      = 8080;

var http=require("http");
var fs=require("fs");
var mime=require('mime');
var url=require('url');
var vurl=require('./vurl');

exports.chistory={};

var listeningFunc=function(req,resp){
	// Parse the request containing file name
	var pathname = url.parse(req.url).pathname.substr(1);
	if(cache[pathname]){
		var type=mime.lookup(pathname.substr(1));
		resp.writeHead(200, {'Content-Type':type});	
		resp.write(cache[pathname]);
		resp.end();
		return;
	}
	if(vurl.query(pathname)){
//		try{
			(vurl.query(pathname))(req,resp);
			return;
	/*	}catch(e){
			clog("Error executing "+pathname+" : "+e);
			resp.writeHead(501, {'Content-Type':'text/plain'});	
			resp.end();
			return;
		}*/
	}
};

var cache={};
var server;

function clog(str){
	var time=new Date().toLocaleString();
	console.log("["+time+"] "+str+"\n");
	//clogi.innerHTML+=("["+time+"] "+str+"\n");
};

exports.startsvc=function(){
	if(!server){
		try{
			server=http.createServer(listeningFunc);
			server.listen(this.port,this.ipaddress);
		}catch(e){
			clog("Error listening on "+this.ipaddress+":"+this.port+": "+e);
			server=undefined;
			return;
		}
		clog("Server started, listening on "+this.ipaddress+":"+this.port+".");
	}
	var hist;
	try{
		hist=fs.readFileSync("history.json");
		hist=JSON.parse(hist);
		exports.chistory=hist?hist:{};
	}catch(e){
		clog("Error reading history: "+e);
		exports.chistory={};
		for(var i=0;i<exports.rc.length;i++){
			exports.chistory[exports.rc[i]]=[];
		}
	}
};

exports.stopsvc=function(){
	if(server){
		try{
			server.close();
		}catch(e){
			clog("Error closing: "+e);
			return;
		}
		clog("Server stopped.");
		server=undefined;
	}
};

var loadpages=["chat.html","gs.css"];
for(var i=0;i<loadpages.length;i++){
	try{
		var page=fs.readFileSync("./node_modules/sscs/"+loadpages[i]);
		cache[loadpages[i]]=page;
	}catch(e){
		clog("Error reading file "+loadpages[i]+" : "+e);
	}
}

this.pendReq=function(req){
    var params = url.parse(req.url,true).query;
	for(var i=0;i<exports.rc.length;i++)
		if(params["rc"]==exports.rc[i])return exports.rc[i];
	return false;
}
var pendReq=this.pendReq;

//add listening functions
vurl.add={path:"webapi/history",func:function(req,resp){
	var trc;
	if((trc=pendReq(req))!=false){
		resp.writeHead(200, {'Content-Type':'application/json'});
		resp.write(JSON.stringify({chistory:exports.chistory[trc]}));
		resp.end();
		return;
	}
	resp.writeHead(403, {'Content-Type':'text/plain'});
	resp.write("403 unauthorized");
	resp.end();
}};
vurl.add={path:"webapi/new",func:function(req,resp){
	var trc;
	if((trc=pendReq(req))!=false){
		var params = url.parse(req.url,true).query;
		if(params["last"]){
			resp.writeHead(200, {'Content-Type':'application/json'});
			resp.write("{\"nw\":[");
			for(var i=exports.chistory[trc].length-1;i>=0;i--){
				if(exports.chistory[trc][i].id==params.last){
					for(var c=i;c<exports.chistory[trc].length;c++){
						resp.write(JSON.stringify(exports.chistory[trc][c]));
						if((c+1)<exports.chistory[trc].length)resp.write(",");
					}
				}
			}
			resp.write("]}");
			resp.end();
			return;
		}
		resp.writeHead(400, {'Content-Type':'application/json'});
		resp.write("bad parameter");
		resp.end();
		return;
	}
	resp.writeHead(403, {'Content-Type':'text/plain'});
	resp.write("403 unauthorized");
	resp.end();
}};
vurl.add={path:"webapi/add",func:function(req,resp){
	var trc;
	if((trc=pendReq(req))!=false){
		var postData="";
		req.setEncoding("utf8");
		req.addListener("data", function(postDataChunk) {
			postData += postDataChunk;
		});
		req.addListener("end", function() {
			try{
				var params = JSON.parse(postData);
				if(params["time"]&&params["user"]&&params["text"]){
					exports.chistory[trc].push({
						time:decodeURI(params.time),
						user:decodeURI(params.user),
						text:decodeURI(params.text),
						id:exports.chistory[trc].length
						});
					try{
						fs.writeFileSync("./history.json",JSON.stringify(exports.chistory));
					}catch(e){
						clog("Error writing history file :"+e);
					}
					resp.writeHead(200, {'Content-Type':'application/json'});
					resp.write("{status:"+(exports.chistory[trc].length-1)+"}");
					resp.write(postData);
				}
				else{
					resp.writeHead(200, {'Content-Type':'application/json'});
					resp.write("{status:-1}");
				}
				resp.end();
			}catch(e){
				resp.writeHead(501, {'Content-Type':'application/json'});
				clog("Error adding message :"+e);
				resp.end();
				}
		});
	}else{
		resp.writeHead(403, {'Content-Type':'text/plain'});
		resp.write("403 unauthorized");
		resp.end();
	}
}};
try{
	exports.loginp=fs.readFileSync("./node_modules/sscs/main.html");
}catch(e){
	clog("Error reading file main.html : "+e);
	loginp="";
}
vurl.add={path:"",func:function(req,resp){
	resp.writeHead(200, {'Content-Type':'text/html'});
	resp.write(exports.loginp);
	resp.end();
}};


vurl.add={path:"webapi/login",func:function(req,resp){
	var trc;
	if((trc=pendReq(req))!=false){
		var params = url.parse(req.url,true).query;
		resp.writeHead(302, {'Location':'/chat.html?rc='+encodeURI(trc)+'&uname='+encodeURI(params.uname)});
		resp.end();
		return;
	}
	resp.writeHead(302, {'Location':'/'});
	resp.write("Unauthorized");
	resp.end();
}};
