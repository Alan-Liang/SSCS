# SSCS
Simple and Slow Chatting Service

A extensible chatting service by Alan?Liang using node.js.

## Usage
See [`/demo/`](https://github.com/Alan-Liang/SSCS/blob/master/demo/).

### Basics
```javascript
var sscs=require("sscs");
var config={
            port:8080,
            rc:["room1","room2"]
};
new sscs(config).startsvc();
```

### Backend config
TBD

### Frontend config
TBD

## License
This project uses the GPLv3 license. For more information, click [here](https://github.com/Alan-Liang/SSCS/blob/master/LICENSE).

`mdc.js` and `mdc.css`:
Material Components for the Web
Copyright (c) 2018 Google Inc.
License: Apache-2.0