import * as tsNode from "ts-node"
import * as repl from "repl";
import ts from "typescript";
import {TSCommon} from "ts-node";
import {Connection} from "@solana/web3.js";
import * as secrets from "../secrets";


export async function consoleCmd(connection: Connection) {
    // {
    //     swc: true,
    //         compilerOptions: {
    //     target: "ES2023",
    //         module: "commonjs",                                /* Specify what module code is generated. */
    //         esModuleInterop: true,
    //         forceConsistentCasingInFileNames: true,
    //         strict: true,
    //         skipLibCheck: true
    // },
    // }
    const compiler = tsNode.create({swc: true});
    const replService = tsNode.createRepl({service: compiler});
    const service = tsNode.create({...replService.evalAwarePartialHost});
    service.ts = ts as TSCommon;
    replService.setService(service);

    let multiline = "";

    const server = repl.start({
        eval: (evalCmd, context, file, cb) => {
            multiline += evalCmd + "\n";
            replService.nodeEval(multiline, context, file, (error, result) => {
                if (error != null) {
                    if (error.message.indexOf("Unexpected token") != -1
                        || error.message.indexOf('<eof>') != -1
                        || error.message.indexOf('Unexpected eof') != -1) {
                        // console.log("..." + evalCmd);
                        return;
                    }
                    // console.log("error message: ", error.message);
                    // console.log("error cause: ", error.cause);
                    // console.log("error is: ", error);
                }
                multiline = "";
                cb(error, result);
            });
        },
        replMode: repl.REPL_MODE_STRICT,
        useGlobal: true,
        ignoreUndefined: true,
    });

    // add secrets to context
    Object.keys(secrets)
        .forEach(key => server.context[key] = secrets[key]);

    server.context["exports"] = {};
    server.context["connection"] = connection;
    server.context["req"] = async function (module: string, keys: Array<string> = []) {
        let tmp = await import(module);
        if (keys.length == 0) {
            keys = Object.keys(tmp);
        }
        keys.forEach(key => {
            server.context[key] = tmp[key];
        });
    }
}
