//const remote= require('electron').BrowserWindow
const BrowserWindow = require('electron').BrowserWindow
var NodeHelper = require("node_helper");
var path = require('path');
var self=null;
module.exports = NodeHelper.create({
							vars: {
								foo:  "foo",
								bar: "bar1",
							},
							defaults: {
									"ViewerWidth": 400,
									"ViewerHeight": 300
							},
							ViewerList: [],

						  SCREEN_W : -1,
							SCREEN_H : -1,							

							windowlist : [],
							refresh_interval : 1,
							resolvers:{},
							modules:{'file':null,'DropBox':null,'GoodDrive':null,'OneDrive':null},
							waiting : false,


							busy : false,
							loading: false,

							timeractve : null,

							init: function(){
									console.log("handler helper in init");
							},
					
							start: function(){
									console.log("handler helper in start");
									self=this
							},
				
							stop: function(){
									console.log("handler helper in stop");
							},
							
							
							
							remove: function(arr, item) {
								for (var i = 0; i < arr.length; i++) {
									if (arr[i] === item) {
										console.log("item removed ="+i);
										arr[i].window = null;
										arr.splice(i, 1);
										break;
									}
								}
							},

							viewerRunning: function(viewerList, Name) {
								let found = null;
								if(viewerList !=null)
								{
									for (let v of viewerList) {
										//console.loglog("checking for viewer="+Name+" in "+ v.Name);
										if (typeof v != 'undefined' && (v.viewer.Name == Name || v.viewer._id == Name)) {
											found = v;
											found.loading=false;
										//console.log("found active viewer "+Name+" in list");
										break;
										}
									}
								}
								return found;
							},


							socketNotificationReceived: function(notification, payload)
							{
									console.log("handler helper in socketNotificationReceived");
								  console.log("notification="+notification);
									console.log("payload="+JSON.stringify(payload));
									switch(notification)
									{
									 case 'sched_init':
										console.log("sched_init received in handler helper");
										self.sendSocketNotification(notification+" completed",null);
										console.log("foo="+self.vars.foo+" bar="+self.vars.bar);
										break;

									 case 'cancel_viewer':
											self.cancel(payload);
											self.sendSocketNotification("window_closed",payload);
											break;
											
									 case "close_window":
											
											let v=self.viewerRunning(self.ViewerList,payload.Name);
											if (v.window != null) {
												// remove any close listeners							
												v.window.removeAllListeners('closed');
												// close it
												try {
													// console.logwarn("closing old window");
													v.window.close();
												} catch (e) {
												// console.logwarn("window close failed="+ex);
												}
											}
											self.remove(self.ViewerList,v);
											self.sendSocketNotification("window_closed",payload);
											break;

									 case 'START_VIEWER':
											self.startViewer(payload);
										  self.sendSocketNotification("viewer_started", payload);
										break;										
								}
							},



							valueInRange: function(value, min, max) {
								// send back the size to adjust or 0 if not in range (same as false)
								return ((value >= min) && (value <= max)) ? max - value : 0;
							},

							rectOverlap: function(A, B) {
								// get the X overlap if any
								let xOverlap = self.valueInRange(A.x, B.x, B.x + B.width) ||
									self.valueInRange(B.x, A.x, A.x + A.width);

								// get the Y overlap if any
								let yOverlap = self.valueInRange(A.y, B.y, B.y + B.height) ||
									self.valueInRange(B.y, A.y, A.y + A.height);
								// return values, not boolean
								return {
									xdiff: xOverlap,
									ydiff: yOverlap
								};
							},
		
							checkWindowOverlap: function(viewerinfo, new_x, new_y) {
								// setup return value if no changes required
								let info = {
									x: new_x,
									y: new_y
								}
								// assume the new wndow pos will be changed, get into the loop
								let changed = true;
								do {
									// assume position hasn't been canged
									changed = false;
									// loop thru all the windows in the list
									for (let viewer of self.ViewerList) {
										// exclude the window we are calculating for
										if (viewer.window != viewerinfo.window) {
											// console.logwarn("processing for other window at " +viewer.config.x+","+viewer.config.y);
											// other window in the list for overlap detection
											let theirRect = {
												x: viewer.config.x,
												y: viewer.config.y,
												width: viewer.config.width,
												height: viewer.config.height
											}

											// retry counter
											for (var o = 1; ; o++) {
												// our window info for overlap detection
												let ourRect = {
													x: new_x,
													y: new_y,
													width: viewerinfo.config.width,
													height: viewerinfo.config.height
												}
												// get the overlap info, if any
												let diffs = self.rectOverlap(ourRect, theirRect);
													// console.logwarn("diffs x="+ diffs.xdiff +" y="+diffs.ydiff)
													// if there is (either coordiante diff >0 is overlap), attempt to adjust position to prevent overlap
													if (diffs.xdiff > 0 && diffs.ydiff > 0) {
														// console.logwarn("windows overlap");
														// if 1st or second time thru the loop
														if (o <= 1) {
															//console.log("1st time calc");
															// adjust x first (left amount to eliminate overlap)
															if (diffs.xdiff < diffs.ydiff && self.SCREEN_W > self.SCREEN_H) 
																new_x = Math.max(new_x - diffs.xdiff, 0) 
															else
																// adjust y (up amount to eliminate overlap)
																new_y = Math.max(new_y - diffs.ydiff, 0)
														} else {
															//console.log("NOT 1st time calc");
															if (o < 10) {
																//console.log("trying for the "+o+"th time");
																// if we tried already twice and are stuck, in the corner at 1/2 window size (x and y)
																if (new_x < viewerinfo.config.width / 2 && new_y < viewerinfo.config.height / 2) {
																	// then force a wild change, middle of the screen
																	new_y = self.SCREEN_H / 2
																		new_x = self.SCREEN_W / 2
																	//console.log("new adjustment");
																} else {
																	// force one dimension to edge)
																	//console.log("forcing position");
																	// already left
																	if (new_x == 0){
																		// move up
																		new_y = 0 
																		//console.log("force Y position = 0");
																	}
																	else {
																		// already up, move left
																		new_x = 0
																		//console.log("force X position = 0");
																	}
																}
															} else {
																//console.log("break out of loop, can't resolve");
																changed = false;
																break;
															}
														}
														// setup for return
														info = {
															x: new_x,
															y: new_y
														}
														// say we've changed the data from what was provided
														changed = true
														//console.log("have new position, recheck");
													} else {
														changed = false;
														//console.log("diffs 0, no overlap ");
														// diffs both 0, so no overlap
														break;
													}
											}
										}
									}
								} while (changed == true)

								return info
							},

							worker: function(window, viewer)
							{
								this.oldwindow=window;
								this.viewerinfo=viewer;
							} ,
					
							window_loaded:function(c)
							{
								//console.log("have window to process after load");
			
							//	c.viewerinfo.window.webContents.once('dom-ready', () => {
								// resize the new window
								try {
										console.log("window resize url="+c.viewerinfo.url);
										c.viewerinfo.window.webContents.executeJavaScript(`if (document.images[0]) {window.resizeTo(Math.min(document.images[0].width,window.innerWidth), Math.min(document.images[0].height,window.innerHeight));}`)
										/*	.then((result)=>{
												console.log("javacsript completed result="+result);		
											})
											.catch((error)=> {
												console.log("javascript resize failed="+error);
											}) */
//										);	
										// force repaint after resize
										c.viewerinfo.window.webContents.invalidate();
								} catch (ex) { 
										console.log("window resize failed="+ex);
								}


								//console.log("old window elapsed="+((Date.now()-c.viewerinfo.show)/1000)+" cycle time="+c.viewerinfo.refreshIntervalSeconds);
								//console.log("showing window now");

								// make the window visible
								c.viewerinfo.show =  Date.now(); //--------- new to find the Date module
								c.viewerinfo.window.show()
								c.viewerinfo.loading=false;
								self.loading=false;
								c.viewerinfo.lastUpdate = Date.now()  //------ need to find the Date module
								// if old window exists
								if (c.oldwindow != null) {
										//console.log("hiding old window");
										c.oldwindow.webContents.invalidate();
										c.oldwindow.hide();
								}
								else {
									//console.log("old window is null");
									;
								}

								// if old window exists
								if (c.oldwindow != null) {
									// remove any close listeners							
									c.oldwindow.removeAllListeners('closed');
									// close it
									try {
										//console.log("closing old window");
										c.oldwindow.close();
									} catch (e) {
										//console.log("window close failed="+ex);
										;
									}
								}
//})
							},
					
							moveWindow:function(image_url, viewerinfo) {
								
								try {
									let window = viewerinfo.window;
									//  get the current window size
									let winsize = window.getSize();
									// and position
									//var winpos  = window.getPosition();

									// calculate new window position
									let new_x = (self.rand() % (self.SCREEN_W - winsize[0] * 2)) + winsize[0];
									let new_y = (self.rand() % (self.SCREEN_H - winsize[1] * 2)) + winsize[1];
									// calculate the movement delta
									viewerinfo.dx = self.rand() % 2 * 2 - 1; //-1 or 1
									viewerinfo.dy = self.rand() % 2 * 2 - 1;

									// set new origin
									new_x += viewerinfo.dx;
									new_y += viewerinfo.dy;
									// if we are offscreen, se the next adjustments to correct
									if (new_y <= winsize[1] || new_y >= self.SCREEN_H - winsize[1])
										viewerinfo.dy *= -1;
									if (new_x <= winsize[0] || new_y >= self.SCREEN_W - winsize[0])
										viewerinfo.dx *= -1;
					//console.log("getting window position");
									// if there other windows we might overlap
									if (self.ViewerList.length > 1) {
										// check and adjust the proposed new position to avoid overlap
										let info = self.checkWindowOverlap(viewerinfo, new_x, new_y);
										new_x = info.x;
										new_y = info.y;
									}
					//console.log("have window position");				
									let wconfig = {
										width: viewerinfo.config.width,
										height: viewerinfo.config.height,
										x: new_x,
										y: new_y
									}
									// save the config
									viewerinfo.config = wconfig
									// get the current window object
									let oldwindow = viewerinfo.window

									// create the window, in new position, hidden
									viewerinfo.window = new BrowserWindow({
										width: viewerinfo.config.width,
										height: viewerinfo.config.height,
										x: new_x,
										y: new_y,
										alwaysOnTop: true,
										show:false,
										//transparent: true,
										backgroundColor: '#000000',
										dx: 0,
										dy: 0,
										frame: false,
										skipTaskbar: true,
										thickFrame: false 
									})
					//console.log("window created");				
									// load the new image into it									
									viewerinfo.url=image_url;

									// setup handler for when window is ready to show
									viewerinfo.window.once('ready-to-show', 	 					
											function () 
											{   
												//console.log("window load completed, window="+this.c.oldwindow+" viewer="+this.c.viewerinfo+" url="+this.c.viewerinfo.url);
												self.windowlist.push(this.c);						
												//console.log("window load completed");
											}.bind({c: new self.worker(oldwindow,viewerinfo)}) 
									);

									// setup the window close handler
									viewerinfo.window.on('closed', 
											function () 
											{
												//console.log("window removed from list url="+this.c.viewerinfo.url);
												self.remove(self.ViewerList, this.c.viewerinfo);
											}.bind({c: new self.worker(oldwindow,viewerinfo)})
									);
									viewerinfo.window.webContents.on('crashed', 
											function (event, killed) 
											{
												//console.log("window crashed");	
												;											
											}.bind({c: new self.worker(oldwindow,viewerinfo)})
									);

									
									// save the position info in the viewer
									viewerinfo.config.x = new_x;
									viewerinfo.config.y = new_y;
									self.loading=true;
									viewerinfo.loading=true;
									viewerinfo.show=Date.now();
									//console.log("window loading url now="+image_url);
									viewerinfo.window.loadURL(image_url);
								} catch (e) {
									//console.log("oops window closed on move=" + e)
									self.remove(self.ViewerList, viewerinfo)
								}
							},

							// get the html for showing the image
							getImageHTML : function (url) {
								// make sure we support both web and local file resources
								let filePrefix = url.toLowerCase().startsWith("http") ? "" : "file://";
								// html
								//return "<html><body><img src=\""+filePrefix+replaceAll(url," ","%20")+"\"></body></html>";
								return filePrefix + url;
							},

							cancel : function (Viewer) {
								console.log("in close")
								let list = self.ViewerList
									for (let v of list) {
										//console.log("window " + i)
										if (Viewer == null ||
											(Viewer != null &&
												(
													(typeof v.Viewer != 'undefined')
													&& v.Viewer.Name == Viewer.Name))) {
											// if the viewer needs updating
											if (v.window != null) {
												//console.log("closing window=" + i)
												v.window.hide();
												v.window.close();												
											} else {
												//console.log('force remove window=' + i);												
											}
											self.remove(self.ViewerList, v)
											break;
										}
									}
							},
		
							// timer event handler
							// get the next image for each viewer
							updateImg : function () {
								// check if busy and set if false. (test and set operation)
								//console.log("in updateImg");
								if ((self.busy == false) && ( self.busy = true )) {	
									// copy list of viewers
									let s = self.ViewerList.slice();
									//if (self.focus != 'sleep') 
									//{
										// now
										let now = Date.now();
										let i=0;
										// loop thru the list of viewers
										for (let viewer of s) {
											//console.log("updateimg checking next image time");
											//console.log("last update >0="+(viewer.lastUpdate>0)+" refreshinterval="+viewer.refreshIntervalSeconds+" loading="+(self.loading));
											let lastUpdate=viewer.lastUpdate + (viewer.refreshIntervalSeconds * 1000)
//console.log("now="+now+" lastupdate="+lastUpdate+" test="+(now > lastUpdate)+" full test="+((viewer.lastUpdate>0) && (now > lastUpdate) && (self.loading==false)))

											// if the viewer needs updating
											if ( (viewer.lastUpdate>0) && (now > lastUpdate) && (self.loading==false)) {
												// need to update self window
												// get the next image
												//console.log("updateimg calling viewer next")

												viewer.lastUpdate=-1;
												let pic = viewer.Viewer.next(viewer, function (viewerinfo) {
														//console.log("viewer last update reset");	
														// if viewer waiting for content									
														if(viewerinfo.lastUpdate==-1){								
															//console.log("viewer "+viewerinfo.Viewer.Name+" last update reset");		
															viewerinfo.lastUpdate=1;
														}
													}
												);
												// and we have a picture, watch out for race
												if (pic != null) {
													//console.log("have image to load="+pic);
													// and load the index.html of the app.
													// var html = getImageHTML(pic);
													//console.log("image html="+html);
													// load the next image in the new position
													self.moveWindow(pic, viewer);
													// set the last updated time, will get corrected when image actualy loads
													viewer.lastUpdate = now; 
												} 
											} // end if
										} // end for					
									/*} else 
											{
										// loop thru the list of viewers
										for (let v of s) 
										{
											if (v.window != null)
												v.window.hide();
										}
									} */
									self.busy = false;
								}	else {
									//console.log("update img was busy already");
								}
							}, // end function

							// handle all the windows with LoadURL completed
							handleLoadComplete:function (){				
									//console.log(" this == self="+(this===self));
									// get the active loaded window list
									let s = self.windowlist;
									// clear the current list
									self.windowlist=[];
									// loop thru the list, if any
									while(s.length>0) {		
											// use the 1st entry in the array
											// note splice returns an array, even if only 1 element
											let c = s.splice(0,1)[0];
											//console.log("process window loaded event");
											self.window_loaded(c);
									}  // end of while loop
								self.updateImg();
							},

							startViewer : function (Viewer) {
								//console.log("starting a new viewer="+Viewer.Name);
								self.startup("", Viewer)
							},

							// start a viewer
							startup: function (location, delay) {
								console.log("in startup for view="+delay.Name);
								// if we have a url
								if (location != null) {
									let refreshdelay = delay
										if (typeof delay == 'object') {
											refreshdelay = delay.ImageRefreshRate
										}
										// get the list of images
										let viewerinfo = {
											url: location,
											window: null,
											images: {
												found: []
											},
											loading:false,
											index: -1,
											refreshIntervalSeconds: refreshdelay,
											lastUpdate: 1
										};
									// clone viewerinfo from the local object
									console.log("cloning config info");
									viewerinfo = JSON.parse(JSON.stringify(viewerinfo));

									if (typeof delay == 'object') {
										// clone view from scheduler
										let next = delay.next;
											// functions are not cloned
										viewerinfo.Viewer = JSON.parse(JSON.stringify(delay));
										viewerinfo.Viewer.next = function (x, y) {
											return self.Next(x, y);
										};
									}

									// figure out where the window should be, and how big.
									if (self.SCREEN_W < 0) {

										self.SCREEN_W = self.defaults.ViewerWidth;
										self.SCREEN_H = self.defaults.ViewerHeight;
									}
									let dx = self.defaults.ViewerWidth;
									let dy = self.defaults.ViewerHeight;
									let x = (self.random(0, self.SCREEN_W - dx) % (self.SCREEN_W - dx * 2)) + dx;
									let y = (self.random(self.SCREEN_H - dy, self.SCREEN_H) % (self.SCREEN_H - dy * 2)) + dy;
									let wconfig = {
										width: dx,
										height: dy,
										x: x,
										y: y
									}

									viewerinfo.config = JSON.parse(JSON.stringify(wconfig));
										// create the window
										viewerinfo.window = new BrowserWindow({
											width: dx,
											height: dy,
											x: x,
											y: y,
											alwaysOnTop: true,
											show: false,
											transparent: true,
											dx: 0,
											dy: 0,
											frame: false,
											skipTaskbar: true,
											//webPreferences:{devTools:true}
										})
										self.ViewerList.push(viewerinfo);
	
								}
								// cycle minimum = 5 seconds
								// only do self once
								if (self.timeractve==null) {
									console.log("setup timer handler");
									self.registerRefreshInterval(self.handleLoadComplete, self.refresh_interval * 5000);
									//timeractve = true
								}
							},

							escapeRegExp:function(str) {
								return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
							},

							registerRefreshInterval : function (callback, interval) {
								if (typeof interval !== 'undefined') {
									console.log("calling set interval");
									self.timeractive=setInterval(function(){callback()}.bind(self),interval);
								}
							},
							random:function(min, max) {
								return Math.floor(Math.random() * (max - min + 1)) + min;
							},
							rand:function() {
								return self.random(0, 32767);
							},					

		filelist_callback: function (viewerinfo, callback) {
			 //console.log("in file list callback for viewer=" + viewerinfo.Viewer.Name);

			// copy items list
			let items=viewerinfo.Viewer.items.slice();
			// loop thru all the file items			
			items.forEach(
				function (ImageItem) {
					// if the handlers haven't been loaded yet
					if(self.modules[ImageItem.Source.Type.Type]==null)
					{
						// load them
						self.modules[ImageItem.Source.Type.Type]=require(path.resolve(__dirname, 'image'+ImageItem.Source.Type.Type+'.js'));
						self.resolvers[self.modules[ImageItem.Source.Type.Type].getPrefix()]=self.modules[ImageItem.Source.Type.Type];
					}
					// if the handler for this source type has been loaded
				  if(self.modules[ImageItem.Source.Type.Type]!=null)
					{
							// call it to get the file list
							//console.log("calling handler for type="+ImageItem.Source.Type.Type);

							self.modules[ImageItem.Source.Type.Type].listImageFiles(ImageItem,viewerinfo, callback)
					}							
			});
			// console.log("done in file list callback for viewer=" + viewerinfo.Viewer.Name);
		},

		Next: function (viewerinfo, callback) {
			let imageUrl = null;

			if (viewerinfo != null) {
				// if the next pic would be beyond the end of list
				if (viewerinfo.index == -1 || (viewerinfo.images.found.length > 0 && viewerinfo.index >= viewerinfo.images.found.length)) {
					// reset the index
					viewerinfo.index = 0;
					// clear the list of images
					// console.log("clearing image list for viewer="+viewerinfo.Viewer.Name);
					viewerinfo.images.found = []
					// watch out for updated list of images
					// console.log("getting images for viewer="+viewerinfo.Viewer.Name);					
					self.filelist_callback(viewerinfo, function(){ 
						callback(viewerinfo)
					});
					// console.log("returned from get images for viewer="+viewerinfo.Viewer.Name);
				}
				// send back the next image
				//console.log("image count="+viewerinfo.images.found.length+" and index="+viewerinfo.index)

				if (viewerinfo.images.found.length > 0 && viewerinfo.index>=0 ) {
					// if the next image was loaded from the complex service
					if (typeof viewerinfo.images.loaded_image_info != 'undefined') {
						imageUrl = viewerinfo.images.loaded_image_info
						delete viewerinfo.images['loaded_image_info']
					} else {
						// make sure to increment the index for the next file later
						let file = viewerinfo.images.found[viewerinfo.index];
						//console.log("=====>waiting="+self.waiting)
						if(self.waiting ==false){
							//console.log("Next has file="+file);
							if(file.includes('://'))
							{
								if(!file.startsWith("http") && !file.startsWith("file"))
								{
									let f= file.substring(0,file.indexOf('//')+2)
									//console.log("Next resolving image name="+file+ "for viewer="+viewerinfo.Viewer.Name+" with prefix="+f);
									if(self.resolvers[f]!=null)
									{
										if(self.waiting == false){
											//console.log("Next, needs to be resolved, file="+file)
											self.waiting=true;
											self.resolvers[f].resolve(file, 
												function (err,resolvedFile)
												{
													if(err==null)
													{
														// save the resolved filename
														this.vinfo.images.found[this.vinfo.index]=resolvedFile;
														//console.log("resolver for " + this.vinfo.Viewer.Name +" returned "+ resolvedFile);
													}
													else
													{
														//console.log("resolver for " + this.vinfo.Viewer.Name + " reported error="+err)
														;
													}
													// tell the viewer next time around, that the file is usable
													self.waiting=false;
													callback(this.vinfo);
													//console.log("=====>callback waiting="+self.waiting)
												}.bind({vinfo: viewerinfo})
											)
										}
									}
									else{
										//console.log("Next for viewer="+viewerinfo.Viewer.Name + " returning returning filename="+file);
										imageUrl = file
										viewerinfo.index++;
									}
								}
								else {
									//console.log("Next for viewer="+viewerinfo.Viewer.Name + " returning http resolved filename="+file);
									imageUrl = file
									viewerinfo.index++;
								}
							} 
							else {
								//console.log("unexpected file type:"+file);
							}
						}
					}
				}
			}
			return imageUrl;
		},
});

