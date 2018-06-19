var Promise = require('bluebird');
var exec = require('child_process').exec;
var os = require('os');
var path = require('path');
var app_dir = path.dirname(require.main.filename);
var cwd_dir = path.resolve(process.cwd());
var logger = require(app_dir+'/lib/helper/logger.js');

logger.debug('checking os plaform');
var terraform_bin = 'terraform';
if(os.platform() == 'win32'){
  logger.debug('It is win32, use terraform.exe');
  terraform_bin = '' + terraform_bin + '';
}


var mod_exports = {
  get: function(id) {
    logger.debug('get terraform '+id);
    return new Promise(function(resolve, reject) {
      exec(cwd_dir + '/bin/' + terraform_bin + ' get', {
        cwd: cwd_dir + '/data/' + id + '/workspace'
      },
      function(error, stdout, stderr) {
        if (error) {
          logger.error('exec error: ' + error+ ' / '+stderr);
          reject(error);
        }
        logger.debug(stdout);
        resolve();
      });
    });
  },
  plan: function(id, vars) {
    logger.debug('plan terraform '+id);
    var vars_param = '';
    for (var key in vars) {
      vars_param += ' -var ' + key + '=' + vars[key];
    }
    //console.log(cwd_dir+'/bin/' + terraform_bin + ' plan -out=terraform.tfplan' + vars_param);
    return new Promise(function(resolve) {
      exec(cwd_dir + '/bin/' + terraform_bin + ' plan -input=false -no-color -state=../terraform.tfstate' + vars_param, {
        cwd: cwd_dir + '/data/' + id + '/workspace'
      },
      function(error, stdout, stderr) {
        var result = {};
        if (error) {
          logger.error('Faild to plan terraform, error: ' + error);
          result = {
            valid: false,
            text: stderr
          };
        } else {
          // set 0,0,0 if all is up to date
          if (stdout.indexOf('No changes. Infrastructure is up-to-date.') > -1) {
            result = {
              valid: true,
              add: 0,
              change: 0,
              destroy: 0,
              changes_needed: false
            };
          } else {
            var result_temp = stdout.match(/([0-9]{1,3}) to add, ([0-9]{1,3}) to change, ([0-9]{1,3}) to destroy/);
            result = {
              valid: true,
              add: parseInt(result_temp[1]),
              change: parseInt(result_temp[2]),
              destroy: parseInt(result_temp[3]),
              changes_needed: true
            };
          }
          // Replace ctrl letter
          //result.text = stdout.replace(/[\u001b]\[[0-9]{1,3}m/g,'');
          result.text = stdout;
        }
        resolve(result);
      });
    });
  },
  apply: function(id, vars) {
    logger.debug('apply terraform '+id);
    var vars_param = '';
    for (var key in vars) {
      vars_param += ' -var ' + key + '=' + vars[key];
    }
    //console.log(cwd_dir + '/bin/' + terraform_bin + ' apply' + vars_param);
    return new Promise(function(resolve) {
      exec(cwd_dir + '/bin/' + terraform_bin + ' apply -input=false -no-color -state=../terraform.tfstate' + vars_param, {
        cwd: cwd_dir + '/data/' + id + '/workspace'
      },
      function(error, stdout, stderr) {
        var result = {};
        if (error) {
          logger.error('Faild to apply terraform, error: ' + error);
          result = {
            valid: false,
            text: stderr
          };
        } else {
          var result_temp = stdout.match(/([0-9]{1,3}) added, ([0-9]{1,3}) changed, ([0-9]{1,3}) destroyed/);
          result = {
            valid: true,
            add: parseInt(result_temp[1]),
            change: parseInt(result_temp[2]),
            destroy: parseInt(result_temp[3])
          };
        }
        // Replace ctrl letter
        //result.text = stdout.replace(/[\u001b]\[[0-9]{1,3}m/g,'');
        result.text = stdout +'\n\n' + stderr;
        resolve(result);
      });
    });
  }
};

module.exports = mod_exports;
