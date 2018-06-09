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
var vurl=require("./vurl");
var ws=require("ws");

var sscs=exports=module.exports=function sscs(config){
	for(i in config){
		this[i]=config[i];
	}
};

var handleRequest=sscs.prototype.handleRequest=function(req,resp){
	// Parse the request containing file name
	var pathname = url.parse(req.url).pathname.substr(1);
	if(cache[pathname]){
		var type=mime.lookup(pathname.substr(1));
		resp.writeHead(200, {'Content-Type':type});	
		resp.write(cache[pathname]);
		resp.end();
		return;
	}
	if(pathname==""){
		var type="text/html";
		resp.writeHead(200, {'Content-Type':type});	
		resp.write(cache["index.html"]);
		resp.end();
		return;
	}
	if(vurl.query(pathname)){
		try{
			vurl.query(pathname).call(this,req,resp);
			return;
		}catch(e){
			try{
				clog("Error executing "+pathname+" : "+e.stack);
				resp.writeHead(501, {'Content-Type':'text/plain'});	
				resp.end();
				return;
			}catch(e){}
		}
	}
};
sscs.prototype.endl="\r\n";
sscs.prototype.errmsg={
	roomNotExist:"This room does not exist.",
	internal:"Something bad happens. See log for details.",
	jsonInvalid:"The webpage encounters an error. For more details, the JSON it send is invalid.",
	badRequest:"The webpage sent us a bad request."
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
		wsc.send("HIST"+this.getHistory(trc)+endl);
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
							params=JSON.parse(args[1]);
						}catch(e){
							wsc.send("ERR! "+this.errmsg.jsonInvalid+endl);
						}
						if(params["time"]&&params["user"]&&params["text"]){
							var obj={
								time:decodeURI(params.time),
								user:decodeURI(params.user),
								text:decodeURI(params.text)
							};
							this.pushHistory(trc,obj);
							var msg=JSON.stringify(obj);
							for(var i=0;i<wscs.length;i++){
								var c=wscs[i];
								try{
									c.send("CHAT "+msg+endl);
								}catch(e){}
							}
						}
						
						case "ERR!":
						clog("client complaints our fault: "+args[1]);
						break;
						
						default:
						wsc.send("ERR!"+this.errmsg.badRequest+endl);
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
			if(this.ws){
				this.wsServer=new ws.Server({server:this.server});
				this.wsServer.on("connection",this.handleWs.bind(this));
			}
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

sscs.prototype.pages=["mdc.css","mdc.js","chat.html","index.html"];
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

//add listening functions
vurl.add={path:"webapi/history",func:function(req,resp){
	var trc;
	if((trc=this.pendReq(req))!=false){
		resp.writeHead(200, {'Content-Type':'application/json'});
		resp.write(JSON.stringify({history:this.getHistory(trc)}));
		resp.end();
		return;
	}
	resp.writeHead(403, {'Content-Type':'text/plain'});
	resp.write("403 unauthorized");
	resp.end();
}};
vurl.add={path:"webapi/new",func:function(req,resp){
	var trc;
	if((trc=this.pendReq(req))!=false){
		var params = url.parse(req.url,true).query;
		if(params["last"]){
			resp.writeHead(200, {'Content-Type':'application/json'});
			var news={news:this.getNews(trc,parseInt(params.last))};
			resp.write(JSON.stringify(news));
			resp.end();
			return;
		}
		resp.writeHead(400, {'Content-Type':'application/json'});
		resp.write(JSON.stringify({err:400,message:"Bad parameter"}));
		resp.end();
		return;
	}
	resp.writeHead(403, {'Content-Type':'application/json'});
	resp.write(JSON.stringify({err:403,message:"Unauthorized"}));
	resp.end();
}};
vurl.add={path:"webapi/add",func:function(req,resp){
	var trc;
	if((trc=this.pendReq(req))!=false){
		var postData="";
		req.setEncoding("utf8");
		req.addListener("data", function(postDataChunk) {
			postData += postDataChunk;
		});
		req.addListener("end", function() {
			try{
				var params = JSON.parse(postData);
				if(params["time"]&&params["user"]&&params["text"]){
					var id=this.pushHistory(trc,{
						time:decodeURI(params.time),
						user:decodeURI(params.user),
						text:decodeURI(params.text)
					});
					resp.writeHead(200, {'Content-Type':'application/json'});
					resp.write("{status:"+id+"}");
					resp.write(postData);
				}
				else{
					resp.writeHead(200, {'Content-Type':'application/json'});
					resp.write("{status:-1}");
				}
				resp.end();
			}catch(e){
				resp.writeHead(501, {'Content-Type':'application/json'});
				clog("Error adding message :"+e.stack);
				resp.end(JSON.stringify({err:501,message:"Error adding message."}));
			}
		}.bind(this));
	}else{
		resp.writeHead(403, {'Content-Type':'application/json'});
		resp.write(JSON.stringify({err:403,message:"Unauthorized"}));
		resp.end();
	}
}};

vurl.add={path:"webapi/login",func:function(req,resp){
	var trc;
	console.log(req);
	if((trc=this.pendReq(req))!=false){
		var params = url.parse(req.url,true).query;
		resp.writeHead(302, {'Location':'/chat.html?rc='+encodeURI(trc)+'&uname='+encodeURI(params.uname)});
		resp.end();
		return;
	}
	resp.writeHead(302, {'Location':'/'});
	resp.write("Unauthorized");
	resp.end();
}};