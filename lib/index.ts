import path = require('path');
import {spawn} from 'child_process';
import ElectronType = require('electron');// will be compiled out

let electron:typeof ElectronType;
try {
    electron = require('electron');
}
catch(err) {
    // silence is golden
}

/**
 * API to launch the Floss application.
 * @module floss
 * @param {Object|String} options The options map or path.
 * @param {String} [options.path] Path to the JS file to run.
 * @param {Boolean} [options.debug] `true` opens in headful mode.
 * @param {String} [options.electron] Path to custom electron version. If undefined
 *        will use environment variable `ELECTRON_PATH` or electron
 *        installed alongside.
 * @param {String} [options.reporter=spec] Mocha reporter (non-debug mode only)
 * @param {String|Object} [options.reporterOptions] Additional options for the reporter
 *        useful for specifying an output file if using the 'xunit' reporter.
 *        Options can be a querystring format, e.g., `"foo=2&bar=something"`
 * @param {String[]} [options.args] Additional Electron arguments, can be useful
 *        for things like disable autoplay gestures, e.g.,
 *        `["--autoplay-policy=no-user-gesture-required"]`
 * @param {Function} done Called when completed. Passes error if failed.
 */
function floss(options:string|{path?:string,debug?:boolean,electron?:string,reporter?:string,reporterOptions?:any,args?:string[]}, done:(error?:any)=>void) {

    if (typeof options === "string") {
        options = {
            path: options
        };
    }

    options = Object.assign({
        debug: false,
        quiet: false,
        args: [],
        electron: process.env.ELECTRON_PATH || electron
    }, options);

    if (!options.path) {
        console.error("Error: No path specified for Floss.");
        return done();
    }

    if (!options.electron) {
        console.error("Error: Unable to find Electron. Install 'electron' alongside Floss.");
        return done();
    }

    const app = path.join(__dirname, 'main');
    const args = JSON.stringify(options);

    const isWindows = /^win/.test(process.platform);
    if(isWindows && !path.extname(options.electron)) {
        // In the case where floss is running in windows with the cmdline option --electron electron
        // options.electron will just be "electron" at this point.
        // Due to limitations with how nodejs spawns windows processes we need to add .cmd to the end of the command
        // https://github.com/nodejs/node/issues/3675
        options.electron += ".cmd";
    }

    //copy the environment and remove things that would prevent Floss from running properly
    const envCopy = Object.assign({}, process.env);
    delete envCopy.ELECTRON_RUN_AS_NODE;
    delete envCopy.ELECTRON_NO_ATTACH_CONSOLE;
    const childProcess = spawn(
        options.electron, [app, args].concat(options.args), {
            stdio: 'pipe',
            env: envCopy
        }
    );
    childProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    childProcess.on('close', (code) => {
        if (code !== 0) {
            return done(new Error('Mocha tests failed'));
        }
        done();
    });
}

// Backward compatibility
floss.run = floss;

export = floss;
