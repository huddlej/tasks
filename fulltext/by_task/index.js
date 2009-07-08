function(doc) {
    if (doc.task) {
        var ret = new Document();
        ret.add(doc.task, {"field": "task", "store": "yes"});
        return ret;
    }
}