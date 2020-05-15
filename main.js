const tmp = require("tmp");
const { join } = require("path");
const { writeFileSync } = require("fs");
const { execSync } = require("child_process");

const { rollup } = require("rollup");
const nodeResolve = require("@rollup/plugin-node-resolve");

const ora = require("ora");
const rimraf = require("rimraf");

const utils = require("./npm-utils");

const getPackageVersion = async (packageName, version) => {
  let versions = [];
  try {
    versions = await utils.getVersionList(packageName);
  } catch (e) {
    throw new Error(e.message);
  }
  if (!version) {
    version = versions[versions.length - 1];
  }
  let found = false;
  for (const v of versions) {
    if (v === version) {
      found = true;
      break;
    }
  }
  if (found) {
    return version;
  }
  return undefined;
};

const initializeTempDir = (packageName, indexName) => {
  const tmpDir = tmp.dirSync();
  writeFileSync(join(tmpDir.name, "package.json"), '{ "name": "is-esm" }');

  const entryFile = join(tmpDir.name, indexName);
  writeFileSync(
    entryFile,
    `import * as isesm from "${packageName}";\nconsole.log(iesm);\n`
  );

  return tmpDir.name;
};

const installModules = (packageName, version, tmpDirName) => {
  execSync(utils.installCommand(packageName, version, tmpDirName), {
    stdio: ["ignore"],
  });
};

const checkESM = async (packageName, entryFile) => {
  let isESM = false;

  function moduleExists(packageName) {
    return {
      name: "module-exists",
      load(id) {
        if (id.indexOf(join("node_modules", packageName)) >= 0) {
          isESM = true;
        }
      },
    };
  }

  await rollup({
    input: entryFile,
    output: "out.js",
    onwarn() {},
    plugins: [
      nodeResolve({
        modulesOnly: true,
      }),
      moduleExists(packageName),
    ],
  });

  return isESM;
};

module.exports = async (packageName, version) => {
  const spinner = ora({ stream: process.stdout });
  spinner.text = `Fetching ${packageName}`;
  spinner.start();

  let userVersion = version;
  try {
    version = await getPackageVersion(packageName, version);
  } catch (e) {
    spinner.fail(
      `Unable to fetch the package ${packageName} stats: ${e.message}`
    );
    process.exit(0);
  }

  if (!version) {
    spinner.fail(`Unable to find version ${userVersion} of ${packageName}`);
    process.exit(0);
  }
  spinner.text = `Fetching ${packageName}@${version}...`;

  const indexName = "index.js";
  const tmpDirName = initializeTempDir(packageName, indexName);

  try {
    installModules(packageName, version, tmpDirName);
  } catch (e) {
    spinner.fail("Unable to fetch the package");
    process.exit(0);
  }

  const entryFile = join(tmpDirName, indexName);

  try {
    if (await checkESM(packageName, entryFile)) {
      spinner.succeed("Yes");
    } else {
      spinner.warn("No");
    }
  } catch {
    spinner.fail("Unable to detect the module format");
    process.exit(0);
  }

  rimraf.sync(tmpDirName);
};
