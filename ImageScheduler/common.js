var exports = module.exports = {};
var cdb=null;

exports.setdb = function(db)
{
	cdb=db;
	//console.log("set db= %o",db);
}
exports.getdb = function ()
{
//console.log("get db= %o",cdb);

	return cdb;
}
exports.params = function(req){
	let q=req.url.split('?'),result={};
	if(q.length>=2){
			q[1].split('&').forEach((item)=>{
					try {
						result[item.split('=')[0]]=item.split('=')[1];
					} catch (e) {
						result[item.split('=')[0]]='';
					}
			})
	}
	return result;
}