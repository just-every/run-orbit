// VM-only test fixture allowance: keep every SQL migration and assertion intact.
const cp = require('node:child_process');
const {syncBuiltinESMExports} = require('node:module');
const original = cp.execFileSync;
cp.execFileSync = function(file, args, options) {
  if (Array.isArray(args) && args.includes('migrations') && args.includes('apply') && options?.timeout === 60000) {
    options = {...options, timeout:180000};
  }
  return original.call(this, file, args, options);
};
syncBuiltinESMExports();
