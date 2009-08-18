function(doc) {
    if (doc.task && doc.owner) {
        emit(doc.owner, doc);
    }
}