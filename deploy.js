const config = require('./config');
const fs = require('fs');

global.BASE_DIR = process.cwd();
var projectsPath = global.BASE_DIR+'/projects/';

//const packageJson = require(__dirname+'/package.json');
//const packageVersion = packageJson.version;

global.parser;
var parserDirectory;

var projects = [];

if(config.env == "development"){
  console.log("load ../modules/mqtt-devices-parser");
  parser = require('../modules/mqtt-devices-parser');
}else{
  parser = require('mqtt-devices-parser');
}


fs.readdirSync(projectsPath)
.filter((file) => {
  return (file.indexOf('.') == -1);
})
.forEach((project) => {
  console.log(`config.projects[${project}]:`,config.projects[project])
  if(config.projects[project])
    projects.push(project);
});


parser.deploy(config,projectsPath);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // exit with failure code
  if($.config.dev)
    process.exit(1);
});
