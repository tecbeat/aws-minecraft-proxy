import mc from "minecraft-protocol";
import { silly, log, error } from "./debug.js";
import { exec } from "child_process";
import { timeoutPromise } from "./utils.js";
import path from "path";
import dirname from "./dirname.cjs";
const { __dirname } = dirname;

const TIMEOUT_ERR = "TIMEOUT";
const CHECK_INTERVAL = 5000;
const CHECK_TIMEOUT = 5000;

export default class ServerChecker {
    constructor(
        /**@type {string}*/ targetCluster,
        /**@type {number}*/ targetPort
    ) {
        this.target = {
            host: undefined,
            cluster: targetCluster,
            port: targetPort,
        };
        this.currentState = {
            active: false,
            data: {},
            time: Date.now(),
        };

        // start checking if the remote is up
        this._checkTimeout = undefined;
        this.checkTarget = this.checkTarget.bind(this);
        this.checkTarget();
    }

    close() {
        clearTimeout(this._checkTimeout);
    }

    checkTarget() {
        silly(this.currentState);
        silly(this.target);
        clearTimeout(this._checkTimeout);
        const state = {
            active: false,
            data: {},
            time: 0,
        };
        // updateHost();
        Promise.race([
            this.getTargetData(),
            timeoutPromise(CHECK_TIMEOUT, TIMEOUT_ERR),
        ])
            .then((data) => {
                silly("Target is alive", data);
                state.active = true;
                state.data = data;
            })
            .catch((err) => {
                silly("Target is not alive");
                state.active = false;
                state.data = this.currentState.data;
            })
            .then(() => {
                state.time = Date.now();
                this.currentState = state;
                this._checkTimeout = setTimeout(this.checkTarget, 10000);
            });
    }

    getTargetData() {
        this.getTaskArn()
            .then((taskArn) => {
                this.getHostIP(taskArn)
                    .then((ip) => {
                        this.target.host = ip;
                    })
                    .catch((err) => {
                        silly(err);
                    });
            })
            .catch((err) => {
                silly(err);
            });
        return new Promise((res, rej) => {
            mc.ping(
                { host: this.target.host, port: this.target.port },
                (err, data) => {
                    if (err) {
                        return rej(err);
                    }
                    res(data);
                }
            );
        });
    }

    getTaskArn() {
        return new Promise((res, rej) => {
            exec(
                `aws ecs list-tasks --region eu-central-1 --cluster ${this.target.cluster} --query taskArns[0] --output text`,
                { cwd: path.join(__dirname, "..") },
                (err, stdout, stderr) => {
                    if (err) {
                        return rej(`Command failed (${err.name} ${err.message}):\n${stderr.toString()}`)
                    }
                    if (stdout.toString().includes("None")) {
                        return rej("There is no Task available!")
                    }
                    res(stdout.toString().trim());
                }
            );
        });
    }

    getHostIP(taskArn) {
        return new Promise((res, rej) => {
            exec(
                `aws ecs describe-tasks --region eu-central-1 --cluster ${this.target.cluster} --tasks ${taskArn} --query tasks[0].attachments[0].details[4].value --output text`,
                { cwd: path.join(__dirname, "..") },
                (err, stdout, stderr) => {
                    if (err) {
                        return rej(`Command failed (${err.name} ${err.message}):\n${stderr.toString()}`)
                    }
                    res(stdout.toString().trim());
                }
            );
        });
    }
}
