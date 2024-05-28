/*
Copyright 2024 Marcel Domke

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

module.exports = function (RED) {
    function GaroWallboxNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.ip = config.ip;
        node.interval = Math.max(config.interval, 10) * 1000; // Ensure minimum interval is 10 seconds, converted to milliseconds
        node.status({ fill: "yellow", shape: "dot", text: "Initializing" });

        function fetchWallboxData() {
            const http = require('http');

            const endpoints = {
                meterinfo: `/servlet/rest/chargebox/meterinfo/CENTRAL100`,
                status: `/servlet/rest/chargebox/status`,
                lbconfig: `/servlet/rest/chargebox/lbconfig/false`
            };

            const promises = Object.keys(endpoints).map(key => {
                return new Promise((resolve, reject) => {
                    const url = `http://${node.ip}:8080${endpoints[key]}`;

                    http.get(url, (resp) => {
                        let data = '';

                        resp.on('data', (chunk) => {
                            data += chunk;
                        });

                        resp.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                resolve({ key, json });
                            } catch (error) {
                                reject(new Error(`Error parsing JSON response for ${key}: ${error.message}`));
                            }
                        });

                    }).on("error", (err) => {
                        reject(new Error(`Error: ${err.message} for ${key}`));
                    });
                });
            });

            Promise.all(promises)
                .then(results => {
                    const advanced = {};
                    results.forEach(result => {
                        advanced[result.key] = result.json;
                    });

                    const payload = {
                        advanced,
                        energy_total: advanced.meterinfo.accEnergy,
                        current_phase1: advanced.meterinfo.phase1Current,
                        current_phase2: advanced.meterinfo.phase2Current,
                        current_phase3: advanced.meterinfo.phase3Current,
                        current_limit: advanced.lbconfig.loadBalancingFuse,
                        mode: advanced.status.mode
                    };

                    node.send({ payload });
                    node.status({ fill: "green", shape: "dot", text: "Data fetched" });
                })
                .catch(error => {
                    node.error(error.message);
                    node.status({ fill: "red", shape: "dot", text: "Error fetching data" });
                });
        }

        // Set an interval to fetch data periodically
        let intervalId = setInterval(fetchWallboxData, node.interval);

        // Handle incoming messages
        node.on('input', function (msg) {
            const http = require('http');
            if (msg.payload) {
                // Handle mode change
                if (msg.payload.mode) {
                    const url = `http://${node.ip}:8080/servlet/rest/chargebox/mode/${msg.payload.mode}`;
                    if (msg.payload.mode === "ALWAYS_OFF" || msg.payload.mode === "ALWAYS_ON") {
                        const req = http.request(url, { method: 'POST' }, (resp) => {
                            let data = '';

                            resp.on('data', (chunk) => {
                                data += chunk;
                            });

                            resp.on('end', () => {
                                node.send({ payload: { result: data, request: { url, method: 'POST' } } });
                            });

                        }).on("error", (err) => {
                            node.error(`Error: ${err.message}`);
                        });

                        req.end();
                    }
                }

                // Handle current_limit change
                if (msg.payload.current_limit && Number.isInteger(msg.payload.current_limit) && msg.payload.current_limit >= 6 && msg.payload.current_limit <= 32) {
                    const lbconfigUrl = `http://${node.ip}:8080/servlet/rest/chargebox/lbconfig/false`;

                    http.get(lbconfigUrl, (resp) => {
                        let data = '';

                        resp.on('data', (chunk) => {
                            data += chunk;
                        });

                        resp.on('end', () => {
                            try {
                                const lbconfig = JSON.parse(data);
                                lbconfig.loadBalancingFuse = msg.payload.current_limit;

                                const postData = JSON.stringify(lbconfig);
                                const postUrl = `http://${node.ip}:8080/servlet/rest/chargebox/lbconfig`;

                                const req = http.request(postUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Content-Length': postData.length
                                    }
                                }, (resp) => {
                                    let responseData = '';

                                    resp.on('data', (chunk) => {
                                        responseData += chunk;
                                    });

                                    resp.on('end', () => {
                                        node.send({
                                            payload: {
                                                result: responseData,
                                                request: {
                                                    url: postUrl,
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Content-Length': postData.length
                                                    },
                                                    body: lbconfig
                                                }
                                            }
                                        });
                                    });
                                });

                                req.on('error', (err) => {
                                    node.error(`Error: ${err.message}`);
                                });

                                req.write(postData);
                                req.end();

                            } catch (error) {
                                node.error(`Error parsing JSON response for lbconfig: ${error.message}`);
                            }
                        });

                    }).on("error", (err) => {
                        node.error(`Error: ${err.message} for lbconfig`);
                    });
                }
            }
        });

        // Clean up on node close
        node.on('close', function () {
            clearInterval(intervalId);
        });
    }
    RED.nodes.registerType("garo-wallbox", GaroWallboxNode);
}
