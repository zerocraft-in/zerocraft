const fs = require("node:fs");
const fsPromises = require("node:fs/promises");

const isDirectory = (value) => {
  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
};

const isRecoverableMkdirError = (error, value) =>
  (error?.code === "EPERM" || error?.code === "EEXIST") && isDirectory(value);

const waitBriefly = (milliseconds) => {
  const shared = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(shared), 0, 0, milliseconds);
};

const originalMkdirSync = fs.mkdirSync.bind(fs);
fs.mkdirSync = (value, options) => {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return originalMkdirSync(value, options);
    } catch (error) {
      lastError = error;
      if (isRecoverableMkdirError(error, value)) return undefined;
      if (error?.code !== "EPERM") throw error;
      waitBriefly(25);
    }
  }
  throw lastError;
};

const originalMkdir = fs.mkdir.bind(fs);
fs.mkdir = (value, options, callback) => {
  const cb = typeof options === "function" ? options : callback;
  const mkdirOptions = typeof options === "function" ? undefined : options;
  let attempts = 0;
  const retry = () => originalMkdir(value, mkdirOptions, (error, createdPath) => {
    if (!error) return cb(null, createdPath);
    if (isRecoverableMkdirError(error, value)) return cb(null, createdPath);
    if (error.code === "EPERM" && attempts++ < 20) return setTimeout(retry, 25);
    cb(error, createdPath);
  });
  retry();
};

const originalPromiseMkdir = fsPromises.mkdir.bind(fsPromises);
fsPromises.mkdir = async (value, options) => {
  let attempts = 0;
  while (true) {
    try {
      return await originalPromiseMkdir(value, options);
    } catch (error) {
      if (isRecoverableMkdirError(error, value)) return undefined;
      if (error?.code !== "EPERM" || attempts++ >= 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
};

fs.promises.mkdir = fsPromises.mkdir;
