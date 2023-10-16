# APP

## Add model

1. Create a folder inside apps with model's name
2. Create a file inside previous folder with the same name
	ex: demo/demo.js
3. Create a module inside previous file at least with the following structure

```
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
```

4. If you prentend to have a dedicated tables to this model you can build 2 tables inside models folder:
	- DEMO.models.js
	- logs_DEMO.models.js

Inside these files define the fields that you pretend to store.
If an mqtt message matches those fields the values will be updated for DEMO.models.js and inserted for logs_DEMO.models.js

!! Note: Replace DEMO with the name of your app

