#!/usr/bin/env node
import fs from "fs";
import path from "path";
import childProcess from "child_process";
import { silly, log, error } from "./debug.js";
import Server from "./server.js";
import dirname from "./dirname.cjs";
import { stdout } from "process";
const { __dirname } = dirname;

// make sure configuration is specified in package.json
const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../package.json"))
);
const config = pkg["minecraft-aws"];
if (!config || !config.target || !config.commands) {
    console.log(`The "minecraft-aws" configuration is missing from package.json.
Add the following (and customize it):
"minecraft-aws": ${JSON.stringify(
        {
            target: { cluster: "localhost", port: 25565 },
            commands: {
                start: "echo 'Starting server'",
                shutdown: "echo 'Shutting down server'"
            },
        },
        null,
        2
    )}`);
    process.exit(1);
}

function executeAction(name) {
    const command = config.commands[name];
    if (!command) {
        error(`Unknown command ${name}`);
        return;
    }
    log(`Executing command ${name}: ${command}`);
    executeCommand(command);
}

const server = new Server(25565, config.target.port);
server.on("start", () => {
    executeAction("start");
});
server.on("stop", () => {
    executeAction("shutdown");
});


export function getHostIP() {
    var cluster = config.target.cluster;
    const taskArnCommand = `aws ecs list-tasks --cluster ${cluster} --query 'taskArns[0]' --output text`;
    const taskArn = executeCommand(taskArnCommand);
    if (taskArn == "None") return "localhost";
    const ipAddress = `aws ecs describe-tasks --cluster ${cluster} --tasks ${taskArn} --query 'tasks[0].attachments[0].details[4].value' --output text`
    if (ipAddress == "None") return "localhost";
    return ipAddress;
}

function executeCommand(command) {
    log(`Executing command for cluster: ${command}`);
    childProcess.exec(
        command,
        { cwd: path.join(__dirname, "..") },
        (err, stdout, stderr) => {
            if (err) {
                error(
                    `Command failed (${err.name} ${err.message
                    }):\n${stderr.toString()}`
                );
                return;
            }
            log(`Command finished:\n${stdout.toString()}`);
            return stdout;
        }
    );
}