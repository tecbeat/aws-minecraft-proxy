#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { log, error } from "./debug.js";
import { stdout, stderr } from "process";
import Server from "./server.js";
import dirname from "./dirname.cjs";
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

const server = new Server(25565, config.target.cluster, config.target.port);
server.on("start", () => {
    executeAction("start");
});
server.on("stop", () => {
    executeAction("shutdown");
});


function executeCommand(command) {
    log(`Executing command for cluster: ${command}`);
    exec(
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
            return stdout.toString();
        }
    );
}
