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
var env  = process.env;

var concurrent_requests = Number(env['SKUPPER_EXAMPLE_CONCURRENCY'] || '1');
var outstanding         = 0;
var rates               = Object();
var failure             = false;
var service_name        = env['SKUPPER_EXAMPLE_SERVICE_NAME'];
var service_host        = env[service_name + '_SERVICE_HOST'];
var service_port        = env[service_name + '_SERVICE_PORT'];

var url = 'http://' + service_host + ':' + service_port + '/request';

console.log("Configured concurrency: %d", concurrent_requests);
console.log("Query URL: %s", url);

function record_pod(pod) {
    if (rates[pod] == undefined) {
        rates[pod] = 0;
    }

    rates[pod] += 1;
}

function run_requests() {
    while (outstanding < concurrent_requests) {
        outstanding += 1;
        http.get(url, (resp) => {
            let text = '';

            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                text += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                data = JSON.parse(text)
                record_pod(data.pod)
                outstanding -= 1;
                run_requests();
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
            outstanding -= 1;
            failure = true;
        });
    }
}

run_requests();

//
// Report on the server rates every two seconds
//
setInterval((function() {
    console.log('\n======== Rates per server-pod ========');
    for (pod in rates) {
        console.log('%s: %d', pod, rates[pod] / 2);
        delete rates[pod];
    }

    if (failure) {
        failure = false;
        run_requests();
    }
}), 2000);




