/*
 *@author Alan?Liang
 *@version 1.0.0
 *@name SSCS
 *
 *https://github.com/Alan-Liang/SSCS
 */

var rc=["Chatting"];

var ipaddress = "192.168.1.100";
var port      = 20080;

var http=require("http");
var fs=require("fs");
var mime=require('mime');
var url=require('url');
var vurl=require('./vurl');

var chistory={};

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
		try{
			(vurl.query(pathname))(req,resp);
			return;
		}catch(e){
			clog("Error executing "+pathname+" : "+e);
			resp.writeHead(501, {'Content-Type':'text/plain'});	
			resp.end();
			return;
		}
	}
};

var cache={};
var server;

function clog(str){
	var time=new Date().toLocaleString();
	console.log("["+time+"] "+str+"\n");
	//clogi.innerHTML+=("["+time+"] "+str+"\n");
};

startsvc=function(){
	if(!server){
		try{
			server=http.createServer(listeningFunc);
			server.listen(port,ipaddress);
		}catch(e){
			clog("Error listening on "+ipaddress+":"+port+": "+e);
			server=undefined;
			return;
		}
		clog("Server started, listening on "+ipaddress+":"+port+".");
	}
};

stopsvc=function(){
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
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
inputting();
function inputting()
{
	rl.question('SSCS>/_', (answer) => {
	// TODO: Log the answer in a database
		if(answer === 'stop')
		{
			stopsvc();
			rl.close();
		}

		else if(answer === 'restart')
		{
			stopsvc();
			rl.pause();
			startsvc();
			rl.resume();
		}
	});
}

var hist;
try{
	hist=fs.readFileSync("history.json");
	hist=JSON.parse(hist);
	chistory=hist?hist:{};
}catch(e){
	clog("Error reading history: "+e);
	chistory={};
	for(var i=0;i<rc.length;i++){
		chistory[rc[i]]=[];
	}
}

startsvc();

var loadpages=["chat.html","gs.css"];
for(var i=0;i<loadpages.length;i++){
	try{
		var page=fs.readFileSync(loadpages[i]);
		cache[loadpages[i]]=page;
	}catch(e){
		clog("Error reading file "+loadpages[i]+" : "+e);
	}
}

function pendReq(req){
    var params = url.parse(req.url,true).query;
	for(var i=0;i<rc.length;i++)
		if(params["rc"]==rc[i])return rc[i];
	return false;
}

//add listening functions
vurl.add={path:"webapi/history",func:function(req,resp){
	var trc;
	if((trc=pendReq(req))!=false){
		resp.writeHead(200, {'Content-Type':'application/json'});
		resp.write(JSON.stringify({chistory:chistory[trc]}));
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
			for(var i=chistory[trc].length-1;i>=0;i--){
				if(chistory[trc][i].id==params.last){
					for(var c=i;c<chistory[trc].length;c++){
						resp.write(JSON.stringify(chistory[trc][c]));
						if((c+1)<chistory[trc].length)resp.write(",");
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
					chistory[trc].push({
						time:decodeURI(params.time),
						user:decodeURI(params.user),
						text:decodeURI(params.text),
						id:chistory[trc].length
						});
					try{
						fs.writeFileSync("./history.json",JSON.stringify(chistory));
					}catch(e){
						clog("Error writing history file :"+e);
					}
					resp.writeHead(200, {'Content-Type':'application/json'});
					resp.write("{status:"+(chistory[trc].length-1)+"}");
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
var loginp;
try{
	loginp=fs.readFileSync("main.html");
}catch(e){
	clog("Error reading file main.html : "+e);s
}
vurl.add={path:"",func:function(req,resp){
	resp.writeHead(200, {'Content-Type':'text/html'});
	resp.write(loginp);
	resp.end();
}};


vurl.add={path:"webapi/login",func:function(req,resp){
	var trc;
	if((trc=pendReq(req))!==false){
		var params = url.parse(req.url,true).query;
		resp.writeHead(302, {'Location':'/chat.html?rc='+encodeURI(trc)+'&uname='+encodeURI(params.uname)});
		resp.end();
		return;
	}
	resp.writeHead(302, {'Location':'/'});
	resp.write("Unauthorized");
	resp.end();
}};
