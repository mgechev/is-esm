const { exec } = require('child_process');

const getVersionList = (name) => {
  if (!name) return Promise.reject(new Error('Empty name given as argument'));
  return new Promise((resolve, reject) =>
    exec(`npm show ${name} versions --json`, (err, stdout, stderr) => {
      if (err) {
        return reject(
          /Registry returned 404 for GET on|404 Not found|code E404/.test(
            stderr
          )
            ? new Error("The package you were looking for doesn't exist.")
            : err
        );
      }
      return resolve(JSON.parse(stdout));
    })
  );
};

const installCommand = (package, version, prefix) => {
  return `npm install --prefix ${prefix} ${package}@${version}`;
};

const installModules = (packageName, version, tmpDirName) => {
  return new Promise((resolve, reject) => {
    exec(
      installCommand(packageName, version, tmpDirName),
      {
        stdio: ['ignore'],
      },
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
};

module.exports = { getVersionList, installModules };
