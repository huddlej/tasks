function(doc) {
    if (doc.task && doc.is_deleted) {
        emit(doc._id, doc);
    }
}