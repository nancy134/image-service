exports.notAuthorized = function(){
    ret = {
        statusCode: 400,
        message: "You are not authorized to perform this operation"
    };
    return ret;
}

exports.getPageParams = function(req){
    var page = req.query.page || 1;
    var limit = req.query.perPage || 20;
    var offset = (parseInt(page)-1)*parseInt(limit);
    var pageParams = {
        page: page,
        limit: limit,
        offset: offset
    };
    return pageParams;
}
