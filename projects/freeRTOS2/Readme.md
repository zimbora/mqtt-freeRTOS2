
# Project freeRTOS2
	:project = freeRTOS2

## Device
	:uid = uid:001122aabbcc

### Device status
	:project/:uid/status

	online/offline

### Device model
	:project/:uid/model

	available models can be listed inside apps folder.
	A model is available if a folder with model's name is available inside apps folder

### Device fw_version
	:project/:uid/fw_version

	firmware version (main firmware) xx.yy.zz

### Device app_version
	:project/:uid/app_version

	app version (model package) xx.yy.zz

### Device uptime
	:project/:uid/uptime

	in seconds

### Device configurations

If a client writes on topics :project/:uid/fw/settings or :project/:uid/app/settings that data will be stored in database. If this written is made by a device, the data will be only stored if there's no data in db. In the other hand, if the there is data in db and that data is different from the one that device sent, this service will try to update the device, keeping it synced.\
The exception is for WIFI ssid and password, topic :project/:uid/fw/settings/wifi. The device has always control over this topic, yet it can accept changes when it is connected.

#### Device fw settings

##### Device fw settings mqtt
	:project/:uid/fw/settings/mqtt
	:project/:uid/fw/settings/mqtt/get
	:project/:uid/fw/settings/mqtt/set

	{
		"host":"",
		"user":"",
		"pass":"",
		"prefix":"",
		"port":,
		"active":
	}

##### Device fw settings keepalive
	:project/:uid/fw/settings/keepalive
	:project/:uid/fw/settings/keepalive/get
	:project/:uid/fw/settings/keepalive/set

	{
		"period":900
	}

##### Device fw settings log
	:project/:uid/fw/settings/log
	:project/:uid/fw/settings/log/get
	:project/:uid/fw/settings/log/set

	{
		"level":
	}

#### Device fw wifi
	:project/:uid/fw/settings/wifi
	:project/:uid/fw/settings/wifi/get
	:project/:uid/fw/settings/wifi/set

	{
		"ssid":"",
		"pwd":""
	}

#### Device fw modem
	:project/:uid/fw/settings/modem
	:project/:uid/fw/settings/modem/get
	:project/:uid/fw/settings/modem/set

	{
		"apn":"",
		"user":"",
		"pwd":"",
		"band":,
		"cops":,
		"tech":
	}

#### Device FOTA
	:project/:uid/fw/fota
	:project/:uid/fw/fota/set

	{
		url:"protocol://:domain/:path/:filename/download?token=:token"
	}

#### Device Autorequests
	:project/:uid/fw/ar
	:project/:uid/fw/ar/get -> get md5 file
	:project/:uid/fw/ar/set -> send file with md5 on header

#### Device Alarms
	:project/:uid/fw/alarm
	:project/:uid/fw/alarm/get -> get md5 file
	:project/:uid/fw/alarm/set -> send file with md5 on header

#### Device JS Code
	:project/:uid/fw/js/code
	:project/:uid/fw/js/code/get -> get md5 file
	:project/:uid/fw/js/code/set -> send file with md5 on header

#### Device app settings
	:project/:uid/app/settings


