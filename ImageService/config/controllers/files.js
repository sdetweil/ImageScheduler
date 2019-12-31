'use strict';

var url = require('url');
var common= require(__dirname+"/../../common.js");
var dbx=null;
var ObjectId = require('mongodb').ObjectId;
var badid  = 	{   "error" : "id value incorrect" };
var errornotexist  = 	{   "error" : "document does not exist" };
var updatefailed = 	{   "error" : "update failed" };
var errorexists  = 	{   "error" : "document already exists" };
var insertfailed = 	{   "error" : "insert failed" };

var services={};
module.exports.get = function filesGET (req, res, next) {
	/**
	* parameters expected in the args:
	* id (String)
	**/
	var examples = {};
	examples['application/json'] = [ {
		"Type" : "aeiou",
		"Active" : true,
		"Description" : "aeiou",
		"Authinfo" : {
			"Userid" : "aeiou",
			"OAuthid" : "aeiou",
			"Password" : "aeiou"
		},
		"id" : "aeiou",
		"Name" : "aeiou"
		} ];
		res.statusCode = 400;
		if(Object.keys(examples).length > 0) 
		{
			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Access-Control-Allow-Origin', '*');			
			var parms=common.params(req);
console.log("request parms="+JSON.stringify(parms));

			if (('SourceId' in parms) && (parms.SourceId.length!=0))
			{
				console.log("file request source id="+ parms.SourceId);
				if(parms.SourceId.length==12 || parms.SourceId.length==24)
				{
					res.setHeader('parm', parms.SourceId);
					common.getdb().collection('DataSources').findOne({_id: ObjectId(parms.SourceId) },
						function(err,result)
						{
						if(err==null){
							console.log(JSON.stringify(result));
							find_files(decodeURIComponent(parms.path),result.Type.Type,res, result, parms.FoldersOnly);
						}
						else{
							consolde.log("source not found="+parms.SourceId);
						}
					});
				}
				else {	
					res.end(JSON.stringify(badid || {}, null, 2));
                                }
			}
			else if (
							('SourceType' in parms)
					&&
							(!('SourceId' in parms) || (parms.SourceId.length==0)) 
							) 
			{
				console.log("file request source path="+decodeURIComponent(parms.path));
				var rc=find_files(decodeURIComponent(parms.path),parms.SourceType,res, null,parms.FoldersOnly);
			}
			else
			{
				res.statusCode = 406;
				res.end("unknown parm combination");
			}
		}
		else 
		{
			res.end();
		}
};

function find_files(path, type,res, source_info, foldersOnly)
{
		console.log("processing for file type="+type);
		switch(type)
		{
			case "Files":
				if(services.type==null){
  				    services.type=require(__dirname+"/../../image"+type+".js");
        }
				console.log("doing glob for path="+path);
				if(source_info!=null)
				{
					// if both the root and the path don't have a / separator, add one
					if(!source_info.Root.endsWith("/") && !path.startsWith("/") ){
						path="/"+path;
          }
					path=source_info.Root+path;
				}
				services.type.listFiles(path,foldersOnly,function(err,files){
						if(err==null){
							send_response(res,files, 200);
            }
						else {
							send_response(res,err, 406);
            }
				});
				
				break;
			case "Samba":
				break;
		  case "File":
			case "DropBox":
		case "GoogleDrive":
					console.log("doing "+type+" for path="+path);
					if(services[type]==null){							
				    services[type]=require(__dirname+"/../../image"+type+".js");
          }   
					var Authinfo=null;
					if(source_info!=null)
					{
						console.log("source="+JSON.stringify(source_info));
						Authinfo=source_info.Authinfo;
						// if both the root and the path don't have a / separator, add one
						if(!source_info.Root.endsWith("/") && !path.startsWith("/") ) {
						    path="/"+path;						
            }  
						path=source_info.Root+path;
					}

					services[type].listFiles(Authinfo,path,foldersOnly,function(err,files,access_code){
						if(err==null)						
						{
							send_response(res,files, 200);
							if(access_code!==null && Authinfo!==undefined && Authinfo!==null && Authinfo.OAuthid!==access_code)							{
								this.source_info.Authinfo.OAuthid=access_code;
								common.getdb().collection('DataSources').update({_id: ObjectId(this.source_info._id) },this.source_info, 
									function(err,result){
										if(!err){
												console.log("doc updated");                          
										}
									}
								);
							}							
            }
						else{
							send_response(res,err, 406);
            }
					}.bind({source_info})
				);								
				break;
		case "Onedrive":
				break;
			default:
				send_response(res,"unknown request type="+type, 406);
			//break;
		}
		console.log("done processing for file type="+type);
}

function send_response(res, items, code)
{
	res.statusCode = code;
	var str = JSON.stringify(items || {}, null, 2);
	res.end(str);
}
