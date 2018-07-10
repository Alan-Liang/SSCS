# SSCS
Simple and Slow Chatting Service

A chatting service by Alan?Liang using node.js(nw.js on nwjs branch)

## Usage
```
var sscs=require("sscs");
sscs.rc=["ex1","ex2"];
sscs.port=8080;
sscs.ipaddress="127.0.0.1";
sscs.startsvc();
//wait a moment
//open localhost:8080 in browser
sscs.stopsvc();
console.log(sscs.chistory);
```


## Advanced
You can change the updating time by editing `chat.html`'s last part of `setInterval`(in miliseconds and 1000 by default).

# Credits
This project uses the button design of Google Apps-script(by `gs.css`).

It is on [here](https://developers.google.com/apps-script/add-ons/css), and you can view the terms on [here](https://developers.google.com/apps-script/terms).

# Lisence
This project uses the GPLv2 license. For more information, click [here](https://github.com/Alan-Liang/SSCS/blob/master/LICENSE).
