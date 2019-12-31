'use strict';

var url = require('url');
var common= require(__dirname+"/../../common");
var ObjectId = require('mongodb').ObjectId;
	var badid  = 	{   "error" : "id value incorrect" };
	var errornotexist  = 	{   "error" : "document does not exist" };
	var updatefailed = 	{   "error" : "update failed" };
	var errorexists  = 	{   "error" : "document already exists" };
	var insertfailed = 	{   "error" : "insert failed" };
module.exports.delete = function datasourcesDELETE (req, res, next) {
		/**
	* parameters expected in the args:
	* id (String)
	**/

	res.statusCode = 400;

		var parms=common.params(req)
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Access-Control-Allow-Origin', '*');		
		if ('id' in parms)	
		{
	if(parms.id.length==12 || parms.id.length==24)
	{
		common.getdb().collection('Images').findOne({_id: ObjectId(parms.id) },
		function(err,result)
					{
						if(result)
						{          
							common.getdb().collection('Images').remove({_id: ObjectId(parms.id) }, 
									function(err,result)
									{
										if(err)
										{
													res.statusCode = 406;
													res.end(err);
										}
										else	
										{
												console.log("doc removed")      
												res.statusCode = 200;
												res.end();                        
										}
									}
								);
						}
						else
						{	
							res.statusCode = 406;
							res.end(JSON.stringify(errornotexist, null, 2));
						}
					}
				);
	}
	else	
	res.end(JSON.stringify(badid || {}, null, 2));		
	}
		else
			res.end(JSON.stringify(parms || {}, null, 2));
};

module.exports.get = function datasourcesGET (req, res, next) {
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
			var parms=common.params(req)
			if ('id' in parms)	
	{
	if(parms.id.length==12 || parms.id.length==24)
	{
				res.setHeader('parm', parms.id);
		common.getdb().collection('Images').find({_id: ObjectId(parms.id)}).toArray(function(err,items)
		{
						res.statusCode = 200;
			res.end(JSON.stringify(items || {}, null, 2));
		});
	}
	else	
	res.end(JSON.stringify(badid || {}, null, 2));
			}
			else
			{
				common.getdb().collection('Images').find().toArray(function(err,items)
				{
						res.statusCode = 200;
						res.end(JSON.stringify(items || {}, null, 2));
				});
			}
		}
		else {
			res.end();
		}
};

module.exports.post = function datasourcesPOST (req, res, next) {
	/**
	* parameters expected in the args:
	* body (DataSource)
	**/
	var examples = {};
	examples['application/json'] = {   "id" : "aeiou" };

	res.statusCode = 400;
	if(Object.keys(examples).length > 0) 
	{
		var parms=common.params(req)
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Access-Control-Allow-Origin', '*');		
		if ('body' in req)	
		{
				//console.log("found body")
								//res.setHeader('body', parms.body);
		var body=JSON.parse(JSON.stringify(req.body));
//console.log("found body="+JSON.stringify(req.body));

		common.getdb().collection('Images').findOne({"Name": body.Name },
		function(err,result)
					{
						if(result)
						{
							res.statusCode = 406;
							res.end(JSON.stringify(errorexists, null, 2));
						}
						else
						{		
							// don't allow injected id values
							if(body.hasOwnProperty('_id'))	
							{   
									//console.log("found id input")
									// remove it	
									delete body._id;
							}
							// don't allow injected id values
							if(body.hasOwnProperty('id') )	
							{   
									//console.log("found id input")
									// remove it	
									delete body.id;
							}               
//console.log("inserting body="+JSON.stringify(body));								
							common.getdb().collection('Images').insertOne(body, 
									function(err,result)
									{
										if(err)
										{
													res.statusCode = 406;
													res.end(err);
										}
										else	
										{
												//console.log("doc did not already exist")                                               
												common.getdb().collection('Images').findOne({"Name": body.Name }, 
														function(err,result)
														{
																if(result)
																{
																		//console.log("new doc inserted")
																		var resp={"id":result._id.toString()};
																		res.statusCode = 201;
																		res.end(JSON.stringify(resp, null, 2));
																}
																else
																{
																		res.statusCode = 406;
																		res.end(JSON.stringify(insertfailed, null, 2));
																}
														}
												); 
										}
									}
								);
						}
					}
				);		
	}
		else
			res.end(JSON.stringify(parms || {}, null, 2));
	}
	else 
	{
		res.end();
	}
};

module.exports.put = function datasourcesPUT (req, res, next) {
	/**
	* parameters expected in the args:
	* id (String)
	* body (DataSource)
	**/
	

	res.statusCode = 400;

		var parms=common.params(req)
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Access-Control-Allow-Origin', '*');		
		if ('body' in req && 'id' in parms)	
		{
	if(parms.id.length==12 || parms.id.length==24)
	{
					console.log("found body")
		var body=req.body;
							// don't allow injected id values
							if('_id' in body )	
							{   
									console.log("found id input")
									// remove it	
									delete body._id;
							}
							// don't allow injected id values
							if('id' in body )	
							{   
									console.log("found id input")
									// remove it	
									delete body.id;
							}

		common.getdb().collection('Images').findOne({_id: parms.id },
		function(err,result)
					{
						if(result)
						{
							res.statusCode = 406;
							res.end(JSON.stringify(errornotexist, null, 2));
						}
						else
						{        
							common.getdb().collection('Images').update({_id: ObjectId(parms.id) },body, 
									function(err,result)
									{
										if(err)
										{
													res.statusCode = 406;
													res.end(err);
										}
										else	
										{
												console.log("doc updated")      
												res.statusCode = 200;
												res.end();                        
										}
									}
								);
						}
					}
				);
	}
	else	
	res.end(JSON.stringify(badid || {}, null, 2));	
	}
		else
			res.end(JSON.stringify(parms || {}, null, 2));
 };


