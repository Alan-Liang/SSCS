var sscs=function(options){

var templ=options.messageTemplate;
var loginErrorTemplate=options.loginErrorTemplate;
var chatroom=options.chatroom;
var msgbox=options.messageBox;
var sendbtn=options.sendButton;
var snackbarbox=options.snackbar;
var dialogbox=options.dialog;
var dialogTitle=options.dialogTitle;
var dialogDesc=options.dialogDescription;


//time formatting
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

function debug(str){
	var debug=true;
	if(debug)console.log("[SSCS-DEBUG] "+str);
}
function snackbar(content,action,callback,timeout){
	if(action===undefined)
		action="OK";
	var obj;
	if(typeof content==typeof {})
		obj=content;
	else obj={
		message:content,
		actionText:action,
		timeout:timeout||5000,
		actionHandler:callback||function(){}
	};
	snackbarbox.MDCSnackbar.show(obj);
}
sscs.snackbar=snackbar;

var _alert=alert;
alert=function(title,desc){
	dialogTitle.innerHTML=title;
	dialogDesc.innerHTML=desc||"";
	dialogbox.MDCDialog.show();
}

var rc;
try{
	var a=(window.location.search.substr(/rc=/.exec(window.location.search).index+3));
	var b=/&/.exec(a);
	b=b?b.index:undefined;
	a=a.substr(0,b);
	rc=a;
}catch(e){}
var user;
try{
	var a=(window.location.search.substr(/uname=/.exec(window.location.search).index+6));
	var b=/&/.exec(a);
	b=b?b.index:undefined;
	a=a.substr(0,b);
	user=a;
}catch(e){}
if(options.user)
	user=options.user;
if(options.rc)
	rc=options.rc;
var last=-1;
function tpl(chatmsg,str,idn){
	var st=/{{[a-zA-Z0-9]*}}/gi;
	var res="";
	var comp;
	var last=0;
	var flag=false;
	while(comp=st.exec(str)){
		res+=str.substring(last,comp.index);
		flag=true;
		last=comp.index+comp[0].length;
		var pps=str.substring(comp.index+2,last-2);
		var val;
		if(pps=="text" && (chatmsg[idn][pps].indexOf("@"+user)>-1))
			chatmsg[idn][pps]="<font class=\"sscs-atme\">"+chatmsg[idn][pps]+"</font>";
/*		if(pps=="text"&&/\[Code:.*\]/.test(chatmsg[idn][pps])){
			/\[Code:.*\]/gi.exec(chatmsg[idn][pps]).index;
		}*/
		if((val=chatmsg[idn][pps])!=undefined)res+=val;
		else res+=("{{"+pps+"}}");
	}
	res+=str.substring(last,str.length);
	return res;
}
var newdiv;
function loadmsg(chatmsg,clearflag){
	if(clearflag)chatroom.innerHTML="";
	for(var i=0;i<chatmsg.length;i++){
		newdiv=document.createElement("div");
		newdiv.className="message-wrapper";
		chatmsg[i].timeago=timeago(chatmsg[i].time);
		newdiv.innerHTML=tpl(chatmsg,templ,i);
		chatroom.appendChild(newdiv);
		if(("#msg_"+chatmsg[i].id)==location.hash){
			var off=newdiv.offsetTop;
			setTimeout(function(){
				window.scrollTo(0,off);
			},10);
			newdiv.firstElementChild.classList.add("sscs-focused");
			(function(fc){
				setTimeout(function(){
					fc.classList.add("sscs-focused-blur");
					fc.classList.remove("sscs-focused");
				},500);
			})(newdiv.firstElementChild);
		}
		if(i==chatmsg.length-1&&clearflag){
			var off=newdiv.offsetTop;
			setTimeout(function(){
				window.scrollTo(0,off);
			},10);
		}
	}
	debug(templ);
	var a=chatmsg[chatmsg.length-1];
	var b=a?a:{id:-1};
	return b.id;
}
//websockets
var wsLoc=(/https/.test(location.href)?"wss://":"ws://")+"{{wsLocation}}?rc="+rc;
var ws = new WebSocket(wsLoc);
var maxTries=7;
var closeListener=function(e){
	if(e.code!=1000){
		//FIXME this is a hack on mdc that allow us to close snackbar programmatically
		snackbarbox.MDCSnackbar.foundation_.actionClickHandler_();
		debug("Retrying."+maxTries);
		if(maxTries<=0){
			alert("{{networkFault}}");
			return;
		}
		maxTries--;
		setTimeout(function(){
			ws=new WebSocket(wsLoc);
			ws.addEventListener('close',closeListener);
			ws.onopen=wsOpen;
			snackbar("{{reconnecting}}"," ",null,1e64);
		},1000);
	}
};
ws.addEventListener('close',closeListener);

var endl="\r\n";
ws.onopen = wsOpen = function(event){
  //FIXME
  snackbarbox.MDCSnackbar.foundation_.actionClickHandler_();
  debug("WebSocket opened.");
  maxTries=7;
  ws._dataPile="";
  ws.onmessage = function(msg) {
		ws._dataPile+=msg.data;
		var cmds=ws._dataPile.split(endl);
		if(cmds.length>1){
			for(var i=0;i<cmds.length-1;i++){
				debug(cmds);
				debug(i);
				var args=cmds[i].split(" ");
				switch(args[0]){
					case "ERR!":
					alert("{{error}}",args[1]);
					break;

					case "CHAT":
					try{
						var res=JSON.parse(decodeURIComponent(args[1]));
						loadmsg([res]);
						//todo
					}catch(e){
						alert("{{error}}",e.stack);
					}
					break;
					
					case "HIST":
					try{
						var res=JSON.parse(decodeURIComponent(args[1]));
						loadmsg(res,true);
					}catch(e){
						alert("{{error}}",e.stack);
					}
					break;

					default: //unknown
					ws.send("ERR!"+endl);
					break;
				}
			}
			ws._dataPile=cmds[cmds.length-1];
		}
  };
};

sendbtn.onclick=function(){
	var snack=function(){
		snackbar("{{messageSent}}","OK",function(){
			msgbox.focus();
		});
	};
	if(!(msgbox.value&&(msgbox.value!="")))return;
	var obj={"time":new Date(),
		"user":user,
		"text":msgbox.value
	};
	ws.send("CHAT "+encodeURIComponent(JSON.stringify(obj))+endl);
	snack();
	//FIXME strange error (try commenting the following lines out)
	if(!window.snacked){
		snack();
		window.snacked=true;
	}
	msgbox.value="";
};

msgbox.onkeypress=function(e){
	if(e.charCode==13)sendbtn.onclick();
};

var onfocus=function(){
	setTimeout(function(){
		var flag=msgbox.parentElement.querySelector(".mdc-floating-label").classList.contains("mdc-floating-label--float-above");
		if(flag&&!msgbox.isFilled){
			msgbox.isFilled=true;	
			msgbox.parentElement/* .sscs-sendbox*/.style.height="48px";
			return;
		}
		if(!flag&&msgbox.isFilled){
			msgbox.isFilled=false;
			msgbox.parentElement.style.height="";
			return;
		}
	},10);
};
msgbox.addEventListener("focus",onfocus);
msgbox.addEventListener("blur",onfocus);

};
sscs.showTime=function(time){
	alert(new Date(time).toString());
};
