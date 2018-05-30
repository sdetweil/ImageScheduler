var Dropbox = require('dropbox');
var Prefix= 'dropbox://';
var dbx=null;
var waiting=false;
function worker(parm)
{
	this.viewerinfo=parm;		
}

module.exports.listImageFiles = function (ImageItem, viewerinfo, callback) {
					if (ImageItem.Image.PathFromSource.indexOf("*") >= 0) {
						// construct the  full path to files
						var dpath = ImageItem.Source.Root + (ImageItem.Image.PathFromSource.startsWith("/")?"":"/")+ ImageItem.Image.PathFromSource;
						// get the extension of the files (jpg, gif, ...)
						var ext = dpath.substring(dpath.lastIndexOf("/"));
						// get the just the target folder for dropbox
						dpath = dpath.substring(0, dpath.lastIndexOf("/"));
						if (dbx == null){								
							dbx = new Dropbox({
								accessToken: ImageItem.Source.Authinfo.OAuthid
							});							
						}
						dbx.filesListFolder({
							path: dpath
						})
						.then(
							function (response) {
								// console.log(response);
								for (let file of response.entries) {
									if (file['.tag'] === 'file') {
										var filename = file.name;
										
										if (ext === '/*' || filename.toLowerCase().endsWith(ext.toLowerCase().substring(ext.lastIndexOf('*')+1)))
											this.dbx_viewer.viewerinfo.images.found.push(Prefix + dpath + '/' + filename)
									}
									// console.log("DropBox " + file)
								}
								console.log("dropbox returning list="+response.entries.length);
								// let the viewer know we have files
								callback(this.dbx_viewer.viewerinfo);
							}.bind({dbx_viewer: new worker(viewerinfo)})
						)
						.catch (
							function (error) {
							 // console.log("Dropbox " + error);
						});			
					} else {
						// construct the url from the source and image entries
						// just one file, add it to the list
						viewerinfo.images.found.push(Prefix + ImageItem.Source.Root + ImageItem.Image.PathFromSource);
						callback(viewerinfo);
					}
}
module.exports.resolve = function (file, callback) {
				
					// need to load the file
					// the fire back
					var args = {}
					args.path = file.substring(Prefix.length)
					//  args.settings={}
					// %Y-%m-%dT%H:%M:%SZ
					if (waiting == false) {
						waiting = true;
	
						// args.settings.expires=dateFormat((new Date().getTime() + 60*60000),"isoUtcDateTime");
						dbx.sharingCreateSharedLinkWithSettings(args)
						.then(
							function (response) {
								console.log("new share url=" + response.url)
								waiting = false;
								callback(null,response.url + "&raw=1")
							}
						)
						.catch (
							function (error) {
							if (
							(error.response.body.error_summary.startsWith('shared_link_already_exists')) ||
							(error.response.body.error_summary.startsWith('settings_error/not_authorized'))) {
								dbx.sharingListSharedLinks(args)
								.then(
									function (response) {
										waiting = false;
										console.log("reshare url=" + response.links[0].url)
										callback(null,response.links[0].url + "&raw=1")
									}
								).catch(
									 function(error){
										 waiting = false;
										 console.log("reshare failed url=" + file)
										 callback("reshare failed url=" + file,null)
									 }
								)									
							} else {
								console.log("Dropbox download " + error);
								waiting = false;
								callback("Dropbox download " + error,null)
							}
						});
					} 				
}
module.exports.getPrefix = function () {
					return Prefix;
}

module.exports.listFiles = function(Authinfo,path,FoldersOnly, callback){
					
					if(dbx==null)
					{
						dbx= new Dropbox({ accessToken: Authinfo.OAuthid });
						console.log("have a dropbox handle")
					}
					if(path ==="/*")
						path="";
					if(path.includes("/.."))
					{
						var i = path.lastIndexOf("/..")
						i = path.lastIndexOf("/",i-1)
						path=path.substring(0,i)
					}
					else
					{		
						path=path.substring(0,path.lastIndexOf("/"))
					}	
					dbx.filesListFolder({path: path})
					.then(
						function(response) 
						{
							console.log(response);
							let files=[]
							for(let file of response.entries)
							{
								// if we are requesting files and folders
								if(FoldersOnly=="true" && file['.tag']!='folder' )
									continue
								var entry = {}
								entry.filetype=file['.tag'].replace('f','F');
								entry.name=file.name
								files.push(entry)
								console.log(file)
							}
							console.log("dropbox returning list="+files.length);
							callback(null,files,null)
					  }
					)
					.catch(
						function(error) 
						{
							console.log("dropbox returning error="+err);						
							callback(err,null)
						}
					);

}