
var ImageScheduler=null;
var self;
Module.register("ImageService",{
							defaults: {
									"ViewerWidth": 200,
									"ViewerHeight": 300
							},
							ViewerList:[],

							init: function(){
									Log.log("Handler in init");
							},
					
							loaded: function(callback){
									Log.log("Handler in loaded");
									callback();
							},

							getViewers: function(){
									return self.ViewerList;
							},

							start: function(){
									Log.log("Handler in start");
									self=this;

							},

							getScripts: function(){
									Log.log("Handler in getScripts");
									return [
										'moment.js' // this file is available in the vendor folder, so it doesn't need to be available in the module folder.
									]
							},
							
							getStyles: function(){
									Log.log("Handler in getStyles");
									return [];
							},

							getTranslations: function(){
									Log.log("Handler in getTranslations");
									return null;
							},

							getDom: function(){
									Log.log("Handler in getDom");
									var wrapper = document.createElement("div");
									wrapper.innerHTML = 'handler Hello world!';
									return wrapper;
							},

							getHeader: function(){
									Log.log("Handler in getHeader");
									return self.data.header + "Scheduler";
							},

							notificationReceived: function(notification, payload, sender){
									
									//Log.log("payload="+JSON.stringify(payload));
									switch(notification) 
									{
										case 'ALL_MODULES_STARTED':
												if(ImageScheduler==null)
												{
													 Log.log("Handler in notificationReceived");
  												 Log.log("notification='"+notification+"'");
													 Log.log("sender="+sender);
                 				   Log.log("initialize node helper pointer");
										
													 MM.getModules().enumerate(function(module) 
													 {
													 		if(module.name ==='ImageScheduler')
															{
    														Log.log(module.name);
																ImageSeheduler=module;
																self.sendSocketNotification("sched_init", ImageScheduler);
											  			}
														});
														this.config.screen_width=window.innerWidth;
														this.config.screen_height=window.innerHeight;
														this.sendSocketNotification("config", this.config);
												}
										break;
										default:
										break;
									}

							},

							socketNotificationReceived: function(notification, payload){
									Log.log("Handler in socketNotificationReceived");
								  Log.log("notification="+notification);
									Log.log("payload="+JSON.stringify(payload));
									switch(notification)
									{
											case "viewer_started":
												this.ViewerList.push(payload);
												Log.log("viewer started viewer="+payload.Name);
											break;
											case "window_closed":
												Log.log("closing window for viewer="+payload.Name);
												this.remove(this.ViewerList,payload)
											break;
									}
									
							},
							remove: function(arr, item) {
								for (var i = 0; i < arr.length; i++) {
									if (arr[i].Name === item.Name) {
										// log.warn("item removed");
										arr[i].window = null;
										arr.splice(i, 1);
									}
								}
							},

							suspend: function(){
									Log.log("in suspend");
									this.sendSocketNotification("SUSPEND")
							},

							resume: function(){
									Log.log("in resume");
									this.sendSocketNotification("RESUME")
							},
							startViewer: function(Viewer)
							{
									if(Viewer!=null)
										Log.log("service request to start viewer="+Viewer.Name);
									this.sendSocketNotification("START_VIEWER",Viewer);
							},
							cancel: function(Viewer)
							{
									Log.log("service request to stop viewer="+Viewer.Name);
									this.sendSocketNotification("cancel_viewer",Viewer);
							},
							
});
