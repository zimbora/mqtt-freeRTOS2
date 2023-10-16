var models_name = ["HH_GW_WIFI","HH_GW_LTE"];
var model_table = "HH";
var model_logs_table = "logs_HH";

module.exports = {

  init : async()=>{
    console.log("App HH from project freeRTOS2 started");

    models_name.forEach(async(model_name)=>{
      let res = await $.db_model.getByName(model_name);
      let model_id = res?.id;

      if(model_id == null) $.db_model.insert(model_name,model_table,model_logs_table);
    })

  },

  parseMessage : async (client,app,device,topic,payload,retain,cb)=>{

    $.db_data.update(model_table,device.id,topic,payload);
    $.db_data.addLog(model_logs_table,device.id,topic,payload);

  }
}
