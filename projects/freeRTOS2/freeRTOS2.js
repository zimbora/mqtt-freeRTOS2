const moment = require('moment');
var mysql = require('mysql2')

const semver = require('semver')
const fs = require('fs');
const path = require('path');

var app = [];

MACRO_UID_PREFIX          = "uid:"

// connectivity
MACRO_WIFI                = "WiFi"
MACRO_LTE                 = "LTE"

// TOPICS
MACRO_TOPIC_FW_SETTINGS   = "fw/settings"
MACRO_TOPIC_APP_SETTINGS  = "app/settings"
MACRO_TOPIC_FOTA_SET      = "fw/fota/update/set"
MACRO_TOPIC_AR            = "/ar"
MACRO_TOPIC_AR_SET        = "/ar/set"
MACRO_TOPIC_ALARM         = "/alarms"
MACRO_TOPIC_ALARM_SET     = "/alarms/set"
MACRO_TOPIC_JS_CODE_SET   = "/js/code/set"
MACRO_TOPIC_JS_CODE       = "/js/code"
MACRO_TOPIC_SETPOINTS_SET = "app/setpoints/set"

// FW KEYS
MACRO_KEY_FW_SETTINGS     = "fw_settings"
MACRO_KEY_FW_VERSION      = "fw_version"
MACRO_KEY_APP_VERSION     = "app_version"
MACRO_KEY_STATUS          = "status"
MACRO_KEY_MODEL           = "model"
MACRO_KEY_AR              = "ar"
MACRO_KEY_ALARM           = "alarms"
MACRO_KEY_JS_CODE         = "js_program"
MACRO_KEY_SETPOINTS       = "setpoints"

// APP KEYS
MACRO_KEY_APP_SETTINGS    = "app_settings"

let topics = { // topics to read
  fw : {
    settings : ["mqtt","keepalive","log"],
    wifi : ["wifi"],
    lte : ["modem"],
    files : ["ar","alarms","js_program"]
  }
}


module.exports = {

  sync_db : async()=>{

    return new Promise( async (resolve,reject) => {

      console.log("[sync_db]","freeRTOS2 module");
      await $.models.init();
      await $.models.connect();
      await $.models.load(__dirname+"/models");

      return resolve();
    });
  },

  init : async ()=>{

    console.log("Project freeRTOS2 started");
    await $.models.load(__dirname+"/models");

    // load projects dbs
    if(fs.existsSync(__dirname+"/apps")){
      fs.readdirSync(__dirname+"/apps")
      .filter((file) => {
        // Exclude any extension file
        return (file.indexOf('.') == -1);
      })
      .forEach((name) => {
        app[name] = {
            module : null
        };

        console.log(`loading ${name} app`);
        try{
          app[name].module = require(__dirname + '/apps/'+name+'/'+name+".js")
          app[name].module.init();
        }catch(e){
          console.log(e);
        }
      });
    }

  },

  parseMessage : async (client, project, device, topic, payload, retain, cb)=>{

    // clean mqtt..
    /*
    if(device.uid.length > 16 && payload != ""){
      topic = project+"/"+device.uid+"/"+topic;
      client.publish(topic,"",{retain:retain},(err)=>{
        if(err) console.log(err);
        return cb();
      })
    }
    */
    // The next two lines updates dB with received data
    await $.db_data.update(project,device?.id,topic,payload);
    await $.db_data.addLog("logs_"+project,device.id,topic,payload);


    if(topic.startsWith("records") && payload != ""){
      topic = project+"/"+device.uid+"/"+topic;
      client.publish(topic,"",{retain:retain},(err)=>{
        if(err) console.log(err);
        return cb();
      })
    }
    // get device configuration
    if(topic == "model"){
      checkConfigs(project,device.uid,payload,client);
    }

    switch(topic){
      case 'fw_version':{
        console.log(project,device.uid,"fw version: ",payload);
        checkDeviceFWVersion(device.uid,(err,dev,fw)=>{
          if(err) console.log(err);
          else if(fw != null){
            console.log("update: "+device.uid+ " fw for:",fw.fw_version);
            let topic = dev.project+"/"+device.uid+ "/" +MACRO_TOPIC_FOTA_SET;
            let payload = {
              url : $.config.web.protocol+$.config.web.domain+$.config.web.fw_path+fw.filename+"/download?token="+fw.token
            }
            client.publish(topic,JSON.stringify(payload),(err)=>{
              if(err) console.log(err)
            })
          }
        });

        break;
      }
      case 'app_version':{
        console.log(project,device.uid,"app version: ",payload);
        checkDeviceAppVersion(device.uid,(err,dev,fw)=>{
          if(err) console.log(err);
          else if(fw != null){
            console.log("update "+device.uid+" app for:",fw);
            let topic = dev.project+"/"+device.uid+"/"+MACRO_TOPIC_FOTA_SET;
            let payload = {
              url : $.config.web.protocol+$.config.web.domain+$.config.web.fw_path+fw.filename+"/download?token="+fw.token
            }
            client.publish(topic,JSON.stringify(payload),(err)=>{
              if(err) console.log(err)
            })
          }
        });

        break;
      }
    }


    if(topic.startsWith("fw/")){

      let index = topic.indexOf("/");
      topic = topic.substring(index+1);

      // adds new configurations set by user
      if(topic.endsWith("/set")){
        if(payload == "" || payload == null)
          return cb();
        let index = topic.indexOf("/");
        let field = topic.substring(0,index);
        topic = topic.substring(index+1);
        if(topic == "set"){
          $.db_data.update(project,device.id,field,payload);
        }else{
          index = topic.indexOf("/");
          let key = topic.substring(0,index);
          let data = {}
          data[key] = payload;
          let filter = {
            device_id : device.id
          };

          $.db.updateJSON(project,field,data,filter)
          .catch( err =>{
            console.error(err);
          })

        }

      }else{

        // check received configurations from device
        let column = topic;
        let key = "";
        let index = column.indexOf('/');
        if(index > -1){
          column = topic.substring(0,index);
          key = topic.substring(index+1);
        }

        switch(column){
          case 'settings':{

            if(key.indexOf('/') > -1)
              break;

            let dev_ref = await $.db.getFieldFromDeviceId(project,device.id,"settings_ref");
            let device_id = dev_ref != null ? dev_ref : device.id;
            let stored = await $.db.getPropertyFromDeviceId(project,device_id,column,key);
            if( (stored == null || stored == "") && device_id == device.id ){
              let data = {};
              data[key] = payload;
              let filter = {
                device_id : device.id
              };
              $.db.updateJSON(project,column,data,filter)
            }
            updateFwSetting(client, project, device.uid, column+"/"+key, stored, payload);
            break;
          }
          case 'js':{
            let dev_ref = await $.db.getFieldFromDeviceId(project,device.id,"js_program_ref");
            let device_id = dev_ref != null ? dev_ref : device.id;
            let stored = await $.db.getFieldFromDeviceId(project,device_id,"js_program");
            try{
              res = await checkMD5(project,device.uid,MACRO_KEY_JS_CODE,payload);
              if(res){
                topic += "/set";
                client.publish(topic,res,(err)=>{
                  if(err) console.log(err)
                })
              }
            }catch(err){console.log(err);}
            break;
          }
          case 'ar' : {
            let dev_ref = await $.db.getFieldFromDeviceId(project,device.id,"ar_ref");
            let device_id = dev_ref != null ? dev_ref : device.id;
            let stored = await $.db.getFieldFromDeviceId(project,device_id,"ar");
            try{
              res = await checkMD5(project,device.uid,'ar',payload);
              if(res){
                topic += "/set";
                client.publish(topic,res,(err)=>{
                  if(err) console.log(err)
                })
              }
            }catch(err){console.log(err);}
            break;
          }
          case 'alarm':{
            let dev_ref = await $.db.getFieldFromDeviceId(project,device.id,"alarms_ref");
            let device_id = dev_ref != null ? dev_ref : device.id;
            let stored = await $.db.getFieldFromDeviceId(project,device_id,"alarms");
            try{
              res = await checkMD5(project,device.uid,MACRO_KEY_AR,payload);
              if(res){
                topic += "/set";
                client.publish(topic,res,(err)=>{
                  if(err) console.log(err)
                })
              }
            }catch(err){console.log(err);}
            break;
          }

        }

      }

    }

    if(topic.startsWith("app/")){
      topic = topic.substring(4);
      let index = topic.indexOf("/");

      let app_name = "";
      if(index > -1) app_name = topic.substring(0,index);
      else  return cb();

      topic = topic.substring(index+1);
      if(app[app_name]){
        $.db_data.addLog("logs_"+app_name,device.id,topic,payload);
        try{
          app[app_name].module.parseMessage(client, device, topic, payload, ()=>{});
        }catch(e){
          console.log(e);
        }
      }
    }

  },
}

async function checkConfigs(project,uid,payload,client){
  if(payload.includes(MACRO_WIFI)){
    // check db configs
    topics.fw.wifi.forEach(async(item, i) => {
      await getFWConfig(project,uid,item,client);
    });
  }else if(payload.includes(MACRO_LTE)){
    // check db configs
    topics.fw.lte.forEach(async(item, i) => {
      await getFWConfig(project,uid,item,client);
    });
  }

  topics.fw.settings.forEach(async(item, i) => {
    setTimeout(async ()=>{
      await getFWConfig(project,uid,item,client);
    },i*5000);
  });


  topics.fw.files.forEach(async(item, i) => {
    setTimeout(async ()=>{
      await getMD5File(project,uid,item,client);
    },30000+i*5000);
  });
}

async function getMD5File(project,uid,filename,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/fw/"+filename+"/get";
    let payload = "";
    client.publish(topic,payload,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function checkMD5(project,device,field,payload){

    return new Promise(async(resolve,reject) => {
      if(payload == null || payload == "") resolve(null);

      try{
        payload = JSON.parse(payload)
      }catch(err){reject(err);}

      if(!payload.hasOwnProperty("md5"))
        resolve();

      try{
        res = await $.db.getFieldFromDeviceId(project,device.id,field);
        if(res != "" && res != null){
          if($.md5(res) == payload.md5){
            resolve(null)
          }
          else{
            console.log("update file {} for uid {}",field,device.uid);
            resolve(res);
          }
        }
      }catch(err){reject(err);}
    });
  }

async function getFWConfig(project,uid,property,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/fw/settings/"+property+"/get";
    let payload = "";
    client.publish(topic,payload,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function getAppConfig(project,uid,property,client){
  return new Promise((resolve,reject)=>{
    let topic = project+"/"+uid+"/app/settings/"+property+"/get";
    let payload = "";
    client.publish(topic,payload,(err)=>{
      if(err) return reject(err)
      else return resolve();
    })
  })
}

async function checkDeviceFWVersion(uid,cb){
  let res = null;
  let update = false;
  let err = null;

  let fw_version = "";
  let db_fw_version = "";
  let project = null;
  let model = null;

  try{ device = await $.db_device.get(uid)}
  catch(err){ console.log(err);}

  try{ project = await $.db_project.getById(device.project_id)}
  catch(err){ console.log(err);}

  try{ model = await $.db_model.getById(device.model_id)}
  catch(err){ console.log(err);}

  if(project == null || model == null || project.fw_version == null)
    return cb(null,null,null);

  try{ latestfw_version = await getLatestFwVersion(model.name,project.fw_release)}
  catch(err){ return cb(err,null,null);}

  if(latestfw_version == null)
    return cb(null,null,null);

  try{
    let arr_fw_version = project.fw_version.split(".");
    arr_fw_version.forEach((item, i) => {
      if(i==0)
        fw_version = Number(item);
      else
        fw_version += "."+Number(item);
    });
  }catch(e){
    return cb(e,null,null);
  }

  try{
    let arr_version = latestfw_version.fw_version.split(".");
    arr_version.forEach((item, i) => {
      if(i==0)
        db_fw_version = Number(item);
      else
        db_fw_version += "."+Number(item);
    });
  }catch(e){
    return cb(e,null,null);
  }

  if(!semver.valid(fw_version)){
    let error = "fw_version not valid: "+fw_version;
    return cb(error,null,null);
  }
  //rows[0].version = semver.clean(rows[0].version)
  if(!semver.valid(db_fw_version)){
    let error = "db_fw_version not valid: "+db_fw_version;
    return cb(error,null,null);
  }

  try{
    if(semver.lt(fw_version, db_fw_version)){
      console.log("fw update version for device:",uid)
      return cb(null,device,latestfw_version);
    }else{
      return cb(null,device,null);
    }
  }catch(e){
    console.log(e)
    return cb(e,null,null);
  }
}

async function checkDeviceAppVersion(uid,cb){
  let res = null;
  let update = false;
  let err = null;

  let app_version = "";
  let db_app_version = "";
  let project = null;
  let model = null;

  try{ device = await $.db_device.get(uid)}
  catch(err){ console.log(err);}

  try{ project = await $.db_project.getById(device.project_id)}
  catch(err){ console.log(err);}

  try{ model = await $.db_model.getById(device.model_id)}
  catch(err){ console.log(err);}

  if(project == null || model == null || project.app_version == null)
    return cb(null,null,null);

  try{ latestapp_version = await getLatestAppVersion(model.name,project.app_release)}
  catch(err){ return cb(err,null,null);}

  if(latestapp_version == null)
    return cb(null,null,null);

  try{
    let arr_app_version = project.app_version.split(".");
    arr_app_version.forEach((item, i) => {
      if(i==0)
        app_version = Number(item);
      else
        app_version += "."+Number(item);
    });
  }catch(e){
    return cb(e,null,null);
  }

  try{
    let arr_version = latestapp_version.app_version.split(".");
    arr_version.forEach((item, i) => {
      if(i==0)
        db_app_version = Number(item);
      else
        db_app_version += "."+Number(item);
    });
  }catch(e){
    return cb(e,null,null);
  }

  if(!semver.valid(app_version)){
    let error = "app_version not valid: "+app_version;
    return cb(error,null,null);
  }
  //rows[0].version = semver.clean(rows[0].version)
  if(!semver.valid(db_app_version)){
    let error = "db_app_version not valid: "+db_app_version;
    return cb(error,null,null);
  }

  try{
    if(semver.lt(app_version, db_app_version)){
      console.log("app update version for device:",uid)
      return cb(null,device,latestapp_version);
    }else{
      return cb(null,device,null);
    }
  }catch(e){
    console.log(e)
    return cb(e,null,null);
  }
}

async function getLatestFwVersion(model,release){

  return new Promise( async (resolve,reject) => {

    let modelId = 0;
    let res = null;
    try{ res = await $.db_model.getByName(model)}
    catch(err){ console.log(err);}

    if(res == null)
      return resolve(null);

    try{
      console.log(res);
      modelId = res.id;
      let lastestfw = await $.db_firmware.getLatestFWVersion(modelId,release)
      return resolve(lastestfw);
    }catch(err){
      console.log(err);
      return resolve(null);
    }
  });
}

async function getLatestAppVersion(model,release){

  return new Promise( async (resolve,reject) => {

    let modelId = 0;
    let res = null;
    try{ res = await $.db_model.getByName(model)}
    catch(err){ console.log(err);}

    if(res == null)
      return resolve(null);

    try{
      console.log(res);
      modelId = res[0].id;
      let latestfw = await $.db_firmware.getLatestAppVersion(modelId,release)
      return resolve(latestfw);
    }catch(err){
      console.log(err);
      return resolve(null);
    }
  });
}

async function updateFwSetting(client,project,uid,setting,data,payload){
  return new Promise((resolve,reject)=>{

    if(data == null || data == "")
      return resolve();

    if(md5(data) == md5(payload))
        return resolve();

    let topic = project+"/"+uid+"/"+"fw"+"/"+setting+"/set";
    client.publish(topic,data,(err)=>{
      if(err) console.log(err)
      return resolve();
    })
  })
}
