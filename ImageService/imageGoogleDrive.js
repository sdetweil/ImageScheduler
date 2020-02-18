const path=require('path');
var Prefix="gdrive://";
var drive=null;
var waiting=false;
var common= require(__dirname+"/common.js");
var url_prefix="https://drive.google.com/uc?id="
var url_suffix="";
let debug=false;
//var redirectUrl="http://detweiler.dyndns.org:3000/oauth2callback"; //"https://developers.google.com/oauthplayground";
const {OAuth2Client} = require("google-auth-library");
var ObjectId = require('mongodb').ObjectId;
const moment =require('moment');
var authcode=0;
//const http = require('http');
//const url = require('url');
const opn = require('open');

const express = require('express');

var oauth2Client=null;

var {google} = require("googleapis");
//const {gal} = require("google-auth-library");
const Auth =google.auth;
var https = require("https");
//const refresh_url = "www.googleapis.com/oauth2/v4/token";
var querystring = require("querystring");
const SCOPES = "https://www.googleapis.com/auth/drive";

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
async function getNewToken(oauth2Clientx, Authinfo) {
	return new Promise((resolve,reject) =>{ 
	if( oauth2Clientx == null && Authinfo != null){
		oauth2Clientx = new OAuth2Client(
      Authinfo.Userid,
      Authinfo.Password,
      Authinfo.OAuthRedirectUrl )
		oauth2Clientx.credentials.refresh_token = Authinfo.OAuthid;
	}
	var authUrl = oauth2Clientx.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES
	});
	//let body = "{}";

if(debug) console.log("authc="+querystring.stringify(oauth2Clientx)+"\n===url="+authUrl);
	
 /*const post_body1 = querystring.stringify({
	"redirect_uri": oauth2Clientx.redirectUri,
	"refresh_token":oauth2Clientx.credentials.refresh_token,
	"client_id":oauth2Clientx._clientId,
	"client_secret":oauth2Clientx._clientSecret,
	"grant_type":"refresh_token"
	}) */

	const post_body = querystring.stringify({
		"grant_type":"refresh_token",
		"client_id":oauth2Clientx._clientId,
		"client_secret":oauth2Clientx._clientSecret,
		"refresh_token":oauth2Clientx.credentials.refresh_token,
		"scope": SCOPES
	});
if(debug) console.log("done="+post_body);
	let refresh_request = {
		hostname : "www.googleapis.com",
		path:"/oauth2/v4/token",
		body: post_body,
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length": Buffer.byteLength(post_body)
		}
	};
	let access_code="";
	// Set up the request
	var post_req = https.request(refresh_request, function(res) {
		res.setEncoding("utf8");
		res.on("data", function (chunk) {
		if(debug) console.log("Response: " + chunk);
			access_code+=chunk;
		});
		res.on("error",function(){
		if(debug) console.log("error="+err);
		});
		res.on("end",function(err){
			if(err==null)
			{
				var error = null;
				if(access_code.length>0){
					var ac=JSON.parse(access_code)
					if(ac.access_token!=null)
					{
						oauth2Clientx.credentials.access_token= ac.access_token;
					if(debug) console.log("access token info="+ac.access_token);
						resolve(oauth2Clientx)
					}
					else{
					if(debug) console.log("refresh error="+ac.error_description);
						reject(ac);
					}				
				}
			}
			else{
			if(debug) console.log("get token end, error="+err);
				reject(err);
			}
		});
	});
	// post the data
	post_req.write(post_body);
	post_req.end();
	})
}

/**
 *
 * raw google drive access method.
 */

async function listFiles(auth,parents,type,nextPageToken,Files) {
if(debug) console.log("auth="+JSON.stringify(auth));
 // return new Promise((resolve,reject) =>{ 
    var extra="";
    switch(type){
    case 0:  // files
      extra="mimeType contains 'image/'";
      break;
    case 1:  // folders
      extra="mimeType = 'application/vnd.google-apps.folder'";
      break;
    case 2:  // both
      extra="(mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder' ) ";
      break;
    case 3:  // resolving names
      extra="("+parents +") and (mimeType = 'application/vnd.google-apps.folder' ) ";
      break;
    }
    var q="";

    if(type !==3 && parents!=null){
      q+="parents in '"+parents+"' and ";
    }
    q+= extra;
   if(debug) console.log("query="+q);
    var px = {auth:auth,pageToken:nextPageToken, pagesize:100,fields:"nextPageToken, files(id, name,parents,mimeType)",q:q};
		try {
			let response= await drive.files.list(px) //, (err, response) => {
			nextPageToken=response.nextPageToken;
		if(debug) console.log("there were "+response.data.files.length+" file entries returned");
			if (response.data.files.length> 0)
			{
				Files=Files.concat(response.data.files);
				if(nextPageToken!=null)
				{
					try {
						return await listFiles(auth,parents,type,nextPageToken,Files)//.then(({e,f,Token})=> {
					}
					catch(error){
						throw(error);
					}
				}
				else
				{
				if(debug) console.log("no more files, return to caller="+auth.access_token);
					return({files:Files,token:null})
				}
			}
			else
			{
			if(debug) console.log("no files, return to caller="+auth.access_token);
				return({files:Files,token:nextPageToken})
			}
		}
		catch(err) {
		if(debug) console.log("The API returned an error: " + err);
		if(debug) console.log("error="+JSON.stringify(err));
			if( err.message == 'unauthorized_client' || 
				 (err.errors != undefined && err.errors[0].message.includes("Invalid Credentials"))){
				//auth.credentials.refresh_token="1/4WQ7AHQPnEDP2pgdZXePKf9YhdQHVg9hl5f9_CtlfXk";
				//1//04i0vilRkDDWWCgYIARAAGAQSNwF-L9IrA7_SWuHT_rM8lF-MM0vtsgarifolozeQDg1XoZz5UZ3vYhJkbq2rUq1JTp3Vu0TVI7E
				try {
						let newauth=await getNewToken(auth,null)
						oauth2Client=newauth;
						return await listFiles(newauth,parents,type,nextPageToken,Files)
				}
				catch(err){
					throw(err)
				}
			}
			else {
				throw(err)
			}
		}
  //})
}
function createClient(Authinfo) {
  return new Promise((resolve, reject) => {
    // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
    // which should be downloaded from the Google Developers Console.
    let oAuth2Client = new OAuth2Client(
      Authinfo.Userid,
      Authinfo.Password,
      Authinfo.OAuthRedirectUrl
    );
 
    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
			prompt:'consent'
    });
 
    // Open an http server to accept the oauth callback. In this simple example, the
    // only request to our webserver is to /oauth2callback?code=<code>
		const app = express();
		app.get('/oauth2callback', async (req, res) => {
			authcode = req.query.code;
			oAuth2Client.getToken(authcode,(err, tokens) => {
				if(err==null){
					oAuth2Client.credentials = tokens;
					res.send('Authentication successful! Please return to the console.');
					server.close();
					resolve(oAuth2Client);
				}
				else {
					console.error('Error getting oAuth tokens:');
					reject(err);
				}					
			})						
		});
		const server = app.listen(3000, () => {
			// open the browser to the authorize url to start the workflow
		if(debug) console.log("opening browser")
			opn(authorizeUrl, {wait: true});
		});
  });
}


function worker(parm)
{
	this.viewerinfo=parm;
}


// used to list the files to display NOW
module.exports.listImageFiles = async function (ImageItem, viewerinfo, callback) {
if(debug) console.log("in handler for google drive");
  //return new Promise((resolve,reject) =>{
    // if the file path has a wildcard, OR does NOT contain a . (just folders)
    if (ImageItem.Image.PathFromSource.indexOf("*") >= 0 || !ImageItem.Image.PathFromSource.includes("."))
    {
      // construct the  full path to files
      var dpath = ImageItem.Source.Root + (ImageItem.Image.PathFromSource.startsWith("/")?"":"/") + ImageItem.Image.PathFromSource;
      // get the extension of the files (jpg, gif, ...)
      var ext = dpath.substring(dpath.lastIndexOf("/")+1);
      // get the just the target folder for dropbox or google drive
      dpath = dpath.substring(0, dpath.lastIndexOf("/"));
      if (drive == null)
      {
        try {
					drive =  google.drive("v3");
        } 
        catch (error)
        {
					if(debug) console.log("drive api setup error="+error)
					 throw(error);
        }
      }
     if(debug) console.log("auth info="+JSON.stringify(ImageItem.Source.Authinfo));
			
			oauth2Client= await setupclient(ImageItem.Source.Authinfo);
			
      let filelist=[];
      // do we want JUST folder?
      var justFiles=3;
      while(dpath.startsWith("//"))
      {dpath=dpath.substring(1);}
      var parts=dpath.split("/");
      var folder_names="";
      var path_entries=[];
      for(let pathpart of parts)
      {
        if(pathpart!="" && !pathpart.includes("*"))
        {
          folder_names+=" or ( name = '"+pathpart+"')";
         if(debug) console.log("path_entries adding="+pathpart);
          path_entries.push({name:pathpart,id:"",parent:""});
        }
      }
      if(path_entries.length==0)
      {folder_names="parents='root'";}
      else
      {folder_names=folder_names.substring(4);}
      // get the list of files that matter
			try {
				let x=await listFiles(oauth2Client,folder_names,3,null,filelist)//.then( 
			if(debug) console.log("back from get path name ids, count="+x.files.length);
				// assume the root
				var parents="root";
				if(path_entries.length>0)
				{
					// have the list of mapped folders to ids and parents
					var pp= updatePathWithIDs(path_entries,x.files);
					parents=pp[pp.length-1].name;
					if(parents=="")
					{parents="root";}
				}
			if(debug) console.log("out dpath="+parents);
				filelist=[];
				var justFiles=2;  // just files
				// get the list of files that matter
				try {
					let x= await listFiles(oauth2Client,parents,justFiles,null,filelist)// .then(
				if(debug) console.log("have "+x.files.length+" files available");
					for (let file of x.files)
					{
					if(debug) console.log("processing file="+file.name+" id="+file.id+" file info="+JSON.stringify(file));
						if (file["mimeType"].includes("image"))
						{
						if(debug) console.log("file="+Prefix + file.id);
							viewerinfo.images.found.push(Prefix + file.id)
							//if(debug) console.log("Drive " + file)
						}
					}
					// if the access token has changed                 
					if(x.token != undefined && x.token!==ImageItem.Source.Authinfo.OAuthid && 0==1)
					{
					if(debug) console.log("end of file list new_token="+x.token+" old token="+ImageItem.Source.Authinfo.OAuthid);										
						// save it in the running item for next cycle
						oauth2Client.credentials.refresh_token=oauth2Client.credentials.access_token=ImageItem.Source.Authinfo.OAuthid=x.token;
					if(debug) console.log("updating database for datasource id="+ImageItem.Source._id);
						try {
							let result=await common.getdb().collection("DataSources").update({_id: ObjectId(ImageItem.Source._id) },ImageItem.Source)
						if(debug) console.log("doc updated")
						}
						catch(error)
						{
						if(debug) console.log("database updated failed err="+error);
							throw(error)
						}
					}
					// let the viewer know we have files
				if(debug) console.log("Drive  sending files back count=" + viewerinfo.images.found.length);
					return
				}
				catch(err)
				{
				if(debug) console.log("error getting file list="+err);
					return
				}
			} 
			catch(error){
				throw(error)
			}
    }
    else
    {
     if(debug) console.log("only one file entry="+Prefix + ImageItem.Source.Root + ImageItem.Image.PathFromSource);
      // no wildcard, so just one file entry
      // construct the url from the source and image entries
      //var url = ImageItem.Source.Root + ImageItem.Image.PathFromSource
      // just one file, add it to the list
      viewerinfo.images.found.push(Prefix + ImageItem.Source.Root + ImageItem.Image.PathFromSource);
      resolve()
    }
  //})
}

async function setupclient(Authinfo){
	
		let created=false;
		if( oauth2Client != null){
			if(oauth2Client.tokeninfo == undefined){
				oauth2Client.tokeninfo=await oauth2Client.getTokenInfo(oauth2Client.credentials.access_token);
			}
			//console.log(JSON.stringify(tokeninfo));
			// check to see if the access token has expired, 
			if(moment().isAfter(oauth2Client.tokeninfo.expiry_date))
				// force to get a new one 
				oauth2Client=null;
		}
		if(oauth2Client == null)  {
			if(Authinfo.OAuthid)
			{
				try {
					oauth2Client=await getNewToken(null, Authinfo);
					oauth2Client.tokeninfo=await oauth2Client.getTokenInfo(oauth2Client.credentials.access_token);
					created=true;				
					return oauth2Client;
				}
				catch(error){
					let message=error.error_description;
					if(message.includes("expired") || message.includes("revoked")){
					if(debug) console.log("setup create failed="+error)
					}
				}
			}
			if(!created)
			{
				newClient=await createClient(Authinfo)				
				newClient.tokeninfo=await newClient.getTokenInfo(newClient.credentials.access_token);
			if(debug) console.log("setup for auto update of tokens");
				if(ImageItem != null){							
					ImageItem.Source.Authinfo.OAuthid=newClient.credentials.refresh_token;
					try { 
					  let db = common.getdb()
						let id= ImageItem.Source._id
						delete  ImageItem.Source._id
						db.collection("DataSources").update({_id: ObjectId(id) },ImageItem.Source, (error,count,status) => {
							 if(debug) console.log(count + "objects were updated, status="+JSON.stringify(status))
						})
					}
					catch(error){
					if(debug) console.log("db update failed="+error);
					}
	
					newClient.on('tokens', async (tokens) => {
					if(debug) console.log("tokens updated");
						if (tokens.refresh_token) {
							// store the refresh_token in my database!
						if(debug) console.log(tokens.refresh_token);
							try {								
									ImageItem.Source.Authinfo.OAuthid=tokens.refresh_token;
									let db = common.getdb()
									let id= ImageItem.Source._id
									delete  ImageItem.Source._id									
									await db.collection("DataSources").update({_id: ObjectId(id) },ImageItem.Source)
								if(debug) console.log("doc updated")
								}						
								catch(error)
								{
								if(debug) console.log("database updated failed err="+error);
									throw(error)
								}
						}											
					})
					return newClient;
				}					
				//})
			}
		}
		else
			return oauth2Client
}

module.exports.resolve = async function (file,ImageItem) {
if(debug) console.log("file resolver returning "+url_prefix+file.substring(Prefix.length)+url_suffix+" for "+file);
    var id=file.substring(Prefix.length)
		try { 
				let oauth2Clienty= await setupclient(ImageItem.Source.Authinfo);
				let permissionData = await drive.permissions.list({auth:oauth2Clienty,fileId:id})
        var update=true;
        for(var p of permissionData.data.permissions){
          if(p.type=="anyone" && p.role=="reader"){
            update=false;
            break;
          }
        }
        if(update){
          var p2={kind: "drive#permission",type:"anyone",role:"reader"}
					try {
						let newPermissions = await drive.permissions.create({fileId:id,auth:oauth2Clienty,resource:p2})// ,(err,newPermissions)=>{
					if(debug) console.log("new permissions="+JSON.stringify(newPermissions));		
						oauth2Client=oauth2Clienty;
						return(url_prefix+id+url_suffix)
					}
					catch(err) {
					if(debug) console.log("create permission error="+err)
						throw("create permission error="+err)
					}
        }
        else{
         if(debug) console.log("google resolve returning "+url_prefix+id+url_suffix+" for file="+file)
          return(url_prefix+id+url_suffix)
        }
		}
		catch(err) {
		if(debug) console.log("file permissions error="+err.message);
		if(debug) console.log(err.stack)
			throw("file permissions error="+err)
		}
}
module.exports.getPrefix = function () {
	return Prefix;
}
let oauth2Client1={};
module.exports.listFiles = async function(Authinfo,dpath, FoldersOnly, callback){
	if (drive == null){
		drive =  google.drive("v3");
	}

  let oauth2Clientl= await setupclient(Authinfo);
	
	let filelist=[];
	// do we want JUST folder?
	var justFiles=3;
	while(dpath.startsWith("//"))
	{dpath=dpath.substring(1);}
	var parts=dpath.split("/");
	var folder_names="";
	var path_entries=[];
	for(let pathpart of parts)
	{
		if(pathpart!="" && !pathpart.includes("*"))
		{
			folder_names+=" or ( name = '"+pathpart+"')";
		if(debug) console.log("path_entries adding="+pathpart);
			path_entries.push({name:pathpart,id:"",parent:""});
		}
	}
	if(path_entries.length==0)
	{folder_names="parents='root'";}
	else
	{folder_names=folder_names.substring(4);}
	// get the list of files that matter
	try {
		let x= await listFiles(oauth2Clientl,folder_names,3,null,filelist)		
	if(debug) console.log("back from get path name ids, count="+x.files.length);
		// assume the root
		var parents="root";
		if(path_entries.length>0)
		{
			// have the list of mapped folders to ids and parents
			var pp= updatePathWithIDs(path_entries,x.files);
			parents=pp[pp.length-1].name;
			if(parents=="")
			{parents="root";}
		}
	if(debug) console.log("out dpath="+parents);
		filelist=[];
		// do we want JUST folder?
		justFiles=(FoldersOnly=="true"?1:2);
		// get the list of files that matter
		try {
			let x= await listFiles(oauth2Clientl,parents,justFiles,null,filelist)
		if(debug) console.log("have "+x.files.length+" files available");
			let Files=[]
			for (let file of x.files) {
			if(debug) console.log("processing file="+file.name+" id="+file.id+" file info="+JSON.stringify(file));
				// if we are requesting files and folders
				if(FoldersOnly=="true" && !file["mimeType"].includes("folder") )
				{continue;}
				var entry = {};
				entry.filetype=(file["mimeType"].includes("folder"))?"Folder":"File";
				entry.name=file.name;
				entry.id=file.id;
				Files.push(entry);
			}
			callback(null,Files,null);
		}
		catch(err) {
			callback(error,null,null);
		}
	}
	catch(error){
	if(debug) console.log("remote file list error="+error);
		callback(error,null,null);
	}
}
var updatePathWithIDs = function(path_array,name_array)
{

if(debug) console.log("in update parts");
	var Matched=path_array.length;
	// loop thru the split path backwards
	for(var i=path_array.length-1; i>=0; i--)
	{
		// loop thru the found folder names
		for(var n=0;n<name_array.length;n++)
		{
		if(debug) console.log("checking "+path_array[i].name +" = "+name_array[n].name);
      	// if the names match
			if(path_array[i].name==name_array[n].name)
			{
			if(debug) console.log("have name match");
				if(i<path_array.length-1)
				{
				if(debug) console.log(" not last path part entry");
          	// if the current found NAMEd element�s ID does NOT
					// match the childs (+1) PARENT

				if(debug) console.log(i+"=i comparing "+path_array[i+1].parent+" with "+name_array[n].id);
					if(name_array[n].id!=path_array[i+1].parent)
					{
					if(debug) console.log("parent ID does not match");
						// then not a NAME match, keep looking
						continue;
 					  }
					else
					{
					if(debug) console.log("parent ID does match");
						// replace the name with the id
						path_array[i].name=name_array[n].id;
						// set the actual parent to the named folder parent
						path_array[i].parent=name_array[n].parent;
						// done
						//
						Matched--;
						break;
					}
				}
				else
				{
				if(debug) console.log(" leaf most node i="+i);
					path_array[i].name=name_array[n].id;
					path_array[i].parent=name_array[n].parents[0];
				if(debug) console.log("new parent="+name_array[n].parents[0]);
					Matched--;
					break;
				}
			}
		}
	}
	return path_array;
//if(debug) console.log(Matched+"=Matched returning="+Matched==0?path_array:null);
//	 return Matched==0?path_array:null;
}

