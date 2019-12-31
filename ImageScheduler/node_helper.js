// api server
//const path = require('path');


var webserver = require('connect')();
var http = require('http');
var swaggerTools = require('swagger-tools');
var jsyaml = require('js-yaml');
var fsc = require('fs');
var dgram = require('dgram');



// database server


var NodeHelper = require("node_helper");
var MongoClient = require('mongodb').MongoClient;
var e2c = require('electron-to-chromium');
const path = require('path');
// var file=require('file');
var MongoWatch = require('mongo-watch')
var common = null;
var vdb = null;
var ImageService=null;

var dbData={};
dbData.ActiveViewers=[]
dbData.ActiveDataSources=[]
dbData.Images=[]
dbData.Tags=[]
dbData.valid=false;

module.exports = NodeHelper.create({
config: null,
init: function(){
		console.log("scheduler helper in init");
},

start: function(){
		console.log("scheduler helper in start");
		self=this;
},
start_connections: function(config, callback){
  let self=this;
	// swagger server setup

	// swaggerRouter configuration
	console.log("dirname="+__dirname);
	let options = {
		swaggerUi: '/swagger.json',
		controllers: path.resolve(__dirname, 'config/controllers'),
		useStubs: false //  process.env.NODE_ENV === 'development' ? true: false
	};
	// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
	let spec = fsc.readFileSync(path.resolve(__dirname, 'config/api/swagger.yaml'), 'utf8');
	let swaggerDoc = jsyaml.safeLoad(spec);

	// Initialize the Swagger middleware
	swaggerTools.initializeMiddleware(swaggerDoc,
		function (middleware) {
		// Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
		webserver.use(middleware.swaggerMetadata());

		// Validate Swagger requests
		webserver.use(middleware.swaggerValidator());

		// Route validated requests to appropriate controller
		webserver.use(middleware.swaggerRouter(options));

		// Serve the Swagger documents and Swagger UI
		webserver.use(middleware.swaggerUi());

		// Start the server
		http.createServer(webserver).listen(this.config.serverPort,
			 () =>{
			 console.log('Your server is listening on port %d (http://localhost:%d)', self.config.serverPort, self.config.serverPort);
			 console.log('Swagger-ui is available on http://localhost:%d/docs', self.config.serverPort);
		});
	});

	// start the discovery server
	let HOST = '0.0.0.0';

	let response = new Buffer("DISCOVER_MIRRORSERVER_RESPONSE:" + config.serverPort);
	let request = "DISCOVER_MIRRORSERVER_REQUEST:";

	let server = dgram.createSocket('udp4');

	server.on('listening',
		() => {
		let address = server.address();
		console.log('UDP Server listening on ' + address.address + ":" + address.port);
	});

	server.on('message',
		(message, remote) => {
		  console.log(remote.address + ':' + remote.port + ' - ' + message);
			let content = message.toString();
			if (content.startsWith(request)) {
				let port = content.substring(request.length);
				let net = require('net');

				let client = new net.Socket();
				console.log("connecting");

				client.connect(port, remote.address,
					() => {
  					 console.log('Connected');
						client.write(response);
						 console.log("discovery response message sent");
						client.close = (data) => {
							let Self = this;
							 console.log('closing');
							if (data)
								this.write(data,
									() => {
									Self.destroy();
								});
							else
								this.destroy();
						}
						client.close();
				});
			}
	});

	server.bind(config.serverPort + 1, HOST);


	// database change setup
	MongoClient.connect("mongodb://" +
						self.config.MongoDBLocation +
						":" +
						self.config.MongoDBPort +
						"/" +
						self.config.MongoDBName,

			{useNewUrlParser:true},

			(err, client) => {
				if(err==null)
				{
					vdb = client.db(self.config.MongoDBName);

					if(common==null)
					{
						common=require(path.resolve(__dirname, 'common.js'));
					}
					common.setdb(vdb)
					watcher = new MongoWatch({
							format: 'pretty', host:self.config.MongoDBLocation, port:self.config.MongoDBPort
						})

					watcher.watch('test.EventViewers',
						(event) => {
						// console.log("mongo EventViewer collection event=" + event.toString());
						if (event.operation == 'd') {
							// console.log("shutdown any viewer that is running but deleted");
							let running = this.viewerRunning(ImageService.viewerList, event.data._id);
							if (running)
								// stop it
								ImageService.cancel(running.Viewer);
						} else {
							this.closeopenviewers()
							this.checkforviewers()
						}
					});
					watcher.watch('test.DataSources',
						(event) => {
						// console.log("mongo DataSources collection event=" + event.toString());
						if (event.operation == 'd') {
							// loop thru the list of active viewers
							for (let viewerinfo of ImageService.viewerList) {
								// watch out for looping thru the list you are changing
								let list = viewerinfo.Viewer.items
									// loop thru the data items currently used, loop thru the copy
									for (let ImageItem of list) {
										// console.log("shutdown any viewer where the datasource was deleted");
										// if the source entry matches the one removed
										if (ImageItem.Source._id == event.data._id) {
											// remove this item from the list
											this.removeImageItemfromlist(viewerinfo.Viewer.items, ImageItem)
										}
									}
									// if there are no more things to view
									if (viewerinfo.Viewer.items.length == 0) {
										// console.log("shutdown viewer where the there are no data sources of images to show");
										// close the viewer
										ImageService.cancel(viewerinfo.Viewer);
									}
							}
						} else {
							this.checkforviewers()
						}
					});
					watcher.watch('test.Tags',
						 (event) => {
							// console.log("mongo Tags collection event=" + event.toString());
							if (event.operation == 'd') {
								// tag deleted
								// need to get all images that use that tag id,
								// loop thru all active viewers, and their imageitem list to see if there is a data source
								// that matches the datasource of the image of the removed tag
								// and if so, then shutdown that viewer..
							}
						}
					)


					watcher.watch('test.Images',
						 (event) => {
						// console.log("mongo Images collection event=" + event.toString());
						if (event.operation == 'd') {
							// loop thru the list of active viewers
							for (let viewerinfo of ImageService.viewerList) {
								// watch out for looping thru the list you are changing
								let list = viewerinfo.Viewer.items
									// loop thru the data items currently used, loop thru the copy
									for (let ImageItem of list) {
										// if the source entry matches the one removed
										if (ImageItem.Image._id == event.data._id) {
											// remove this item from the list
											this.removeImageItemfromlist(viewerinfo.Viewer.items, ImageItem)
										}
									}
									// if there are no more things to view
									if (viewerinfo.Viewer.items.length == 0) {
										// console.log("shutdown viewer where the there are no more images to show");
										// close the viewer
										ImageService.cancel(viewerinfo.Viewer);
									}
							}
						} else {
							this.checkforviewers()
						}
					});
				callback();
				}
			}
	);
},

	removeImageItemfromlist:function (list, item) {
		for (var i = 0; i < list.length; i++) {
			if (list[i].Source.id === item.Source.id &&
				list[i].Image.id === item.Image.id) {
				list.splice(i, 1);
				break;
			}
		}
	},
	closeopenviewers:function () {
		// remove any viewer that are open but the viewer has been marked inactive
		// loop thru the inactive viewers, if any
		vdb.collection('EventViewers').find({
			"Active": false
		}).each(
			(err, Viewer) => {
			if (Viewer != null) {
				var running = viewerRunning(ImageService.viewerList, Viewer.Name);
				if (running) {
					// stop it
					ImageService.cancel(Viewer);
				}
			}
		});
		// now remove any viewer that are open but the datasource has been marked inactive
		vdb.collection('DataSources').find({
			"Active": false
		}).toArray(
			(err, inactiveSources) => {
			if (inactiveSources.length > 0) {
				// have list of inactive sources, if any
				// loop thru runnign viewers
				ImageService.viewerList.forEach(
					(running) => {
					// loop thru any of its view items
					running.Viewer.items.forEach(
						(ImageItem) => {
						// now, for each view item, check if the source has gone inactive
						for (let Source of inactiveSources) {
							// console.log("shutdown any viewer where the datasource is now inactive");
							// if the source entry matches the one inactive
							if (ImageItem.Source._id == Source._id) {
								// stop the viewer
								ImageService.cancel(running.Viewer);
								break;
							}
						}
					});
				});
			}
		});
	},


getData: function()
{
	let self=this;
	if(dbData.valid==false)
	{
		console.log("loading db data");
		vdb.collection('DataSources').find({
			"Active": true
		}).toArray(
			function (err, activeSources) {
				dbData.ActiveDataSources=activeSources
				// loop thru the viewers, if any
				vdb.collection('EventViewers').find({
					"Active": true
				}).toArray(
					function (err, Viewers) {
						dbData.ActiveViewers=Viewers
						vdb.collection('Tags').find().toArray(
							function (error, tagentries) {
								dbData.Tags=tagentries
								vdb.collection('Images').find().toArray(
									function (err, images) {
										dbData.Images=images;
										dbData.valid=true;
										console.log("loaded db data");
										self.sendSocketNotification("db data",JSON.stringify(dbData));
									}
								)
							}
						)
					}
				)
			}
		)
	}
	return dbData;
},


stop: function(){
		console.log("scheduler helper in start");

},

socketNotificationReceived: function(notification, payload){
		console.log("scheduler helper in socketNotificationReceived");
		console.log("notification="+notification);
		console.log("payload="+JSON.stringify(payload));
		switch(notification)
		{
			case 'sched_init':
				{
					console.log("sched_init received in helper");
					this.config=payload;
					this.start_connections(this.config, function(){
						self.getData();
						self.sendSocketNotification(notification+" completed",null);
						}
					);
				}
				break;
			case "refreshData":
				this.getData();
				break;
			default:
				break;
		}
}

});

