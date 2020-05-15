const main = require('./main');

const packageName = process.argv[2];
const version = process.argv[3];
main(packageName, version);
