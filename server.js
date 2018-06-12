/*
 *@author Alan?Liang
 *@version 0.1.0
 *@name SSCS
 *
 *https://github.com/Alan-Liang/SSCS
 */

var fs=require("fs");
var mime=require("mime");
var url=require("url");
var template=require("./template");
var ws=require("ws");

var sscs=exports=module.exports=function sscs(config){
	for(i in config){
		this[i]=config[i];
	}
};

var handleRequest=sscs.prototype.handleRequest=function(req,resp){
	// Parse the request containing file name
	var pathname = url.parse(req.url).pathname.substr(1);
	cache=sscs.cache;
	if(cache[pathname]){
		var type=mime.lookup(pathname.substr(1));
		if(type=="text/html")
			type="text/html;charset=utf-8";
		resp.writeHead(200, {'Content-Type':type});
		var file=this.processStatic(cache[pathname]);
		resp.write(file);
		resp.end();
		return;
	}
	if(pathname==""){
		var type="text/html";
		resp.writeHead(200, {'Content-Type':type});	
		resp.write(this.processStatic(cache["index.html"]));
		resp.end();
		return;
	}
	if(pathname=="login"){		
		var trc;
		if((trc=this.pendReq(req))!=false){
			var params = url.parse(req.url,true).query;
			resp.writeHead(302, {'Location':'/chat.html?rc='+encodeURI(trc)+'&uname='+encodeURI(params.uname)});
			resp.end();
			return;
		}
		resp.writeHead(302, {'Location':'/'});
		resp.write(this.errmsg.roomNotExist);
		resp.end();
		return;
	}
	resp.writeHead(404);
	resp.end();
};
sscs.prototype.processStatic=function(str){
	return template(str.toString(),this);
};
sscs.prototype.title="SSCS";
sscs.prototype.hideAppBar=""; //set to "hidden" when hide
sscs.prototype.loginTitle="Login | SSCS";
sscs.prototype.logoutText="Logout";
sscs.prototype.logoutUrl="/";
sscs.prototype.sendText="Send";
sscs.prototype.sendLabel="Message...";
sscs.prototype.timeJustNow="Just Now";
sscs.prototype.error="Error";
sscs.prototype.messageSent="Message Sent.";
sscs.prototype.wsLocation="\"+location.origin.replace(\"https://\",\"\").replace(\"http://\",\"\")+\"/";
sscs.prototype.networkFault="Something went wrong with the network! Please tell the admin if you are sure your network is good, or click <a href=\\\"javascript:void(0);\\\" onclick=\\\"location.reload();\\\">here</a> to reload.";
sscs.prototype.reconnecting="Reconnecting...";

sscs.prototype.endl="\r\n";
sscs.prototype.errmsg={
	roomNotExist:"This room does not exist.",
	internal:"Something bad happens. See log for details.",
	jsonInvalid:"The webpage encounters an error. For more details, the JSON it send is invalid.",
	badRequest:"The webpage sent us a bad request.",
};
sscs.prototype.wsConnections={};
var handleWs=sscs.prototype.handleWs=function(wsc,req){
	try{
		var trc=this.pendReq(req);
		if(!trc){
			wsc.send("ERR! "+this.errmsg.roomNotExist+this.endl);
			wsc.close(1000,"normal");
			return;
		}
		var wscs=this.wsConnections;
		wscs[trc]?(wscs[trc].push(wsc)):(wscs[trc]=[wsc]);
		wscs=wscs[trc];
		wsc._dataPile="";
		var endl=this.endl;
		wsc.send("HIST "+encodeURIComponent(JSON.stringify(this.getHistory(trc)))+endl);
		wsc.addEventListener('message',function(msg){
			wsc._dataPile+=msg.data;
			var cmds=wsc._dataPile.split(endl);
			if(cmds.length>1){
				for(var i=0;i<cmds.length-1;i++){
					var args=cmds[i].split(" ");
					switch(args[0]){
						case "CHAT":
						if(!args[1])
							break;
						var params;
						try{
							params=JSON.parse(decodeURIComponent(args[1]));
						}catch(e){
							wsc.send("ERR! "+this.errmsg.jsonInvalid+endl);
						}
						if(params["time"]&&params["user"]&&params["text"]){
							var obj={
								time:params.time,
								user:params.user,
								text:params.text
							};
							this.pushHistory(trc,obj);
							var msg=encodeURIComponent(JSON.stringify(obj));
							for(var i=0;i<wscs.length;i++){
								var c=wscs[i];
								try{
									c.send("CHAT "+msg+endl);
								}catch(e){}
							}
						}
						break;
						
						case "ERR!":
						clog("client complaints our fault: "+args[1]);
						break;
						
						default:
						wsc.send("ERR! "+this.errmsg.badRequest+endl);
						break;
					}
				}
				wsc._dataPile=cmds[cmds.length-1];
			}
		}.bind(this));
	}catch(e){try{
		wsc.send("ERR! "+this.errmsg.internal+endl);
		wsc.close(1000,"normal");
		clog(e.stack);
	}catch(e){}}
};

var cache=sscs.cache={};

function clog(str){
	var time=new Date().toLocaleString();
	console.log("["+time+"] "+str+"\n");
	//clogi.innerHTML+=("["+time+"] "+str+"\n");
};

sscs.prototype.loadHistory=function(){	
	var hist;
	try{
		hist=fs.readFileSync("history.json");
		hist=JSON.parse(hist);
		return hist?hist:{};
	}catch(e){
		clog("Error reading history: "+e);
		var hist={};
		for(var i=0;i<this.rc.length;i++){
			hist[this.rc[i]]=[];
		}
		return hist;
	}
};
sscs.prototype.pushHistory=function(trc,obj){
	obj.id=this.history[trc].length;
	this.history[trc].push(obj);
	try{
		fs.writeFileSync("./history.json",JSON.stringify(this.history));
	}catch(e){
		clog("Error writing history file :"+e);
	}
	return obj.id;
};
sscs.prototype.getHistory=function(rc){
	return this.history[rc];
};
sscs.prototype.getNews=function(rc,last){
	var news=[],hist=this.history[rc];
	for(var i=0;i<hist.length;i++){
		if(hist[i].id>=last){
			news.push(hist[i]);
		}
	}
	return news;
};
sscs.prototype.startsvc=function(){
	if(!this.server){
		try{
			this.server=http.createServer(this.handleRequest.bind(this));
			this.server.listen(this.port,this.ipaddress);
			this.wsServer=new ws.Server({server:this.server});
			this.wsServer.on("connection",this.handleWs.bind(this));
		}catch(e){
			clog("Error listening on "+this.ipaddress+":"+this.port+": "+e);
			this.server=undefined;
			return;
		}
		clog("Server started, listening on "+this.ipaddress+":"+this.port+".");
	}
	//doAction
	this.history=this.loadHistory();
	this.loadPages();
	//doAction
	clog("History loaded.");
};

sscs.prototype.stopsvc=function(){
	if(this.server){
		try{
			this.server.close();
		}catch(e){
			clog("Error closing: "+e);
			return;
		}
		clog("Server stopped.");
		this.server=undefined;
	}
};

sscs.prototype.pages=["mdc.css","mdc.js","chat.html","index.html","sscs.css","sscs.js"];
sscs.prototype.loadPages=function(){
	for(var i=0;i<this.pages.length;i++){
		try{
			var page=fs.readFileSync(__dirname+"/"+this.pages[i]);
			cache[this.pages[i]]=page;
		}catch(e){
			clog("Error reading file "+this.pages[i]+" : "+e.stack);
		}
	}
};

sscs.prototype.pendReq=function(req){
    var params = url.parse(req.url,true).query;
	for(var i=0;i<this.rc.length;i++)
		if(params["rc"]==this.rc[i])return this.rc[i];
	return false;
}
