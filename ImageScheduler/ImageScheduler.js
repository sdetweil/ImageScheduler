var ImageService=null;
var self1;
Module.register("ImageScheduler",{

							defaults: {
       						"MongoDBLocation": "localhost",
        					"MongoPort": 27017,
									"MongoDBName": "test",
        					"ConfigServerPort": 8099,
									"debug": false
							},
							dbData:{
								ActiveViewers:[],
								ActiveDataSources:[],
								Images:[],
								Tags:[],
								valid:false
							},
							pebusy:false,


							getData: function()
							{
								 if(self1.dbData.valid==false)
								 {
										self1.sendSocketNotification("refreshData",null);
								 }
								 return self1.dbData;
							},
							init: function(){
									Log.log("scheduler in init");
							},
					
							loaded: function(callback){
									Log.log("scheduler in loaded");
									callback();
							},

							start: function(){
									Log.log("scheduler in start");
									self1=this;
							},

							getScripts: function(){
									Log.log("scheduler in getScripts");
									return [
										'moment.js', // this file is available in the vendor folder, so it doesn't need to be available in the module folder.
									]
									return [];
							},
							
							getStyles: function(){
									Log.log("scheduler in getStyles");
									return [];
							},

							getTranslations: function(){
									Log.log("scheduler in getTranslations");
									return null;
							},

							getDom: function(){
									Log.log("scheduler in getDom");
									var wrapper = document.createElement("div");
									wrapper.innerHTML = 'scheduler Hello world!';
									return wrapper;
							},

							getHeader: function(){
									Log.log("scheduler in getHeader");
									return this.data.header + "Scheduler";
							},

							notificationReceived: function(notification, payload, sender){
									if(self1.config.debug){
									Log.log("scheduler in notificationReceived");
								  Log.log("notification='"+notification+"'");
									Log.log("sender="+sender);
										Log.log("payload="+JSON.stringify(payload));
									}
									switch(notification) 
									{									
										case 'ALL_MODULES_STARTED':												
												self1.sendSocketNotification("sched_init", self1.config);
												if(ImageService==null)
												{
                 				   Log.log("initialize node helper pointer");
										
													 MM.getModules().enumerate(function(module) 
													 {
													 		if(module.name.includes('ImageService'))
															{
    														Log.log(module.name);
																ImageService=module;

																var v=ImageService.getViewers();
																Log.log("have viewers list="+v);
																//ImageService.startViewer();
											  			}
														});
												}
										break;
										case "CALENDAR_EVENTS":
												this.processEvents(payload);
										default:
										break;
									}
							},

							socketNotificationReceived: function(notification, payload){
								  if(self1.config.debug){
										Log.log("scheduler in socketNotificationReceived");
										Log.log("notification="+notification);
										Log.log("payload="+JSON.stringify(payload));
									}
									switch(notification) 
									{									
										case "db data":
												this.dbData=JSON.parse(payload);
												if(self1.config.debug)
														Log.log("db data refreshed");
										break;
										default:
										break;
									}

							},

							suspend: function(){
									Log.log("in suspend");
							},

							resume: function(){
									Log.log("in resume");
							},
    tagsfromids: function (ids)
		{
			let setoftags=[]
			let data = this.getData();
			for(let tag of data.Tags)
			{
				for(let id of ids)
				{
						//Log.log("tag comparing tag id="+id +" with "+tag._id);

						if(id==tag._id)
						{
								setoftags.push(tag)
								//Log.log("tag we have matching tag id="+tag._id);
								break;
						}
				}
			}
			return setoftags
		},
		imagesfortags: function(tags)
		{
			let selectedimages=[]
			let data = this.getData();
			for(let image of data.Images)
			{
				byimage:
				for(let itag of image.Tags)
				{
					for(let tag of tags)
					{
						//Log.log("image comparing image tag id="+itag +" with "+tag._id);
						if(tag._id==itag)
						{
								selectedimages.push(image)
								//Log.log("image we have matching tag id="+tag._id);
								break byimage;
						}
					}
				}
			}
			return selectedimages
		},
		containsAny:function (str, Tags) {
			var results = []
			for (let tag of Tags) {				
				 //Log.log("looking for " + tag.value +" in "+str);
				if (str.toLowerCase().indexOf(tag.value.toLowerCase()) !=  - 1) {
					 //Log.log("found tag="+tag.value);
					results.push(tag);
				}
			}
			return results;
		},
		filelist_callback: function()
		{
		},
		Next: function()
		{
		},
		viewerRunning: function(viewerList, Name) {
			let found = null;
			if(viewerList !=null)
			{
				for (let v of viewerList) {
					//Log.log("checking for viewer="+Name+" in "+ v.Name);
					if (typeof v != 'undefined' && (v.Name == Name || v._id == Name)) {
						found = v;
						found.loading=false;
						Log.log("found active viewer "+Name+" in list");
						break;
					}
				}
			}
			return found;
		},
		element: function(source, item)
		{
			this.Source=source;
			this.Image=item;
		},


		processEvents: function (filtered_events) {
			console.log("getting calendar entries");
			if (this.pebusy == false){
				this.pebusy = true;
				let data=this.getData();
				if(self1.config.debug)
       		 Log.log("dbdata="+JSON.stringify(data));
				for (let Viewer of data.ActiveViewers) {
					if (Viewer.Tags.length > 0) {
						//// Log.log(Viewer);
						if(self1.config.debug)
							Log.log("there are " + filtered_events.length + " entries in the selected cal entry data")
						let tagentries=this.tagsfromids(Viewer.Tags)									
						let needed = false
						// is a viewer of this name running already
						let running = null
						for (var i = 0; i < filtered_events.length && needed == false; i++) {
														
							// get the cal entry summary
							var cal_entry_text = filtered_events[i].title;
							// find any matching viewer tags in the summary
							var tags = this.containsAny(cal_entry_text, tagentries); 
							// if we found some tags
							if (tags.length > 0) {
								//// Log.log(filtered_events[i]);
								if(self1.config.debug)
									Log.log("found event with tags for viewer="+Viewer	.Name);
								needed = true;
								// find any image entries with the same tags as the viewer
								let possibleimages=this.imagesfortags(tags)
								// loop thru the image item definitions (usually only one)
								var activeitems = []
								// loop thru each image entry
								for (let image of possibleimages) {
									for (let source of data.ActiveDataSources) {
										if (source._id.toString() === image.DataSource) {
											activeitems.push(new this.element(source,image))
										}
									}
								}
								if (activeitems.length) {
									running = this.viewerRunning(ImageService.getViewers(), Viewer.Name);
									// if this viewer is not already running
									if (running == null) {
										Viewer.items = activeitems.slice();
										// start a viewer
										Viewer.callback = this.filelist_callback;
										Viewer.next = function (x, y) {
											return this.Next(x, y);
										};
										ImageService.startViewer(Viewer)
										if(self1.config.debug)
											Log.log("starting viewer Name="+Viewer.Name);

										running = 1;
										i = tagentries.length // end the loop for this viewer
									} else {
										try {
											if(self1.config.debug)
												Log.log("updating viewer items list");
											// reset the images the viewer should do
											running.Viewer.items = activeitems.slice();
										} catch (ex) 
										{
											// no exception allowed
										}
									}
								} // end of check for matching active data sources
							} // end if tags found
						} // end for filtered cal entries
						// if we didn't find a reason to start a viewer
						// AND
						// one is running
						if (needed == false && running != null  && running.loading==false) {
							// stop it
							try {
								ImageService.cancel(Viewer);
							}
							catch(error){
							}
						}
					}
				}
				this.pebusy = false;
			}
		},


});