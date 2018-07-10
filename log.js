/*
 *log.js
 *@author Alan-Liang
 *@description npmlog wrapper
 *@license WTFPL
 */

/*
  @example
  var log=require("./log")("example-logger");
  log.info("Hello World");
  log.log("info","Hello World");
*/

var npmlog=require("npmlog");
npmlog.header="sscs";
var makeLogger=exports=module.exports=function(name){
	if(!name) {
		logger.warn("logger name not specified!");
		name="";
	}
	name=String(name);
	var log={};
	log.prefix=name;
	log.raw=npmlog;
	log.log=function(lvl,message){
		var a=new Array(arguments.length+1);
		a[0]=lvl;
		a[1]=name;
		for(var i=1;i<arguments.length;i++){
			a[i+1]=arguments[i];
		}
		return npmlog.log.apply(this,a);
	};
	for(var lvl in npmlog.levels){
		(function(lvl){
			log[lvl]=function(message){
				var a=new Array(arguments.length+1);
				a[0]=lvl;
				for (var i=0;i<arguments.length;i++){
					a[i+1]=arguments[i];
				}
				return log.log.apply(this,a);
			};
		})(lvl);
	}
	return log;
};
var logger=makeLogger("log");