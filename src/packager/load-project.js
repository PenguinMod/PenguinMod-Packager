import { readAsArrayBuffer } from "../common/readers";
import request from "../common/request";
import { AbortError } from "../common/errors";
import pmpProtobuf from "pmp-protobuf";

const downloadProject = async (buffer, progressCallback, pid = 0) => {
    const controller =
        typeof AbortController === "function" && new AbortController();
    const downloadProject = await import(
        /* webpackChunkName: "downloader" */ "./download-project.js"
    );
    let reject;
    return {
        promise: new Promise((_resolve, _reject) => {
            reject = _reject;

            downloadProject
                .downloadProject(
                    buffer,
                    progressCallback,
                    controller && controller.signal,
                    pid,
                )
                .then((result) => _resolve(result))
                .catch((err) => _reject(err));
        }),

        terminate: () => {
            reject(new AbortError());
            if (controller) {
                controller.abort();
            }
        },
    };
};

const fromURL = async (url, progressCallback, isProtobuf = false, pid = 0) => {
    let buffer = await request({
        url,
        type: "arraybuffer",
        progressCallback: (progress) => {
            progressCallback("fetch", progress);
        },
    });
    if (isProtobuf) {
        // this is very hacky, the stringify & encode disgusts me, but it's a lot easier than forking our own version of sbdl
        buffer = new TextEncoder().encode(
            JSON.stringify(pmpProtobuf.protobufToJson(new Uint8Array(buffer))),
        );
    }
    return downloadProject(buffer, progressCallback, pid);
};

const fromID = (id, progressCallback) => {
    const url = `https://projects.penguinmod.com/api/v1/projects/getproject?projectID=${id}&requestType=protobuf`;
    return fromURL(url, progressCallback, true, id);
};

const fromFile = async (file, progressCallback) => {
    const buffer = await readAsArrayBuffer(file);
    return downloadProject(buffer, progressCallback);
};

export default {
    fromID,
    fromURL,
    fromFile,
};
