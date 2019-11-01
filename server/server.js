/*
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
*/

var http = require('http');
var port = 8080;
var env  = process.env;

var latency  = Number(env['SKUPPER_EXAMPLE_LATENCY'] || '100');
var hostname = env['HOSTNAME'];
var requests = []

console.log("Configured response latency: %dms", latency);

var server = http.createServer((function(request, response) {
    requests.push({'req':request, 'rsp':response});
}));

server.listen(port);
console.log('Listening on port %d', port);

setInterval((function() {
    if (requests.length > 0) {
        item     = requests.shift();
        request  = item.req;
        response = item.rsp;
        response.writeHead(200, {"Content-Type": "text/json"});
        response.end('{"pod":"' + hostname + '"}');
    }
}), latency);


