var models_name = ["DEMO"];
var model_table = "DEMO";
var model_logs_table = "logs_DEMO";

module.exports = {

  init : async()=>{
    console.log("App DEMO from project freeRTOS2 started");

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
